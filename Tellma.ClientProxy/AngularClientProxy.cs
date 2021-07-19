﻿using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Tellma.Api;
using Tellma.Notifications;
using Tellma.Utilities.Common;
using Tellma.Utilities.Email;
using Tellma.Utilities.Sms;

namespace Tellma.ClientProxy
{
    /// <summary>
    /// An implementation of <see cref="IClientProxy"/> that interfaces with the Angular web client.
    /// </summary>
    public class AngularClientProxy : IClientProxy
    {
        private readonly IStringLocalizer _localizer;
        private readonly NotificationsQueue _notificationsQueue;
        private readonly IEmailSender _emailSender;
        private readonly IHttpContextAccessor _httpAccessor;
        private readonly LinkGenerator _linkGenerator;
        private readonly AngularClientOptions _options;
        private static readonly Random _rand = new();

        public AngularClientProxy(
            IStringLocalizer<Strings> localizer,
            NotificationsQueue notifications,
            IEmailSender emailSender,
            IOptions<AngularClientOptions> options,
            IHttpContextAccessor httpContextAccessor,
            LinkGenerator linkGenerator)
        {
            _localizer = localizer;
            _notificationsQueue = notifications;
            _emailSender = emailSender;
            _httpAccessor = httpContextAccessor;
            _linkGenerator = linkGenerator;
            _options = options.Value;
        }

        public bool EmailEnabled => _notificationsQueue.EmailEnabled;

        public bool SmsEnabled => _notificationsQueue.SmsEnabled;

        public async Task<string> TestEmailAddress(int tenantId, string emailAddress)
        {
            var subject = $"{ _localizer["Test"]} {_rand.Next()}";
            var email = new EmailToSend(emailAddress) { Subject = subject };

            var error = EmailValidation.Validate(email);
            if (!string.IsNullOrWhiteSpace(error))
            {
                throw new InvalidOperationException(error);
            }

            await _notificationsQueue.Enqueue(tenantId, emails: new List<EmailToSend> { email });
            return subject;
        }

        public async Task<string> TestPhoneNumber(int tenantId, string phoneNumber)
        {
            var msg = $"{ _localizer["Test"]} {_rand.Next(10000)}, {_localizer["AppFullName"]}";
            var sms = new SmsToSend(phoneNumber, msg);

            var error = SmsValidation.Validate(sms);
            if (!string.IsNullOrWhiteSpace(error))
            {
                throw new InvalidOperationException(error);
            }

            await _notificationsQueue.Enqueue(tenantId, smsMessages: new List<SmsToSend> { sms });
            return msg;
        }

        public async Task InviteConfirmedUsersToTenant(int tenantId, IEnumerable<ConfirmedEmailInvitation> infos)
        {
            var emails = new List<EmailToSend>();

            string companyUrl = CompanyUrl(tenantId);

            foreach (var info in infos)
            {
                // Use the recipient's preferred Language
                CultureInfo culture = string.IsNullOrWhiteSpace(info.PreferredLanguage) ?
                    CultureInfo.CurrentUICulture : new CultureInfo(info.PreferredLanguage);

                using var _ = new CultureScope(culture);

                // Prepare the email
                var email = MakeInvitationEmail(
                     emailOfRecipient: info.Email,
                     nameOfRecipient: info.Name,
                     nameOfInviter: info.InviterName,
                     validityInDays: 3,
                     callbackUrl: companyUrl);

                emails.Add(email);
            }

            await _notificationsQueue.Enqueue(tenantId, emails);
        }

        public async Task InviteUnconfirmedUsersToTenant(int tenantId, IEnumerable<UnconfirmedEmailInvitation> infos)
        {
            var emails = new List<EmailToSend>();

            string companyUrl = CompanyUrl(tenantId);

            foreach (var info in infos)
            {
                // Use the recipient's preferred Language
                CultureInfo culture = string.IsNullOrWhiteSpace(info.PreferredLanguage) ?
                    CultureInfo.CurrentUICulture : new CultureInfo(info.PreferredLanguage);

                using var _ = new CultureScope(culture);

                var callbackUrlBuilder = new UriBuilder(info.EmailConfirmationLink);
                callbackUrlBuilder.Query = $"{callbackUrlBuilder.Query}&returnUrl={Encode(companyUrl)}";
                string callbackUrl = callbackUrlBuilder.Uri.ToString();

                // Prepare the email
                var email = MakeInvitationEmail(
                     emailOfRecipient: info.Email,
                     nameOfRecipient: info.Name,
                     nameOfInviter: info.InviterName,
                     validityInDays: 3,
                     callbackUrl: callbackUrl);

                emails.Add(email);
            }

            // These emails contain secret tokens, and should not be persisted in the notifications queue.
            int skip = 0;
            int chunkSize = 100;
            while (true)
            {
                var chunk = emails.Skip(skip).Take(chunkSize);
                if (chunk.Any())
                {
                    await _emailSender.SendBulkAsync(chunk);
                    skip += chunkSize;
                }
                else
                {
                    break;
                }
            }
        }

        #region Email Making

        private EmailToSend MakeInboxNotificationEmail(
            string toEmail,
            string formattedSerial,
            string singularTitle,
            string pluralTitle,
            string senderName,
            int docCount,
            string comment,
            string linkUrl)
        {
            string subject;
            string preamble;
            string buttonLabel;
            if (docCount == 1)
            {
                subject = _localizer["Document0From1", formattedSerial, senderName];
                preamble = _localizer["User0SentYouDocument12", senderName, singularTitle, formattedSerial];
                buttonLabel = _localizer["GoTo0", formattedSerial];
            }
            else
            {
                subject = _localizer["Document0From1", $"{docCount} {pluralTitle}", senderName];
                preamble = _localizer["User0SendYou1DocumentsOfType2", senderName, docCount, pluralTitle];
                buttonLabel = _localizer["GoTo0", _localizer["Inbox"]];
            }

            var htmlContentBuilder = new StringBuilder($@"<p>
{Encode(preamble)}
</p>");
            // Sender comment
            if (!string.IsNullOrWhiteSpace(comment))
            {
                htmlContentBuilder.AppendLine($@"<p>
    ""{Encode(comment)}""
</p>");
            }

            // Button
            htmlContentBuilder.AppendLine($@"<div style=""text-align: center;padding: 1rem 0;"">
            <a href=""{Encode(linkUrl)}"" style=""{ButtonStyle}"">
                {Encode(buttonLabel)}
            </a>
        </div>");

            return new EmailToSend(toEmail)
            {
                Subject = subject,
                Body = MakeEmail(htmlContentBuilder.ToString(), includeBanner: false)
            };
        }

        private EmailToSend MakeInvitationEmail(string emailOfRecipient, string nameOfRecipient, string nameOfInviter, int validityInDays, string callbackUrl)
        {
            string greeting = _localizer["InvitationEmailGreeting0", nameOfRecipient];
            string appName = _localizer["AppName"];
            string body = _localizer["InvitationEmailBody012", nameOfInviter, appName, validityInDays];
            string buttonLabel = _localizer["InvitationEmailButtonLabel"];
            string conclusion = _localizer["InvitationEmailConclusion"];
            string signature = _localizer["InvitationEmailSignature0", appName];

            string mainHtmlContent = $@"
        <p style=""font-weight: bold;font-size: 120%;"">
            {Encode(greeting)}
        </p>
        <p>
            {Encode(body)}
        </p>
        <div style=""text-align: center;padding: 1rem 0;"">
            <a href=""{Encode(callbackUrl)}"" style=""{ButtonStyle}"">
                {Encode(buttonLabel)}
            </a>
        </div>
        <p>
            {Encode(conclusion)}
            <br>
            {Encode(signature)}
        </p>
";
            var emailBody = MakeEmail(mainHtmlContent, includeBanner: true);
            var emailSubject = _localizer["InvitationEmailSubject0", _localizer["AppName"]];

            return new EmailToSend(emailOfRecipient) { Body = emailBody, Subject = emailSubject };
        }


        //private async Task<(string subject, string body)> MakeInvitationEmailAsync(EmbeddedIdentityServerUser identityRecipient, string nameOfRecipient)
        //{
        //    // Use the recipient's preferred Language
        //    CultureInfo culture = new CultureInfo(_options.Localization?.DefaultUICulture ?? "en");
        //    using var _ = new CultureScope(culture);

        //    // Prepare the parameters
        //    string userId = identityRecipient.Id;
        //    string emailToken = await _userManager.GenerateEmailConfirmationTokenAsync(identityRecipient);
        //    string passwordToken = await _userManager.GeneratePasswordResetTokenAsync(identityRecipient);
        //    string nameOfInvitor = _localizer["AppName"];

        //    //string callbackUrl = _linkGenerator.GetUriByPage(
        //    //        httpContext: _contextAccessor.HttpContext ?? throw new InvalidOperationException("Unable to access the HttpContext to generate invitation links"),
        //    //        page: "/Account/ConfirmEmail");

        //    string callbackUrl = _urlHelper.Page(
        //            pageName: "/Account/ConfirmEmail",
        //            pageHandler: null,
        //            values: new { userId, code = emailToken, passwordCode = passwordToken, area = "Identity" },
        //            protocol: _scheme);

        //    // Prepare the email
        //    string emailSubject = _localizer["InvitationEmailSubject0", _localizer["AppName"]];
        //    string emailBody = _emailTemplates.MakeInvitationEmail(
        //         nameOfRecipient: nameOfRecipient,
        //         nameOfInvitor: nameOfInvitor,
        //         validityInDays: Constants.TokenExpiryInDays,
        //         userId: userId,
        //         callbackUrl: callbackUrl,
        //         culture: culture);

        //    return (emailSubject, emailBody);
        //}


        #region Helpers

        private const string BrandColor = "#343a40"; // Dark grey
        private const string BackgroundColor = "#f8f9fa"; // Light grey
        private const string HyperlinkColor = "#008784"; // Greenish
        private const string ButtonStyle = "padding: 12px 20px;text-decoration: none;color: white;background: #17a2b8;display: inline-block;"; // Teal

        private string MakeEmail(string mainHtmlContent, bool includeBanner)
        {
            var direction = CultureInfo.CurrentUICulture.TextInfo.IsRightToLeft ? "rtl" : "ltr";
            var fontFamily = "BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";

            var logoLink = ClientAppUri().WithTrailingSlash() + "assets/tellma.png";
            var copyRightNotice = _localizer["CopyrightNotice0", DateTime.Today.Year];
            var privacyLabel = _localizer["PrivacyPolicy"];
            var termsLabel = _localizer["TermsOfService"];
            var privacyLink = _linkGenerator.GetUriByPage(_httpAccessor.HttpContext, page: "Privacy");
            var termsLink = _linkGenerator.GetUriByPage(_httpAccessor.HttpContext, page: "TermsOfService");

            var brandBanner = includeBanner ? $@"<tr>
        <td style=""background: {BrandColor};padding: 1rem;text-align: center;"">
            <img height=""20px"" clicktracking=off src=""{logoLink}""></img>
        </td>
    </tr>" : "";

            return
            $@"<table style=""font-size:1rem;direction: {direction};padding: 0.5rem;background-color: {BackgroundColor};max-width: 900px;border: 1px solid lightgrey;font-family: {fontFamily};"">
    {brandBanner}
    <tr>
        <td style=""padding: 1rem 3rem;"">
            {mainHtmlContent}
        </td>
    </tr>
    <tr>
        <td style=""padding: 1rem 3rem;border-top: 1px solid lightgrey;font-size: 80%;text-align: center;"">
            <p>
                {Encode(copyRightNotice)}
            </p>
            <a style=""color: {HyperlinkColor};"" clicktracking=off href=""{privacyLink}"">{Encode(privacyLabel)}</a><span style=""margin-left: 0.5rem;margin-right: 0.5rem;"">|</span><a
                style=""color: {HyperlinkColor};"" clicktracking=off href=""{termsLink}"">{Encode(termsLabel)}</a>
        </td>
    </tr>
</table>
";
        }

        /// <summary>
        /// If a string value comes from user input or a localization file, it is important to encode
        /// it before inserting it into the HTML document, otherwise characters like © will cause trouble.
        /// </summary>
        private static string Encode(string value) => HtmlEncoder.Default.Encode(value);

        private string ClientAppUri()
        {
            string result = _options.WebClientUri;
            if (string.IsNullOrWhiteSpace(result))
            {
                // This is the embedded client
                var request = _httpAccessor.HttpContext.Request;
                result = $"https://{request.Host}/{request.PathBase}";
            }

            return result;
        }

        private string CompanyUrl(int tenantId)
        {
            var urlBuilder = new UriBuilder(ClientAppUri());
            urlBuilder.Path = $"{urlBuilder.Path.WithoutTrailingSlash()}/app/{tenantId}";
            string url = urlBuilder.Uri.ToString();

            return url;
        }

        #endregion

        #endregion
    }
}

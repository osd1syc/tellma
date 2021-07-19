﻿using Microsoft.Extensions.Localization;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Tellma.Api.ImportExport;
using Tellma.Model.Common;
using Tellma.Utilities.Common;

namespace Tellma.Api.Base
{
    public static class BaseUtilities
    {
        /// <summary>
        /// Takes an XLSX or a CSV stream and unpackages its content into a 2-D table of strings.
        /// </summary>
        /// <param name="stream">The contents of the XLSX or CSV file.</param>
        /// <param name="fileName">The name of the file to extract if available.</param>
        /// <param name="contentType">The mime type of the file to extract if available.</param>
        /// <param name="localizer">To localize error messages.</param>
        /// <returns>A 2-D grid of strings representing the contents of the XLSX or the CSV file.</returns>
        public static IEnumerable<string[]> ExtractStringsFromFile(Stream stream, string fileName, string contentType, IStringLocalizer localizer)
        {
            IDataExtractor extracter;
            if (contentType == MimeTypes.Csv || (fileName?.ToLower()?.EndsWith(".csv") ?? false))
            {
                extracter = new CsvExtractor();
            }
            else if (contentType == MimeTypes.Excel || (fileName?.ToLower()?.EndsWith(".xlsx") ?? false))
            {
                extracter = new ExcelExtractor();
            }
            else
            {
                throw new FormatException(localizer["Error_OnlyCsvOrExcelAreSupported"]);
            }

            // Extrat and return
            try
            {
                return extracter.Extract(stream).ToList();
            }
            catch (Exception ex)
            {
                // Report any errors during extraction
                string msg = localizer["Error_FailedToParseFileError0", ex.Message];
                throw new ServiceException(msg);
            }
        }

        /// <summary>
        /// Returns the E.164 representation of the phone number. Which starts with an optional '+' sign followed by digits only
        /// </summary>
        public static string ToE164(string phoneNumber)
        {
            if (string.IsNullOrEmpty(phoneNumber))
            {
                return null;
            }

            // Normalize the phone number to E.164 format (Optional + sign, followed only by digits)
            var e164 = new System.Text.StringBuilder();

            // Start with a '+' sign if there is one
            if (phoneNumber.StartsWith('+'))
            {
                e164.Append('+');
            }

            // Then append only the digits
            foreach (var digit in phoneNumber.Where(char.IsDigit))
            {
                e164.Append(digit);
            }

            return e164.ToString();
        }

        /// <summary>
        /// Returns all new images in the saved entities with their blob names, after standardizing their size and format.
        /// Meanwhile for each entity with a new image the value of <see cref="EntityMetadata.FileId"/> on that entity is
        /// set to the file name (before applying the blob name function)
        /// </summary>
        public static IEnumerable<(string blobName, byte[] blobBytes)> ExtractImages<TEntity>(List<TEntity> entities, Func<string, string> blobNameFunc) where TEntity : Entity, IEntityWithImage
        {
            // Get new image Ids and bytes that should be added to blob storage
            foreach (var entity in entities)
            {
                byte[] imageBytes = entity.Image;
                if (imageBytes != null)
                {
                    if (imageBytes.Length == 0) // This means delete the image
                    {
                        if (entity.Id != 0)
                        {
                            entity.EntityMetadata.FileId = null;
                        }
                    }
                    else
                    {
                        // Specify that ImageId should be set to a new GUID
                        string imageId = Guid.NewGuid().ToString();
                        entity.EntityMetadata.FileId = imageId;

                        // Below we process the new image bytes
                        // We make the image smaller and turn it into JPEG
                        using (var image = Image.Load(imageBytes))
                        {
                            // Resize to 128x128px
                            image.Mutate(c => c.Resize(new ResizeOptions
                            {
                                // 'Max' mode maintains the aspect ratio and keeps the entire image
                                Mode = ResizeMode.Max,
                                Size = new Size(128),
                                Position = AnchorPositionMode.Center
                            }));

                            // Some image formats like PNG support transparent regions
                            // These regions will turn black in JPEG format unless we do this
                            image.Mutate(c => c.BackgroundColor(new Rgba32(255, 255, 255))); ;

                            // Save as JPEG
                            var memoryStream = new MemoryStream();
                            image.SaveAsJpeg(memoryStream);
                            imageBytes = memoryStream.ToArray();

                            // Note: JPEG is the format of choice for photography.
                            // It provides better quality at a lower size for real life photographs
                            // which is what most of these pictures are expected to be
                        }

                        // Add it to blobs to create
                        string blobName = blobNameFunc(imageId);
                        yield return (blobName, imageBytes);
                    }
                }
            }
        }
    }
}

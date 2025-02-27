﻿using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Tellma.Repository.Common;

namespace Tellma.Repository.Application
{
    public static class SqlDataReaderApplicationExtensions
    {
        /// <summary>
        /// First loads the <see cref="ValidationError"/>s, if none are returned it moves
        /// to the next result set and loads the ids of deleted images, then if returnIds 
        /// is true moves to the next result set and loads the entity ids sorted by index. 
        /// Returns the errors, the ids, and images ids in a <see cref="SaveWithImagesOutput"/> object.
        /// </summary>
        /// <param name="returnIds">Whether or not to return the Ids.</param>
        /// <param name="cancellation">The cancellation instruction.</param>
        public static async Task<SaveWithImagesOutput> LoadSaveWithImagesResult(this SqlDataReader reader, bool returnIds, bool validateOnly, CancellationToken cancellation = default)
        {
            // (1) Load the errors
            var errors = await reader.LoadErrors(cancellation);
            bool proceed = !errors.Any() && !validateOnly;

            // (2) Load the deleted image ids
            var deletedImageIds = new List<string>();
            List<int> ids = null;
            if (proceed)
            {
                await reader.NextResultAsync(cancellation);
                while (await reader.ReadAsync(cancellation))
                {
                    deletedImageIds.Add(reader.String(0));
                }

                // (3) If no errors => load the Ids
                await reader.NextResultAsync(cancellation);
                if (returnIds)
                {
                    ids = await reader.LoadIds(cancellation);
                }
            }

            // (4) Return the result
            return new SaveWithImagesOutput(errors, ids, deletedImageIds);
        }

        /// <summary>
        /// First loads the <see cref="ValidationError"/>s, if none are returned it moves 
        /// to the next result set and loads the ids of deleted images. 
        /// Returns the errors and images ids in a <see cref="DeleteWithImagesOutput"/> object.
        /// </summary>
        /// <param name="cancellation">The cancellation instruction.</param>
        public static async Task<DeleteWithImagesOutput> LoadDeleteWithImagesResult(this SqlDataReader reader, bool validateOnly, CancellationToken cancellation = default)
        {
            // (1) Load the errors
            var errors = await reader.LoadErrors(cancellation);
            bool proceed = !errors.Any() && !validateOnly;

            // (2) Load the deleted image ids
            var deletedImageIds = new List<string>();
            if (proceed)
            {
                await reader.NextResultAsync(cancellation);
                while (await reader.ReadAsync(cancellation))
                {
                    deletedImageIds.Add(reader.String(0));
                }

                // (3) Execute the delete (othewise any SQL errors won't be returned)
                await reader.NextResultAsync(cancellation);
            }

            // (4) Return the result
            return new DeleteWithImagesOutput(errors, deletedImageIds);
        }

        /// <summary>
        /// First loads the <see cref="ValidationError"/>s, if none are returned and returnIds is true it moves
        /// to the next result set and loads the document ids. Returns both the errors and the ids in a <see cref="SaveOutput"/> object.
        /// </summary>
        /// <param name="returnIds">Whether or not to return the document Ids.</param>
        /// <param name="cancellation">The cancellation instruction.</param>
        public static async Task<SignOutput> LoadSignResult(this SqlDataReader reader, bool returnIds, bool validateOnly, CancellationToken cancellation = default)
        {
            // (1) Load the errors
            var errors = await reader.LoadErrors(cancellation);
            bool proceed = !errors.Any() && !validateOnly;

            // (2) If no errors => load the Ids
            var documentIds = new List<int>();
            if (proceed)
            {
                await reader.NextResultAsync(cancellation);
                if (returnIds)
                {
                    while (await reader.ReadAsync(cancellation))
                    {
                        documentIds.Add(reader.GetInt32(0));
                    }
                }
            }

            // (3) Return the result
            return new SignOutput(errors, documentIds);
        }

        public static async Task<List<InboxStatus>> LoadInboxStatuses(this SqlDataReader reader, CancellationToken cancellation = default)
        {
            var result = new List<InboxStatus>();

            while (await reader.ReadAsync(cancellation))
            {
                int i = 0;
                var externalId = reader.GetString(i++);
                var count = reader.GetInt32(i++);
                var unknownCount = reader.GetInt32(i++);

                result.Add(new InboxStatus(externalId, count, unknownCount));
            }

            return result;
        }

        public static async Task<InboxStatusOutput> LoadInboxStatusResult(this SqlDataReader reader, bool validateOnly, CancellationToken cancellation = default)
        {
            // (1) Load the errors
            var errors = await reader.LoadErrors(cancellation);
            bool proceed = !errors.Any() && !validateOnly;

            // (2) If no errors => load the Ids
            List<InboxStatus> inboxStatuses = default;
            if (proceed)
            {
                await reader.NextResultAsync(cancellation);
                inboxStatuses = await reader.LoadInboxStatuses(cancellation);
            }

            // (3) Return the result
            return new InboxStatusOutput(errors, inboxStatuses);
        }

    }
}

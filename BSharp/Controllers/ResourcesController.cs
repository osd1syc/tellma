﻿using BSharp.Controllers.Dto;
using BSharp.Controllers.Utilities;
using BSharp.Data;
using BSharp.Data.Queries;
using BSharp.Entities;
using BSharp.Services.MultiTenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace BSharp.Controllers
{
    // Specific API, works with a certain definitionId, and allows read-write
    [Route("api/" + BASE_ADDRESS + "{definitionId}")]
    [ApplicationApi]
    public class ResourcesController : CrudControllerBase<ResourceForSave, Resource, int>
    {
        public const string BASE_ADDRESS = "resources/";

        private readonly ILogger _logger;
        private readonly IStringLocalizer _localizer;
        private readonly ApplicationRepository _repo;
        private readonly IDefinitionsCache _definitionsCache;
        private readonly IModelMetadataProvider _modelMetadataProvider;

        private string DefinitionId => RouteData.Values["definitionId"]?.ToString() ??
            throw new BadRequestException("URI must be of the form 'api/" + BASE_ADDRESS + "{definitionId}'");

        private ResourceDefinitionForClient Definition() => _definitionsCache.GetCurrentDefinitionsIfCached()?.Data?.Resources?
            .GetValueOrDefault(DefinitionId) ?? throw new InvalidOperationException($"Definition for '{DefinitionId}' was missing from the cache");

        private string ViewId => $"{BASE_ADDRESS}{DefinitionId}";

        public ResourcesController(
            ILogger<ResourcesController> logger,
            IStringLocalizer<Strings> localizer,
            ApplicationRepository repo,
            IDefinitionsCache definitionsCache,
            IModelMetadataProvider modelMetadataProvider) : base(logger, localizer)
        {
            _logger = logger;
            _localizer = localizer;
            _repo = repo;
            _definitionsCache = definitionsCache;
            _modelMetadataProvider = modelMetadataProvider;
        }

        [HttpPut("activate")]
        public async Task<ActionResult<EntitiesResponse<Resource>>> Activate([FromBody] List<int> ids, [FromQuery] ActivateArguments args)
        {
            bool returnEntities = args.ReturnEntities ?? false;

            return await ControllerUtilities.InvokeActionImpl(() =>
                Activate(ids: ids,
                    returnEntities: returnEntities,
                    expand: args.Expand,
                    isActive: true)
            , _logger);
        }

        [HttpPut("deactivate")]
        public async Task<ActionResult<EntitiesResponse<Resource>>> Deactivate([FromBody] List<int> ids, [FromQuery] DeactivateArguments args)
        {
            bool returnEntities = args.ReturnEntities ?? false;

            return await ControllerUtilities.InvokeActionImpl(() =>
                Activate(ids: ids,
                    returnEntities: returnEntities,
                    expand: args.Expand,
                    isActive: false)
            , _logger);
        }

        private async Task<ActionResult<EntitiesResponse<Resource>>> Activate([FromBody] List<int> ids, bool returnEntities, string expand, bool isActive)
        {
            // Parse parameters
            var expandExp = ExpandExpression.Parse(expand);
            var idsArray = ids.ToArray();

            // Check user permissions
            await CheckActionPermissions("IsActive", idsArray);

            // Execute and return
            using (var trx = ControllerUtilities.CreateTransaction())
            {
                await _repo.Resources__Activate(ids, isActive);

                if (returnEntities)
                {
                    var response = await GetByIdListAsync(idsArray, expandExp);

                    trx.Complete();
                    return Ok(response);
                }
                else
                {
                    trx.Complete();
                    return Ok();
                }
            }
        }

        protected override async Task<IEnumerable<AbstractPermission>> UserPermissions(string action)
        {
            return await _repo.UserPermissions(action, ViewId);
        }

        protected override IRepository GetRepository()
        {
            string filter = $"{nameof(Resource.ResourceDefinitionId)} eq '{DefinitionId}'";
            return new FilteredRepository<Resource>(_repo, filter);
        }

        protected override Query<Resource> Search(Query<Resource> query, GetArguments args, IEnumerable<AbstractPermission> filteredPermissions)
        {
            return ResourceControllerUtil.SearchImpl(query, args, filteredPermissions);
        }

        protected override async Task SaveValidateAsync(List<ResourceForSave> entities)
        {
            var definition = Definition();

            // Set default values
            SetDefaultValue(entities, e => e.MassUnitId, definition.MassUnit_DefaultValue);
            SetDefaultValue(entities, e => e.VolumeUnitId, definition.VolumeUnit_DefaultValue);
            SetDefaultValue(entities, e => e.AreaUnitId, definition.AreaUnit_DefaultValue);
            SetDefaultValue(entities, e => e.LengthUnitId, definition.LengthUnit_DefaultValue);
            SetDefaultValue(entities, e => e.TimeUnitId, definition.TimeUnit_DefaultValue);
            SetDefaultValue(entities, e => e.CountUnitId, definition.CountUnit_DefaultValue);
            SetDefaultValue(entities, e => e.Memo, definition.Memo_DefaultValue);
            SetDefaultValue(entities, e => e.CustomsReference, definition.CustomsReference_DefaultValue);
            SetDefaultValue(entities, e => e.ResourceLookup1Id, definition.ResourceLookup1_DefaultValue);
            SetDefaultValue(entities, e => e.ResourceLookup2Id, definition.ResourceLookup2_DefaultValue);
            SetDefaultValue(entities, e => e.ResourceLookup3Id, definition.ResourceLookup3_DefaultValue);
            SetDefaultValue(entities, e => e.ResourceLookup4Id, definition.ResourceLookup4_DefaultValue);

            // Validate required stuff
            ValidateIfRequired(entities, e => e.MassUnitId, definition.MassUnit_Visibility);
            ValidateIfRequired(entities, e => e.VolumeUnitId, definition.VolumeUnit_Visibility);
            ValidateIfRequired(entities, e => e.AreaUnitId, definition.AreaUnit_Visibility);
            ValidateIfRequired(entities, e => e.LengthUnitId, definition.LengthUnit_Visibility);
            ValidateIfRequired(entities, e => e.TimeUnitId, definition.TimeUnit_Visibility);
            ValidateIfRequired(entities, e => e.CountUnitId, definition.CountUnit_Visibility);
            ValidateIfRequired(entities, e => e.Memo, definition.Memo_Visibility);
            ValidateIfRequired(entities, e => e.CustomsReference, definition.CustomsReference_Visibility);
            ValidateIfRequired(entities, e => e.ResourceLookup1Id, definition.ResourceLookup1_Visibility);
            ValidateIfRequired(entities, e => e.ResourceLookup2Id, definition.ResourceLookup2_Visibility);
            ValidateIfRequired(entities, e => e.ResourceLookup3Id, definition.ResourceLookup3_Visibility);
            ValidateIfRequired(entities, e => e.ResourceLookup4Id, definition.ResourceLookup4_Visibility);

            // No need to invoke SQL if the model state is full of errors
            if (ModelState.HasReachedMaxErrors)
            {
                // null Ids will cause an error when calling the SQL validation
                return;
            }

            // SQL validation
            int remainingErrorCount = ModelState.MaxAllowedErrors - ModelState.ErrorCount;
            var sqlErrors = await _repo.Resources_Validate__Save(DefinitionId, entities, top: remainingErrorCount);

            // Add errors to model state
            ModelState.AddLocalizedErrors(sqlErrors, _localizer);
        }

        private void SetDefaultValue<TKey>(List<ResourceForSave> entities, Expression<Func<ResourceForSave, TKey>> selector, TKey defaultValue)
        {
            if (defaultValue != null)
            {
                Func<ResourceForSave, TKey> getPropValue = selector.Compile(); // The function to access the property value
                Action<ResourceForSave, TKey> setPropValue = ControllerUtilities.GetAssigner(selector).Compile();

                entities.ForEach(entity =>
                {
                    if (getPropValue(entity) == null)
                    {
                        setPropValue(entity, defaultValue);
                    }
                });
            }
        }

        private void ValidateIfRequired<TKey>(List<ResourceForSave> entities, Expression<Func<ResourceForSave, TKey>> selector, byte visibility)
        {
            if (visibility == Visibility.Required && !ModelState.HasReachedMaxErrors)
            {
                Func<ResourceForSave, TKey> getPropValue = selector.Compile(); // The function to access the property value

                foreach (var (entity, index) in entities.Select((e, i) => (e, i)))
                {
                    if (getPropValue(entity) == null)
                    {
                        string propName = (selector.Body as MemberExpression).Member.Name; // The name of the property we're validating
                        string path = $"[{index}].{propName}";
                        string propDisplayName = _modelMetadataProvider.GetMetadataForProperty(typeof(ResourceForSave), propName)? .DisplayName;
                        string errorMsg = _localizer[nameof(RequiredAttribute), propDisplayName];

                        ModelState.AddModelError(path, errorMsg);

                        if (ModelState.HasReachedMaxErrors)
                        {
                            // No need to keep going forever
                            break;
                        }
                    }
                }
            }
        }

        protected override async Task<List<int>> SaveExecuteAsync(List<ResourceForSave> entities, ExpandExpression expand, bool returnIds)
        {
            return await _repo.Resources__Save(DefinitionId, entities, returnIds: returnIds);
        }

        protected override async Task DeleteValidateAsync(List<int> ids)
        {
            // SQL validation
            int remainingErrorCount = ModelState.MaxAllowedErrors - ModelState.ErrorCount;
            var sqlErrors = await _repo.Resources_Validate__Delete(DefinitionId, ids, top: remainingErrorCount);

            // Add errors to model state
            ModelState.AddLocalizedErrors(sqlErrors, _localizer);
        }

        protected override async Task DeleteExecuteAsync(List<int> ids)
        {
            try
            {
                await _repo.Resources__Delete(ids);
            }
            catch (ForeignKeyViolationException)
            {
                // TODO: test
                var definition = Definition();
                var tenantInfo = await _repo.GetTenantInfoAsync();
                var titleSingular = tenantInfo.Localize(definition.TitleSingular, definition.TitleSingular2, definition.TitleSingular3);

                throw new BadRequestException(_localizer["Error_CannotDelete0AlreadyInUse", titleSingular]);
            }
        }

        protected override Query<Resource> GetAsQuery(List<ResourceForSave> entities)
        {
            return _repo.Resources__AsQuery(DefinitionId, entities);
        }
    }

    // Generic API, allows reading all resources

    [Route("api/resources")]
    [ApplicationApi]
    public class ResourcesGenericController : FactWithIdControllerBase<Resource, int>
    {
        private readonly ApplicationRepository _repo;

        public ResourcesGenericController(
            ILogger<ResourcesController> logger,
            IStringLocalizer<Strings> localizer,
            ApplicationRepository repo) : base(logger, localizer)
        {
            _repo = repo;
        }

        protected override IRepository GetRepository()
        {
            return _repo;
        }

        protected override async Task<IEnumerable<AbstractPermission>> UserPermissions(string action)
        {
            // Get all permissions pertaining to resources
            string prefix = ResourcesController.BASE_ADDRESS;
            var permissions = await _repo.GenericUserPermissions(action, prefix);

            // Massage the permissions by adding definitionId = definitionId as an extra clause 
            // (since the controller will not filter the results per any specific definition Id)
            foreach (var permission in permissions.Where(e => e.ViewId != "all"))
            {
                string definitionId = permission.ViewId.Remove(0, prefix.Length).Replace("'", "''");
                string definitionPredicate = $"{nameof(Resource.ResourceDefinitionId)} eq '{definitionId}'";
                if (!string.IsNullOrWhiteSpace(permission.Criteria))
                {
                    permission.Criteria = $"{definitionPredicate} and ({permission.Criteria})";
                }
                else
                {
                    permission.Criteria = definitionPredicate;
                }
            }

            // Return the massaged permissions
            return permissions;
        }

        protected override Query<Resource> Search(Query<Resource> query, GetArguments args, IEnumerable<AbstractPermission> filteredPermissions)
        {
            return ResourceControllerUtil.SearchImpl(query, args, filteredPermissions);
        }
    }

    internal class ResourceControllerUtil
    {
        /// <summary>
        /// This is needed in both the generic and specific controllers, so we move it out here
        /// </summary>
        public static Query<Resource> SearchImpl(Query<Resource> query, GetArguments args, IEnumerable<AbstractPermission> _)
        {
            string search = args.Search;
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Replace("'", "''"); // escape quotes by repeating them

                var name = nameof(Resource.Name);
                var name2 = nameof(Resource.Name2);
                var name3 = nameof(Resource.Name3);
                var code = nameof(Resource.Code);

                query = query.Filter($"{name} {Ops.contains} '{search}' or {name2} {Ops.contains} '{search}' or {name3} {Ops.contains} '{search}' or {code} {Ops.contains} '{search}'");
            }

            return query;
        }
    }
}

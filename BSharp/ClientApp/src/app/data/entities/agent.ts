// tslint:disable:variable-name
// tslint:disable:max-line-length
import { EntityWithKey } from './base/entity-with-key';
import { TenantWorkspace } from '../workspace.service';
import { TranslateService } from '@ngx-translate/core';
import { EntityDescriptor } from './base/metadata';
import { SettingsForClient } from '../dto/settings-for-client';
import { DefinitionsForClient } from '../dto/definitions-for-client';
import { GENERIC } from './base/constants';

export class AgentForSave extends EntityWithKey {

  Name: string;
  Name2: string;
  Name3: string;
  Code: string;
  IsRelated: boolean;
  TaxIdentificationNumber: string;
  OperatingSegmentId: number;
  StartDate: string;
  JobId: number;
  BasicSalary: number;
  TransportationAllowance: number;
  OvertimeRate: number;
  BankAccountNumber: number;
  UserId: number;
  Image: string;
}

export class Agent extends AgentForSave {
  DefinitionId: string;
  ImageId: string;
  IsActive: boolean;
  CreatedAt: string;
  CreatedById: number | string;
  ModifiedAt: string;
  ModifiedById: number | string;
}

const _select = ['', '2', '3'].map(pf => 'Name' + pf);
let _settings: SettingsForClient;
let _definitions: DefinitionsForClient;
let _cache: { [defId: string]: EntityDescriptor } = {};
let _definitionIds: string[];

export function metadata_Agent(ws: TenantWorkspace, trx: TranslateService, definitionId: string): EntityDescriptor {
  // Some global values affect the result, we check here if they have changed, otherwise we return the cached result
  // Some global values affect the result, we check here if they have changed, otherwise we return the cached result
  if (ws.settings !== _settings || ws.definitions !== _definitions) {
    _settings = ws.settings;
    _definitions = ws.definitions;
    _definitionIds = null;

    // clear the cache
    _cache = {};
  }

  const key = definitionId || GENERIC; // undefined
  if (!_cache[key]) {
    if (!_definitionIds) {
      _definitionIds = Object.keys(ws.definitions.Agents);
    }

    const definedDefinitionId = !!definitionId && definitionId !== GENERIC;
    const entityDesc: EntityDescriptor = {
      collection: 'Agent',
      definitionId,
      definitionIds: _definitionIds,
      titleSingular: () => ws.getMultilingualValueImmediate(ws.definitions.Agents[definitionId], 'TitleSingular') || trx.instant('Agent'),
      titlePlural: () => ws.getMultilingualValueImmediate(ws.definitions.Agents[definitionId], 'TitlePlural') || trx.instant('Agents'),
      select: _select,
      apiEndpoint: definedDefinitionId ? `agents/${definitionId}` : 'agents',
      screenUrl: definedDefinitionId ? `agents/${definitionId}` : 'agents',
      orderby: ws.isSecondaryLanguage ? [_select[1], _select[0]] : ws.isTernaryLanguage ? [_select[2], _select[0]] : [_select[0]],
      format: (item: EntityWithKey) => ws.getMultilingualValueImmediate(item, _select[0]),
      properties: {
        Id: { control: 'number', label: () => trx.instant('Id'), minDecimalPlaces: 0, maxDecimalPlaces: 0 },
        Name: { control: 'text', label: () => trx.instant('Name') + ws.primaryPostfix },
        Name2: { control: 'text', label: () => trx.instant('Name') + ws.secondaryPostfix },
        Name3: { control: 'text', label: () => trx.instant('Name') + ws.ternaryPostfix },
        Code: { control: 'text', label: () => trx.instant('Code') },
        TaxIdentificationNumber: { control: 'text', label: () => trx.instant('Agent_TaxIdentificationNumber') },
        OperatingSegmentId: { control: 'number', label: () => `${trx.instant('OperatingSegment')} (${trx.instant('Id')})`, minDecimalPlaces: 0, maxDecimalPlaces: 0 },
        OperatingSegment: { control: 'navigation', label: () => trx.instant('OperatingSegment'), type: 'ResponsibilityCenter', foreignKeyName: 'OperatingSegmentId' },
        StartDate: { control: 'date', label: () => trx.instant('Agent_StartDate') },
        JobId: { control: 'number', label: () => `${trx.instant('Agent_Job')} (${trx.instant('Id')})`, minDecimalPlaces: 0, maxDecimalPlaces: 0 },
        BasicSalary: { control: 'number', label: () => trx.instant('Agent_BasicSalary'), minDecimalPlaces: 2, maxDecimalPlaces: 2, alignment: 'right' },
        TransportationAllowance: { control: 'number', label: () => trx.instant('Agent_TransportationAllowance'), minDecimalPlaces: 2, maxDecimalPlaces: 2, alignment: 'right' },
        OvertimeRate: { control: 'number', label: () => trx.instant('Agent_OvertimeRate'), minDecimalPlaces: 2, maxDecimalPlaces: 2, alignment: 'right' },
        BankAccountNumber: { control: 'text', label: () => trx.instant('Agent_BankAccountNumber') },
        UserId: { control: 'number', label: () => `${trx.instant('Agent_User')} (${trx.instant('Id')})`, minDecimalPlaces: 0, maxDecimalPlaces: 0 },
        User: { control: 'navigation', label: () => trx.instant('Agent_User'), type: 'User', foreignKeyName: 'UserId' },
        IsRelated: { control: 'boolean', label: () => trx.instant('Agent_IsRelated') },
        IsActive: { control: 'boolean', label: () => trx.instant('IsActive') },
        CreatedAt: { control: 'datetime', label: () => trx.instant('CreatedAt') },
        CreatedBy: { control: 'navigation', label: () => trx.instant('CreatedBy'), type: 'User', foreignKeyName: 'CreatedById' },
        ModifiedAt: { control: 'datetime', label: () => trx.instant('ModifiedAt') },
        ModifiedBy: { control: 'navigation', label: () => trx.instant('ModifiedBy'), type: 'User', foreignKeyName: 'ModifiedById' }
      }
    };

    if (!ws.settings.SecondaryLanguageId) {
      delete entityDesc.properties.Name2;
    }

    if (!ws.settings.TernaryLanguageId) {
      delete entityDesc.properties.Name3;
    }
    // Adjust according to definitions
    const definition = _definitions.Agents[definitionId];
    if (!definition) {
      if (definitionId !== GENERIC) {
        // Programmer mistake
        console.error(`defintionId '${definitionId}' doesn't exist`);
      }
    } else {

      // properties whose label is overridden by the definition
      const simpleLabelProps = ['StartDate'];
      for (const propName of simpleLabelProps) {
        const propDesc = entityDesc.properties[propName];
        const defaultLabel = propDesc.label;
        propDesc.label = () => ws.getMultilingualValueImmediate(definition, propName + 'Label') || defaultLabel();
      }

      // properties whose visibility is overridden by the definition
      const simpleVisibilityProps = ['TaxIdentificationNumber', 'StartDate', 'Job', 'BasicSalary', 'TransportationAllowance', 'OvertimeRate', 'BankAccountNumber'];
      for (const propName of simpleVisibilityProps) {
        if (!definition[propName + 'Visibility']) {
          delete entityDesc.properties[propName];
        }
      }
    }

    _cache[key] = entityDesc;
  }

  return _cache[key];
}

// tslint:disable:variable-name
// tslint:disable:max-line-length
import { WorkspaceService } from '../workspace.service';
import { TranslateService } from '@ngx-translate/core';
import { EntityDescriptor } from './base/metadata';
import { SettingsForClient } from '../dto/settings-for-client';
import { EntityWithKey } from './base/entity-with-key';
import { Router } from '@angular/router';

export interface DetailsEntry extends EntityWithKey {
    LineId?: number;
    CenterId?: number;
    Direction?: number;
    AccountId?: number;
    CustodianId?: number;
    CustodyId: number;
    EntryTypeId?: number;
    ParticipantId?: number;
    ResourceId?: number;
    Quantity?: number;
    AlgebraicQuantity?: number;
    NegativeAlgebraicQuantity?: number;
    UnitId?: number;
    MonetaryValue?: number;
    AlgebraicMonetaryValue?: number;
    NegativeAlgebraicMonetaryValue?: number;
    CurrencyId?: string;
    Count?: number;
    AlgebraicCount?: number;
    Mass?: number;
    AlgebraicMass?: number;
    Volume?: number;
    AlgebraicVolume?: number;
    Time?: number;
    AlgebraicTime?: number;
    Value?: number;
    Actual?: number;
    Planned?: number;
    Variance?: number;
    AlgebraicValue?: number;
    NegativeAlgebraicValue?: number;
    MonetaryValuePerUnit?: number;
    ValuePerUnit?: number;
    Time1?: string;
    Time2?: string;
    ExternalReference?: string;
    InternalReference?: string;
    NotedAgentName?: string;
    NotedAmount?: number;
    NotedDate?: string;

    Accumulation?: number; // Used by account statement
    QuantityAccumulation?: number; // Used by account statement
    MonetaryValueAccumulation?: number; // Used by account statement
}

let _settings: SettingsForClient;
let _cache: EntityDescriptor;

export function metadata_DetailsEntry(wss: WorkspaceService, trx: TranslateService): EntityDescriptor {
    const ws = wss.currentTenant;
    // Some global values affect the result, we check here if they have changed, otherwise we return the cached result
    if (ws.settings !== _settings) {
        _settings = ws.settings;
        const entityDesc: EntityDescriptor = {
            collection: 'DetailsEntry',
            titleSingular: () => trx.instant('DetailsEntry'),
            titlePlural: () => trx.instant('DetailsEntries'),
            select: [],
            apiEndpoint: 'details-entries',
            // parameters: [
            //     { key: 'CountUnitId', isRequired: false, desc: { datatype: 'entity', label: () => trx.instant('Resource_CountUnit'), type: 'Unit', foreignKeyName: 'CountUnitId' } },
            //     { key: 'MassUnitId', isRequired: false, desc: { datatype: 'entity', label: () => trx.instant('Resource_MassUnit'), type: 'Unit', foreignKeyName: 'CountUnitId' } },
            //     { key: 'VolumeUnitId', isRequired: false, desc: { datatype: 'entity', label: () => trx.instant('Resource_VolumeUnit'), type: 'Unit', foreignKeyName: 'CountUnitId' } },
            // ],
            masterScreenUrl: 'details-entries',
            navigateToDetailsSelect: ['Line/Document/DefinitionId'],
            navigateToDetails: (detailsEntry: DetailsEntry, router: Router, _: string) => {
                const line = ws.get('LineForQuery', detailsEntry.LineId);
                const docId = line.DocumentId;

                const definitionId = ws.Document[docId].DefinitionId;
                const extras = { state_key: 'from_entries' }; // fake state key to hide forward and backward navigation in details screen
                router.navigate(['app', wss.ws.tenantId + '', 'documents', definitionId, docId, extras]);
            },
            orderby: () => ['Id'],
            inactiveFilter: null,
            format: (__: EntityWithKey) => '',
            properties: {
                Id: { datatype: 'integral', control: 'number', label: () => trx.instant('Id'), minDecimalPlaces: 0, maxDecimalPlaces: 0 },
                LineId: { datatype: 'integral', control: 'number', label: () => `${trx.instant('Entry_Line')} (${trx.instant('Id')})`, minDecimalPlaces: 0, maxDecimalPlaces: 0 },
                Line: { datatype: 'entity', control: 'LineForQuery', label: () => trx.instant('Entry_Line'), foreignKeyName: 'LineId' },
                CenterId: { datatype: 'integral', control: 'number', label: () => `${trx.instant('Entry_Center')} (${trx.instant('Id')})`, minDecimalPlaces: 0, maxDecimalPlaces: 0 },
                Center: { datatype: 'entity', control: 'Center', label: () => trx.instant('Entry_Center'), foreignKeyName: 'CenterId' },
                Direction: {
                    datatype: 'integral',
                    control: 'choice',
                    label: () => trx.instant('Entry_Direction'),
                    choices: [-1, 1],
                    format: (c: number) => {
                        switch (c) {
                            case 1: return trx.instant('Entry_Direction_Debit');
                            case -1: return trx.instant('Entry_Direction_Credit');
                            default: return '';
                        }
                    }
                },
                AccountId: { datatype: 'integral', control: 'number', label: () => `${trx.instant('Entry_Account')} (${trx.instant('Id')})`, minDecimalPlaces: 0, maxDecimalPlaces: 0 },
                Account: { datatype: 'entity', control: 'Account', label: () => trx.instant('Entry_Account'), foreignKeyName: 'AccountId' },
                CustodianId: { datatype: 'integral', control: 'number', label: () => `${trx.instant('Entry_Custodian')} (${trx.instant('Id')})`, minDecimalPlaces: 0, maxDecimalPlaces: 0 },
                Custodian: { datatype: 'entity', control: 'Relation', label: () => trx.instant('Entry_Custodian'), foreignKeyName: 'CustodianId' },
                CustodyId: { datatype: 'integral', control: 'number', label: () => `${trx.instant('Entry_Custody')} (${trx.instant('Id')})`, minDecimalPlaces: 0, maxDecimalPlaces: 0 },
                Custody: { datatype: 'entity', control: 'Custody', label: () => trx.instant('Entry_Custody'), foreignKeyName: 'CustodyId' },
                EntryTypeId: { datatype: 'integral', control: 'number', label: () => `${trx.instant('Entry_EntryType')} (${trx.instant('Id')})`, minDecimalPlaces: 0, maxDecimalPlaces: 0 },
                EntryType: { datatype: 'entity', control: 'EntryType', label: () => trx.instant('Entry_EntryType'), foreignKeyName: 'EntryTypeId' },
                ParticipantId: { datatype: 'integral', control: 'number', label: () => `${trx.instant('Entry_Participant')} (${trx.instant('Id')})`, minDecimalPlaces: 0, maxDecimalPlaces: 0 },
                Participant: { datatype: 'entity', control: 'Relation', label: () => trx.instant('Entry_Participant'), foreignKeyName: 'ParticipantId' },
                ResourceId: { datatype: 'integral', control: 'number', label: () => `${trx.instant('Entry_Resource')} (${trx.instant('Id')})`, minDecimalPlaces: 0, maxDecimalPlaces: 0 },
                Resource: { datatype: 'entity', control: 'Resource', label: () => trx.instant('Entry_Resource'), foreignKeyName: 'ResourceId' },
                Quantity: { datatype: 'decimal', control: 'number', label: () => trx.instant('Entry_Quantity'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                AlgebraicQuantity: { datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_AlgebraicQuantity'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                NegativeAlgebraicQuantity: { datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_NegativeAlgebraicQuantity'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                UnitId: { datatype: 'integral', control: 'number', label: () => `${trx.instant('Entry_Unit')} (${trx.instant('Id')})`, minDecimalPlaces: 0, maxDecimalPlaces: 0 },
                Unit: { datatype: 'entity', control: 'Unit', label: () => trx.instant('Entry_Unit'), foreignKeyName: 'UnitId' },
                MonetaryValue: { datatype: 'decimal', control: 'number', label: () => trx.instant('Entry_MonetaryValue'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                AlgebraicMonetaryValue: { datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_AlgebraicMonetaryValue'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                NegativeAlgebraicMonetaryValue: { datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_NegativeAlgebraicMonetaryValue'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                CurrencyId: { datatype: 'string', control: 'text', label: () => `${trx.instant('Entry_Currency')} (${trx.instant('Id')})` },
                Currency: { datatype: 'entity', control: 'Currency', label: () => trx.instant('Entry_Currency'), foreignKeyName: 'CurrencyId' },
                Count: { datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_Count'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                AlgebraicCount: { datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_AlgebraicCount'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                Mass: { datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_Mass'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                AlgebraicMass: { datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_AlgebraicMass'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                Volume: { datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_Volume'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                AlgebraicVolume: { datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_AlgebraicVolume'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                Time: { datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_Time'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                AlgebraicTime: { datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_AlgebraicTime'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right' },
                Value: {
                    datatype: 'decimal',
                    control: 'number',
                    label: () => `${trx.instant('Entry_Value')} (${ws.getMultilingualValueImmediate(ws.settings, 'FunctionalCurrencyName')})`,
                    minDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    maxDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    alignment: 'right'
                },
                Actual: {
                    datatype: 'decimal',
                    control: 'number',
                    label: () => `${trx.instant('DetailsEntry_Actual')} (${ws.getMultilingualValueImmediate(ws.settings, 'FunctionalCurrencyName')})`,
                    minDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    maxDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    alignment: 'right'
                },
                Planned: {
                    datatype: 'decimal',
                    control: 'number',
                    label: () => `${trx.instant('DetailsEntry_Planned')} (${ws.getMultilingualValueImmediate(ws.settings, 'FunctionalCurrencyName')})`,
                    minDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    maxDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    alignment: 'right'
                },
                Variance: {
                    datatype: 'decimal',
                    control: 'number',
                    label: () => `${trx.instant('DetailsEntry_Variance')} (${ws.getMultilingualValueImmediate(ws.settings, 'FunctionalCurrencyName')})`,
                    minDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    maxDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    alignment: 'right'
                },
                AlgebraicValue: {
                    datatype: 'decimal',
                    control: 'number',
                    label: () => `${trx.instant('DetailsEntry_AlgebraicValue')} (${ws.getMultilingualValueImmediate(ws.settings, 'FunctionalCurrencyName')})`,
                    minDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    maxDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    alignment: 'right'
                },
                NegativeAlgebraicValue: {
                    datatype: 'decimal',
                    control: 'number',
                    label: () => `${trx.instant('DetailsEntry_NegativeAlgebraicValue')} (${ws.getMultilingualValueImmediate(ws.settings, 'FunctionalCurrencyName')})`,
                    minDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    maxDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    alignment: 'right'
                },

                MonetaryValuePerUnit: {
                    datatype: 'decimal', control: 'number', label: () => trx.instant('DetailsEntry_MonetaryValuePerUnit'), minDecimalPlaces: 0, maxDecimalPlaces: 4, alignment: 'right'
                },
                ValuePerUnit: {
                    datatype: 'decimal',
                    control: 'number',
                    label: () => `${trx.instant('DetailsEntry_ValuePerUnit')} (${ws.getMultilingualValueImmediate(ws.settings, 'FunctionalCurrencyName')})`,
                    minDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    maxDecimalPlaces: ws.settings.FunctionalCurrencyDecimals,
                    alignment: 'right'
                },
                Time1: { datatype: 'datetime', control: 'date', label: () => trx.instant('Entry_Time1') },
                Time2: { datatype: 'datetime', control: 'date', label: () => trx.instant('Entry_Time2') },
                ExternalReference: { datatype: 'string', control: 'text', label: () => trx.instant('Entry_ExternalReference') },
                InternalReference: { datatype: 'string', control: 'text', label: () => trx.instant('Entry_InternalReference') },
                NotedAgentName: { datatype: 'string', control: 'text', label: () => trx.instant('Entry_NotedAgentName') },
                NotedAmount: { datatype: 'decimal', control: 'number', label: () => trx.instant('Entry_NotedAmount'), minDecimalPlaces: 0, maxDecimalPlaces: 4 },
                NotedDate: { datatype: 'date', control: 'date', label: () => trx.instant('Entry_NotedDate') },
            }
        };

        _cache = entityDesc;
    }

    return _cache;
}

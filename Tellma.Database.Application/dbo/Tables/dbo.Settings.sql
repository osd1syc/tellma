﻿CREATE TABLE [dbo].[Settings] ( -- TODO: Make it wide table, up to 30,0000 columns
	-- General Settings
	[CreatedAt]								DATETIMEOFFSET(7)	NOT NULL DEFAULT SYSDATETIMEOFFSET(),
	[CreatedById]							INT					NOT NULL DEFAULT CONVERT(INT, SESSION_CONTEXT(N'UserId')) CONSTRAINT [FK_Settings__CreatedById] REFERENCES [dbo].[Users] ([Id]),
	[ShortCompanyName]						NVARCHAR (255)		NOT NULL,
	[ShortCompanyName2]						NVARCHAR (255),
	[ShortCompanyName3]						NVARCHAR (255),
	[PrimaryLanguageId]						NVARCHAR (5)		NOT NULL,
	[PrimaryLanguageSymbol]					NVARCHAR (5),
	[SecondaryLanguageId]					NVARCHAR (5),
	[SecondaryLanguageSymbol]				NVARCHAR (5),
	[TernaryLanguageId]						NVARCHAR (5),
	[TernaryLanguageSymbol]					NVARCHAR (5),
	[PrimaryCalendar]						NCHAR (2)			NOT NULL DEFAULT N'GC',
	[SecondaryCalendar]						NCHAR (2),
	[DateFormat]							NVARCHAR (50)		NOT NULL DEFAULT N'yyyy-MM-dd',
	[TimeFormat]							NVARCHAR (50)		NOT NULL DEFAULT N'HH:mm:ss',
	[BrandColor]							NCHAR (7),
	[SmsEnabled]							BIT					NOT NULL DEFAULT 0, -- SMS is expensive, this value is only editable from Tellma's admin console
	[DefinitionsVersion]					UNIQUEIDENTIFIER	NOT NULL DEFAULT NEWID(),
	[SettingsVersion]						UNIQUEIDENTIFIER	NOT NULL DEFAULT NEWID(),
	[GeneralModifiedAt]						DATETIMEOFFSET(7)	NOT NULL DEFAULT SYSDATETIMEOFFSET(),
	[GeneralModifiedById]					INT					NOT NULL DEFAULT CONVERT(INT, SESSION_CONTEXT(N'UserId')) CONSTRAINT [FK_Settings__GeneralModifiedById] REFERENCES [dbo].[Users] ([Id]),

	-- Financial Settings
	[FunctionalCurrencyId]					NCHAR(3)			NOT NULL DEFAULT CONVERT(NCHAR(3), SESSION_CONTEXT(N'FunctionalCurrencyId')) CONSTRAINT [FK_Settings__FunctionalCurrencyId] REFERENCES dbo.Currencies([Id]),
	[TaxIdentificationNumber]				NVARCHAR (50)		NULL,
	[FirstDayOfPeriod]						TINYINT				NOT NULL DEFAULT 25,
	[ArchiveDate]							DATE				NOT NULL DEFAULT ('1900.01.01'),	
	[FinancialModifiedAt]					DATETIMEOFFSET(7)	NOT NULL DEFAULT SYSDATETIMEOFFSET(),
	[FinancialModifiedById]					INT					NULL DEFAULT CONVERT(INT, SESSION_CONTEXT(N'UserId')) CONSTRAINT [FK_Settings__FinancialModifiedById] REFERENCES [dbo].[Users] ([Id]),

	[CenterManagerRelationDefinitionCode]	NVARCHAR (255) NOT NULL DEFAULT N'Employee',
	[ReferenceSourceRelationDefinitionCodes]NVARCHAR (255) NOT NULL DEFAULT N'CashMachine,CashSaleVoucher,CreditSaleVoucher'
);
--	IFRS [810000]
	--[NameOfReportingEntityOrOtherMeansOfIdentification]	NVARCHAR (255),
	--[DomicileOfEntity]				NVARCHAR (255),
	--[DomicileOfEntity2]				NVARCHAR (255),
	--[DomicileOfEntity3]				NVARCHAR (255),
	--[LegalFormOfEntity]				NVARCHAR (255),
	--[LegalFormOfEntity2]				NVARCHAR (255),
	--[LegalFormOfEntity3]				NVARCHAR (255),	
	--[CountryOfIncorporation]			NVARCHAR (255),
	--[CountryOfIncorporation2]			NVARCHAR (255),
	--[CountryOfIncorporation3]			NVARCHAR (255),
	--[AddressOfRegisteredOffice]		NVARCHAR (255),
	--[AddressOfRegisteredOffice2]		NVARCHAR (255),
	--[AddressOfRegisteredOffice3]		NVARCHAR (255),
	--[PrincipalPlaceOfBusiness]		NVARCHAR (255),
	--[PrincipalPlaceOfBusiness2]		NVARCHAR (255),
	--[PrincipalPlaceOfBusiness3]		NVARCHAR (255),
	--[NatureOfOperations]				NVARCHAR (255),
	--[NatureOfOperations2]				NVARCHAR (255),
	--[NatureOfOperations3]				NVARCHAR (255),
	--[NameOfParentEntity]				NVARCHAR (255),
	--[NameOfParentEntity2]				NVARCHAR (255),
	--[NameOfParentEntity3]				NVARCHAR (255),
	--[NameOfUltimateParentOfGroup]		NVARCHAR (255),
	--[NameOfUltimateParentOfGroup2]	NVARCHAR (255),
	--[NameOfUltimateParentOfGroup3]	NVARCHAR (255)
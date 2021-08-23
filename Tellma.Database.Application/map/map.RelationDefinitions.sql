﻿CREATE FUNCTION [map].[RelationDefinitions]()
RETURNS TABLE
AS
RETURN (
	SELECT
		[Id],
		[Code],
		[TitleSingular],
		[TitleSingular2],
		[TitleSingular3],
		[TitlePlural],
		[TitlePlural2],
		[TitlePlural3],
		[CurrencyVisibility],
		[CenterVisibility],
		[ImageVisibility],
		[DescriptionVisibility],
		[LocationVisibility],

		[FromDateLabel],
		[FromDateLabel2],
		[FromDateLabel3],		
		[FromDateVisibility],
		[ToDateLabel],
		[ToDateLabel2],
		[ToDateLabel3],
		[ToDateVisibility],

		[DateOfBirthVisibility],
		[ContactEmailVisibility],
		[ContactMobileVisibility],
		[ContactAddressVisibility],

		[Date1Label],
		[Date1Label2],
		[Date1Label3],
		[Date1Visibility],

		[Date2Label],
		[Date2Label2],
		[Date2Label3],		
		[Date2Visibility],

		[Date3Label],
		[Date3Label2],
		[Date3Label3],		
		[Date3Visibility],

		[Date4Label],
		[Date4Label2],
		[Date4Label3],		
		[Date4Visibility],

		[Decimal1Label],
		[Decimal1Label2],
		[Decimal1Label3],		
		[Decimal1Visibility],

		[Decimal2Label],
		[Decimal2Label2],
		[Decimal2Label3],		
		[Decimal2Visibility],

		[Int1Label]	,
		[Int1Label2],
		[Int1Label3],		
		[Int1Visibility],

		[Int2Label]	,
		[Int2Label2],
		[Int2Label3],		
		[Int2Visibility],

		[Lookup1Label],
		[Lookup1Label2],
		[Lookup1Label3],
		[Lookup1Visibility],
		[Lookup1DefinitionId],
		[Lookup2Label],
		[Lookup2Label2],
		[Lookup2Label3],
		[Lookup2Visibility],
		[Lookup2DefinitionId],
		[Lookup3Label],
		[Lookup3Label2],
		[Lookup3Label3],
		[Lookup3Visibility],
		[Lookup3DefinitionId],
		[Lookup4Label],
		[Lookup4Label2],
		[Lookup4Label3],
		[Lookup4Visibility],
		[Lookup4DefinitionId],

		[Lookup5Label],
		[Lookup5Label2],
		[Lookup5Label3],
		[Lookup5Visibility],
		[Lookup5DefinitionId],
		[Lookup6Label],
		[Lookup6Label2],
		[Lookup6Label3],
		[Lookup6Visibility],
		[Lookup6DefinitionId],
		[Lookup7Label],
		[Lookup7Label2],
		[Lookup7Label3],
		[Lookup7Visibility],
		[Lookup7DefinitionId],
		[Lookup8Label],
		[Lookup8Label2],
		[Lookup8Label3],
		[Lookup8Visibility],
		[Lookup8DefinitionId],

		[Text1Label],
		[Text1Label2],
		[Text1Label3],		
		[Text1Visibility],

		[Text2Label],
		[Text2Label2],
		[Text2Label3],		
		[Text2Visibility],

		[Text3Label],
		[Text3Label2],
		[Text3Label3],		
		[Text3Visibility],

		[Text4Label],
		[Text4Label2],
		[Text4Label3],		
		[Text4Visibility],

		[PreprocessScript],
		[ValidateScript],

		[Relation1Label],
		[Relation1Label2],
		[Relation1Label3],
		[Relation1Visibility],
		[Relation1DefinitionId],

		[TaxIdentificationNumberVisibility],

		[BankAccountNumberVisibility],
		[ExternalReferenceVisibility],
		[ExternalReferenceLabel],
		[ExternalReferenceLabel2],
		[ExternalReferenceLabel3],
		[UserCardinality],
		[HasAttachments],
		[AttachmentsCategoryDefinitionId],

		[State],
		[MainMenuIcon],
		[MainMenuSection],
		[MainMenuSortKey],

		[SavedById],
		TODATETIMEOFFSET([ValidFrom], '+00:00') AS [SavedAt],
		[ValidFrom],
		[ValidTo]

	FROM dbo.RelationDefinitions
);

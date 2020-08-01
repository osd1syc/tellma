﻿DELETE FROM @DocumentDefinitions
INSERT INTO @DocumentDefinitions([Index], [Id], [Code], [DocumentType], [Description], [TitleSingular], [TitlePlural],[Prefix], [MainMenuIcon], [MainMenuSection], [MainMenuSortKey])
SELECT [Id], [Id], [Code], [DocumentType], [Description], [TitleSingular], [TitlePlural],[Prefix], [MainMenuIcon], [MainMenuSection], [MainMenuSortKey]
FROM dbo.DocumentDefinitions
WHERE [Id] IN
(
--@ManualJournalVoucherDD,
@CashPurchaseVoucherDD,
@CashPaymentVoucherDD,
@CashSalesVoucherDD,
@CashReceiptVoucherDD
);
DELETE FROM @DocumentDefinitionLineDefinitions
INSERT @DocumentDefinitionLineDefinitions([Index],
[HeaderIndex],						[LineDefinitionId],							[IsVisibleByDefault]) VALUES
(11,@CashPurchaseVoucherDD,			@CashPaymentToTradePayableWithInvoiceLD,	1),
(12,@CashPurchaseVoucherDD,			@WithholdingTaxFromTradePayableLD,			1),
(13,@CashPurchaseVoucherDD,			@StockReceiptFromTradePayableLD,			1),-- 
(19,@CashPurchaseVoucherDD,			@ManualLineLD,								0),
(21,@CashPaymentVoucherDD,			@CashPaymentToTradePayableLD,				1);

EXEC dal.DocumentDefinitions__Save
	@Entities = @DocumentDefinitions,
	@DocumentDefinitionLineDefinitions = @DocumentDefinitionLineDefinitions,
	@DocumentDefinitionMarkupTemplates = @DocumentDefinitionMarkupTemplates;

DELETE FROM @DocumentDefinitionIds
INSERT INTO @DocumentDefinitionIds([Id]) SELECT [Id] FROM @DocumentDefinitions

EXEC [dal].[DocumentDefinitions__UpdateState]
	@Ids = @DocumentDefinitionIds,
	@State =  N'Visible'

-- Delete what is not in the scope of CPV, mainly because it is acquired from abroad
DELETE FROM LineDefinitionEntryResourceDefinitions
WHERE [LineDefinitionEntryId] = (SELECT [Id] FROM dbo.LineDefinitionEntries WHERE LineDefinitionId = @StockReceiptFromTradePayableLD AND [Index] = 0)
AND [ResourceDefinitionId] IN (
	@MerchandiseRD,
	@CurrentFoodAndBeverageRD,
	@CurrentAgriculturalProduceRD,
	@PropertyIntendedForSaleInOrdinaryCourseOfBusinessRD,
	@RawMaterialsRD,
	@CurrentFuelRD,
	@TradeMedicineRD,
	@TradeConstructionMaterialRD,
	@TradeSparePartRD,
	@RawVehicleRD
)
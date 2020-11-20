﻿CREATE TYPE [dbo].[ResourceList] AS TABLE (
	[Index]						INT					PRIMARY KEY,
	[Id]						INT					NOT NULL DEFAULT 0,
	[Name]						NVARCHAR (255)		NOT NULL,
	[Name2]						NVARCHAR (255),
	[Name3]						NVARCHAR (255),
	[Code]						NVARCHAR (50),
	[CurrencyId]				NCHAR (3),
	[CenterId]					INT,
	[CostCenterId]				INT,
	--[ImageId]					NVARCHAR (50),
	[Description]				NVARCHAR (2048),
	[Description2]				NVARCHAR (2048),
	[Description3]				NVARCHAR (2048),
	[LocationJson]				NVARCHAR(MAX),
	[LocationWkb]				VARBINARY(MAX),
	[FromDate]					DATE,
	[ToDate]					DATE,
	[Decimal1]					DECIMAL (19,4),
	[Decimal2]					DECIMAL (19,4),
	[Int1]						INT,
	[Int2]						INT,
	[Lookup1Id]					INT,
	[Lookup2Id]					INT,
	[Lookup3Id]					INT,
	[Lookup4Id]					INT,
	[Text1]						NVARCHAR (50),
	[Text2]						NVARCHAR (50), 
-- Specific to resources
	[Identifier]				NVARCHAR (50),
	[VatRate]					DECIMAL (19,4),
	[ReorderLevel]				DECIMAL (19,4),
	[EconomicOrderQuantity]		DECIMAL (19,4),
	[UnitId]					INT,
	[UnitMass]					DECIMAL (19,4),
	[UnitMassUnitId]			INT,
--	[ParentId]					INT,
	[MonetaryValue]				DECIMAL (19,4),
	[ParticipantId]				INT,

	-- Extra Columns not in Resource.cs
	[ImageId]					NVARCHAR (50)

	INDEX IX_ResourceList__Code ([Code])
);
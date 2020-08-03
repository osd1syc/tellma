﻿CREATE TYPE [dbo].[DocumentList] AS TABLE (
	[Index]							INT				PRIMARY KEY,-- IDENTITY (0,1),
	[Id]							INT				NOT NULL DEFAULT 0,
	[SerialNumber]					INT,
	[PostingDate]					DATE,
	[PostingDateIsCommon]			BIT				NOT NULL DEFAULT 1,
	[Clearance]						TINYINT			NOT NULL DEFAULT 0,
	[DocumentLookup1Id]				INT, -- e.g., cash machine serial in the case of a sale
	[DocumentLookup2Id]				INT,
	[DocumentLookup3Id]				INT,
	[DocumentText1]					NVARCHAR (255),
	[DocumentText2]					NVARCHAR (255),
	[Memo]							NVARCHAR (255),	
	[MemoIsCommon]					BIT				DEFAULT 0,

	[DebitResourceId]				INT,
	[DebitResourceIsCommon]			BIT				NOT NULL DEFAULT 0,
	[CreditResourceId]				INT,
	[CreditResourceIsCommon]		BIT				NOT NULL DEFAULT 0,	

	[DebitCustodyId]				INT,
	[DebitCustodyIsCommon]			BIT				NOT NULL DEFAULT 0,
	[CreditCustodyId]				INT,
	[CreditCustodyIsCommon]			BIT				NOT NULL DEFAULT 0,
	[NotedRelationId]				INT,
	[NotedRelationIsCommon]			BIT				NOT NULL DEFAULT 0,
	[SegmentId]						INT,
	[CenterId]						INT,
	[CenterIsCommon]				BIT				NOT NULL DEFAULT 0,
	[Time1]							DATETIME2 (2),
	[Time1IsCommon]					BIT				NOT NULL DEFAULT 0,
	[Time2]							DATETIME2 (2),
	[Time2IsCommon]					BIT				NOT NULL DEFAULT 0,
	[Quantity]						DECIMAL (19,4)	NULL,
	[QuantityIsCommon]				BIT				NOT NULL DEFAULT 0,
	[UnitId]						INT,
	[UnitIsCommon]					BIT				NOT NULL DEFAULT 0,
	[CurrencyId]					NCHAR (3), 
	[CurrencyIsCommon]				BIT				NOT NULL DEFAULT 0
);
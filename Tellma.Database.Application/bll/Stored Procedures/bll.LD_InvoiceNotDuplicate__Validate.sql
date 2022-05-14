﻿CREATE PROCEDURE [bll].[LD_InvoiceNotDuplicate__Validate]
	@DefinitionId INT,
	@Documents [dbo].[DocumentList] READONLY,
	@DocumentLineDefinitionEntries [dbo].[DocumentLineDefinitionEntryList] READONLY,
	@Lines LineList READONLY,
	@Entries EntryList READONLY,
	@Top INT,
	@FD_Index_Str NVARCHAR (255),
	@FDLDE_Index_Str NVARCHAR (255),
	@FE_Index_Str NVARCHAR (255)
AS
DECLARE @ValidationErrors ValidationErrorList;
DECLARE @ErrorNames dbo.ErrorNameList;
SET NOCOUNT ON;
INSERT INTO @ErrorNames([ErrorIndex], [Language], [ErrorName]) VALUES
(0, N'en',  N'Invoice has been used in Document {0}'), (0, N'ar',  N'الفاتورة مكررة في القيد رقم {0}');

INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
SELECT DISTINCT TOP (@Top)
	CASE
		WHEN @FD_Index_Str = N'AgentId' AND FD.AgentIsCommon = 1 OR @FD_Index_Str = N'NotedAgentId' AND FD.NotedAgentIsCommon = 1
		THEN
			N'[' + CAST(FD.[Index] AS NVARCHAR (255)) + N'].' + @FD_Index_Str
		WHEN @FDLDE_Index_Str = N'AgentId' AND FDLDE.AgentIsCommon = 1 OR @FDLDE_Index_Str = N'NotedAgentId' AND FDLDE.NotedAgentIsCommon = 1 
		THEN
			N'[' + CAST(FD.[Index] AS NVARCHAR (255)) + N'].LineDefinitionEntries[' + CAST(FDLDE.[Index] AS NVARCHAR (255)) + N'].' + @FDLDE_Index_Str
		ELSE
			N'[' + CAST(FD.[Index] AS NVARCHAR (255)) + N'].Lines[' + CAST(FL.[Index] AS NVARCHAR (255)) + N'].' + @FE_Index_Str
	END,
	dal.fn_ErrorNames_Index___Localize(@ErrorNames, 0)  AS ErrorMessage,
	BD.[Code]
FROM @Documents FD
JOIN @Lines FL ON FL.[DocumentIndex] = FD.[Index]
JOIN @Entries FE ON FE.[LineIndex] = FL.[Index] AND FE.[DocumentIndex] = FL.[DocumentIndex]
LEFT JOIN @DocumentLineDefinitionEntries FDLDE 
	ON FDLDE.[DocumentIndex] = FD.[Index] AND FDLDE.[LineDefinitionId] = FL.[DefinitionId] AND FDLDE.[EntryIndex] = FE.[Index]
JOIN dbo.Entries BE ON BE.[AccountId] = FE.[AccountId] AND BE.[AgentId] = FE.[AgentId] AND BE.[NotedAgentId] = FE.[NotedAgentId]
AND BE.[Direction] = FE.[Direction]
JOIN dbo.Lines BL ON BL.[Id] = BE.[LineId]
JOIN map.Documents() BD ON BD.[Id] = BL.[DocumentId] 
JOIN dbo.Accounts A ON A.[Id] = BE.[AccountId]
JOIN dbo.AccountTypes AC ON AC.[Id] = A.[AccountTypeId]
JOIN dbo.Agents NAG ON NAG.[Id] = BE.[NotedAgentId]
WHERE BD.[Id] <> FD.[Id]
AND AC.[Concept] IN (
	N'CurrentValueAddedTaxPayables',
	N'NoncurrentValueAddedTaxPayables',
	N'CurrentValueAddedTaxReceivables',
	N'NoncurrentValueAddedTaxReceivables'
)
AND NAG.[Code] <> N'NullAgent'
AND BL.[State] >= 4;

SELECT * FROM @ValidationErrors;
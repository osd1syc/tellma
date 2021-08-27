﻿CREATE PROCEDURE [bll].[Centers_Validate__Save]
	@Entities [CenterList] READONLY,
	@Top INT = 200,
	@IsError BIT OUTPUT
AS
BEGIN
	SET NOCOUNT ON;
	DECLARE @ValidationErrors [dbo].[ValidationErrorList];

	INSERT INTO @ValidationErrors([Key], [ErrorName])
	SELECT TOP (@Top)
		'[' + CAST([Index] AS NVARCHAR (255)) + ']',
		N'Error_CannotModifyInactiveItem'
    FROM @Entities
    WHERE Id IN (SELECT Id from [dbo].[Centers] WHERE [IsActive] = 0);

    -- Non zero Ids must exist
    INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
	SELECT TOP (@Top)
		'[' + CAST([Index] AS NVARCHAR (255)) + ']',
		N'Error_TheId0WasNotFound',
		CAST([Id] As NVARCHAR (255))
    FROM @Entities
    WHERE [Id] <> 0
    AND Id NOT IN (SELECT Id from [dbo].[Centers])

	-- Code must be unique
    INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
	SELECT TOP (@Top)
		'[' + CAST(FE.[Index] AS NVARCHAR (255)) + '].Code',
		N'Error_TheCode0IsUsed',
		FE.Code
	FROM @Entities FE
	JOIN [dbo].[Centers] BE ON FE.Code = BE.Code
	WHERE (FE.Id <> BE.Id);

	-- Code must not be duplicated in the uploaded list
	INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
	SELECT TOP (@Top)
		'[' + CAST([Index] AS NVARCHAR (255)) + '].Code',
		N'Error_TheCode0IsDuplicated',
		[Code]
	FROM @Entities
	WHERE [Code] IN (
		SELECT [Code]
		FROM @Entities
		WHERE [Code] IS NOT NULL
		GROUP BY [Code]
		HAVING COUNT(*) > 1
	);

	-- Name must not exist in the db
    INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
	SELECT TOP (@Top)
		'[' + CAST(FE.[Index] AS NVARCHAR (255)) + '].Name',
		N'Error_TheName0IsUsed',
		FE.[Name]
	FROM @Entities FE 
	JOIN [dbo].[Centers] BE ON FE.[Name] = BE.[Name] AND FE.[CenterType] = BE.[CenterType]
	WHERE (FE.Id <> BE.Id);

	-- Name2 must not exist in the db
    INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
	SELECT TOP (@Top)
		'[' + CAST(FE.[Index] AS NVARCHAR (255)) + '].Name2',
		N'Error_TheName0IsUsed',
		FE.[Name2]
	FROM @Entities FE
	JOIN [dbo].[Centers] BE ON FE.[Name2] = BE.[Name2] AND FE.[CenterType] = BE.[CenterType]
	WHERE (FE.Id <> BE.Id);

	-- Name3 must not exist in the db
    INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
	SELECT TOP (@Top)
		'[' + CAST(FE.[Index] AS NVARCHAR (255)) + '].Name3',
		N'Error_TheName0IsUsed',
		FE.[Name3]
	FROM @Entities FE
	JOIN [dbo].[Centers] BE ON FE.[Name3] = BE.[Name3] AND FE.[CenterType] = BE.[CenterType]
	WHERE (FE.Id <> BE.Id);

	-- Name must be unique in the uploaded list
	INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
	SELECT TOP (@Top)
		'[' + CAST([Index] AS NVARCHAR (255)) + '].Name',
		N'Error_TheName0IsDuplicated',
		[Name]
	FROM @Entities
	WHERE [Name] IN (
		SELECT [Name]
		FROM @Entities
		GROUP BY [Name], [CenterType]
		HAVING COUNT(*) > 1
	);

	-- Name2 must be unique in the uploaded list
	INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
	SELECT TOP (@Top)
		'[' + CAST([Index] AS NVARCHAR (255)) + '].Name2',
		N'Error_TheName0IsDuplicated',
		[Name2]
	FROM @Entities
	WHERE [Name2] IN (
		SELECT [Name2]
		FROM @Entities
		WHERE [Name2] IS NOT NULL
		GROUP BY [Name2], [CenterType]
		HAVING COUNT(*) > 1
	);

	-- Name3 must be unique in the uploaded list
	INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
	SELECT TOP (@Top)
		'[' + CAST([Index] AS NVARCHAR (255)) + '].Name3',
		N'Error_TheName0IsDuplicated',
		[Name3]
	FROM @Entities
	WHERE [Name3] IN (
		SELECT [Name3]
		FROM @Entities
		WHERE [Name3] IS NOT NULL
		GROUP BY [Name3]
		HAVING COUNT(*) > 1
	);

	-- Parent Center must be active
	INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
	SELECT TOP (@Top)
		'[' + CAST(FE.[Index] AS NVARCHAR (255)) + '].ParentId',
		N'Error_TheParentCenter0IsInactive',
		FE.ParentId
	FROM @Entities FE 
	JOIN [dbo].[Centers] BE ON FE.ParentId = BE.Id
	WHERE (BE.IsActive = 0);

	-- The parent center in the uploaded list cannot have children
	INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
	SELECT TOP (@Top)
		'[' + CAST(FE.[Index] AS NVARCHAR (255)) + '].ParentId',
		N'Error_TheParentCenter0CannotHaveDescendants',
		[dbo].[fn_Localize](FE2.[Name], FE2.[Name2], FE2.[Name3]) AS ParentCenter
	FROM @Entities FE 
	JOIN @Entities FE2 ON FE.[ParentIndex] = FE2.[Index]
	WHERE (FE2.CenterType NOT IN (N'Abstract', N'BusinessUnit'));

	-- The parent center in the db cannot have children
	INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0])
	SELECT TOP (@Top)
		'[' + CAST(FE.[Index] AS NVARCHAR (255)) + '].ParentId',
		N'Error_TheParentCenter0CannotHaveDescendants',
		[dbo].[fn_Localize](BE.[Name], BE.[Name2], BE.[Name3]) AS ParentCenter
	FROM @Entities FE 
	JOIN [dbo].[Centers] BE ON FE.ParentId = BE.Id
	WHERE (BE.CenterType NOT IN (N'Abstract', N'BusinessUnit'));

		-- The business unit in the uploaded list cannot business unit descendants
	WITH BusinessUnitAscendants ([Index], [ParentIndex]) AS (
		SELECT [Index], [ParentIndex]
		FROM @Entities E
		WHERE CenterType = N'BusinessUnit'
		UNION ALL
		SELECT E2.[Index], E2.[ParentIndex]
		FROM @Entities E2
		JOIN BusinessUnitAscendants CTE ON E2.[Index] = CTE.[ParentIndex]
	)
	INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0], [Argument1])
	SELECT TOP (@Top)
		'[' + CAST(FE.[Index] AS NVARCHAR (255)) + '].Id',
		N'Error_TheBusinessUnit0CannotHaveBusinessUnitDescendant1',
		[dbo].[fn_Localize](FE2.[Name], FE2.[Name2], FE2.[Name3]) AS ParentCenter,
		[dbo].[fn_Localize](FE.[Name], FE.[Name2], FE.[Name3]) AS ChildCenter
	FROM BusinessUnitAscendants CTE
	JOIN @Entities FE ON CTE.[Index] = FE.[Index]
	JOIN @Entities FE2 ON CTE.[ParentIndex] = FE2.[Index]
	WHERE FE.[CenterType] = N'BusinessUnit' AND FE2.[CenterType] = N'BusinessUnit'
	/*
	-- The business unit in the list cannot be descendant of the business unit in the db
	WITH ListBusinessUnitAscendants ([Index], [ParentIndex], [Id], [ParentId]) AS (
		SELECT [Index], [ParentIndex], [Id], [ParentId]
		FROM @Entities E
		WHERE CenterType = N'BusinessUnit'
		UNION ALL
		SELECT E2.[Index], E2.[ParentIndex]
		FROM @Entities E2
		JOIN ListBusinessUnitAscendants CTE ON E2.[Index] = CTE.[ParentIndex]
	),
	 DbAscendants([Id], [ParentId]) AS (
		SELECT [Id], [ParentId]
		FROM ListBusinessUnitAscendants E
		UNION ALL
		SELECT [Id], [ParentId]
		FROM dbo.Centers BE
		JOIN DbAscendants CTE ON BE.[Id] = CTE.[ParentId]

	 )
	INSERT INTO @ValidationErrors([Key], [ErrorName], [Argument0], [Argument1])
	SELECT TOP (@Top)
		'[' + CAST(FE.[Index] AS NVARCHAR (255)) + '].Id',
		N'Error_TheBusinessUnit0CannotHaveBusinessUnitDescendant1',
		[dbo].[fn_Localize](FE2.[Name], FE2.[Name2], FE2.[Name3]) AS ParentCenter,
		[dbo].[fn_Localize](FE.[Name], FE.[Name2], FE.[Name3]) AS ChildCenter
	FROM BusinessUnitAscendants CTE
	JOIN @Entities FE ON CTE.[Index] = FE.[Index]
	JOIN @Entities FE2 ON CTE.[ParentIndex] = FE2.[Index]
	WHERE FE.[CenterType] = N'BusinessUnit' AND FE2.[CenterType] = N'BusinessUnit'
	*/

	-- for each one uploaded, calculate the level
	-- union the ones in db, calculate the level
	-- if we end up having same type at two different levels, raise error showing center, type, level from the uploaded ones

	-- Set @IsError
	SET @IsError = CASE WHEN EXISTS(SELECT 1 FROM @ValidationErrors) THEN 1 ELSE 0 END;

	-- Return Errors
	SELECT TOP(@Top) * FROM @ValidationErrors;
END;
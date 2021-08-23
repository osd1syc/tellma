﻿CREATE PROCEDURE [bll].[AdminUsers_Validate__Invite]
	@Ids [dbo].[IndexedIdList] READONLY,
	@UserId INT,
	@Top INT = 200,
	@IsError BIT OUTPUT
AS
BEGIN
	SET NOCOUNT ON;
	DECLARE @ValidationErrors [dbo].[ValidationErrorList];
		
    -- Can only invited uninvited users
    INSERT INTO @ValidationErrors([Key], [ErrorName])
	SELECT TOP (@Top)
		'[' + CAST([Index] AS NVARCHAR (255)) + ']',
		N'Error_ThisUserIsAlreadyAMember' -- Cannot invite a member
    FROM @Ids
    WHERE [Id] IN (SELECT [Id] from [dbo].[AdminUsers] WHERE [State] >= 2 AND [IsService] = 0);
	
    -- Can only invited human users
    INSERT INTO @ValidationErrors([Key], [ErrorName])
	SELECT TOP (@Top)
		'[' + CAST([Index] AS NVARCHAR (255)) + ']',
		N'Error_ThisIsAServiceAccount' -- Cannot invite a service account
    FROM @Ids
    WHERE [Id] IN (SELECT [Id] from [dbo].[AdminUsers] WHERE [IsService] = 1);
	
	-- Set @IsError
	SET @IsError = CASE WHEN EXISTS(SELECT 1 FROM @ValidationErrors) THEN 1 ELSE 0 END;

	SELECT TOP(@Top) * FROM @ValidationErrors;
END;
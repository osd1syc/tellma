﻿CREATE PROCEDURE [api].[DocumentDefinitions__Save]
	@Entities [DocumentDefinitionList] READONLY,
	@DocumentDefinitionLineDefinitions [DocumentDefinitionLineDefinitionList] READONLY,
	@ReturnIds BIT = 0,
	@UserId INT
AS
BEGIN
	SET NOCOUNT ON;

	-- (1) Validate the Entities
	DECLARE @IsError BIT;
	EXEC [bll].[DocumentDefinitions_Validate__Save] 
		@Entities = @Entities,
		@DocumentDefinitionLineDefinitions = @DocumentDefinitionLineDefinitions,
		@IsError = @IsError OUTPUT;

	-- If there are validation errors don't proceed
	IF @IsError = 1
		RETURN;

	-- (2) Save the entities
	EXEC [dal].[DocumentDefinitions__Save]
		@Entities = @Entities,
		@DocumentDefinitionLineDefinitions = @DocumentDefinitionLineDefinitions,
		@ReturnIds = @ReturnIds,
		@UserId = @UserId;
END;
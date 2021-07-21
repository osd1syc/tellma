﻿CREATE PROCEDURE [api].[DashboardDefinitions__Save]
	@Entities [DashboardDefinitionList] READONLY,
	@Widgets [DashboardDefinitionWidgetList] READONLY,
	@Roles [DashboardDefinitionRoleList] READONLY,
	@ReturnIds BIT = 0,
	@UserId INT
AS
BEGIN
	SET NOCOUNT ON;

	-- (1) Validate the Entities
	DECLARE @IsError BIT;
	EXEC [bll].[DashboardDefinitions_Validate__Save] 
		@Entities = @Entities,
		@Widgets = @Widgets,
		@Roles = @Roles,
		@IsError = @IsError OUTPUT;

	-- If there are validation errors don't proceed
	IF @IsError = 1
		RETURN;

	-- (2) Save the entities
	EXEC [dal].[DashboardDefinitions__Save]
		@Entities = @Entities,
		@Widgets = @Widgets,
		@Roles = @Roles,
		@ReturnIds = @ReturnIds,
		@UserId = @UserId;
END;
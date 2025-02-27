﻿CREATE PROCEDURE [dal].[Documents__Open]
	@DefinitionId INT,
	@Ids [dbo].[IndexedIdList] READONLY,
	@UserId INT
AS
BEGIN
	SET NOCOUNT ON;

	EXEC [dal].[Documents_State__Update]
		@DefinitionId = @DefinitionId,
		@Ids = @Ids,
		@State = 0,
		@UserId = @UserId;
		
	-- This automatically returns the new notification counts
	EXEC [dal].[Documents__Assign]
		@Ids = @Ids,
		@AssigneeId = @UserId,
		@UserId = @UserId;
END;

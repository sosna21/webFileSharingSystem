using Microsoft.EntityFrameworkCore.Migrations;

namespace webFileSharingSystem.Infrastructure.Data.Migrations
{
    public partial class RefreshTVF : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
             migrationBuilder.Sql(@"
                ALTER FUNCTION GetListOfAllSharedFilesForUserTVF (@userId INT, @parentId INT)
                RETURNS TABLE
                AS
                RETURN
                WITH recursive_cte_inner AS
                (
	                SELECT DISTINCT [F].*, [S].[AccessMode], [S].[ValidUntil], [S].[CreatedBy] AS [ShareCreatedBy], [S].Id AS [ShareId], 0 AS [level]
	                FROM [Share] AS [S]
	                INNER JOIN [File] AS [F] 
	                ON [F].[Id] = [S].[FileId]
	                WHERE [S].[SharedWithUserId] = @userId
	                UNION ALL
	                SELECT [F].*, [cte_i].[AccessMode], [cte_i].[ValidUntil], [cte_i].[ShareCreatedBy], NULL AS [ShareId], [cte_i].[level] + 1
	                FROM [File] AS [F]
	                INNER JOIN recursive_cte_inner AS [cte_i] ON [f].[ParentId] = [cte_i].[Id]
                ), recursive_cte_outer AS
                (
	                SELECT * 
	                FROM recursive_cte_inner WHERE (@parentId IS NULL OR [ParentId] = @parentId)
	                UNION ALL
	                SELECT [cte_i].*
	                FROM recursive_cte_inner [cte_i]
	                INNER JOIN recursive_cte_outer AS [cte_o] ON [cte_i].[ParentId] = [cte_o].[Id]
                ), cte_numbered AS 
                (
	                SELECT *, ROW_NUMBER() OVER (PARTITION BY [Id] ORDER BY [level]) AS [RN] FROM [recursive_cte_outer]
                )
                SELECT  [cte].[Id]
                ,[cte].[UserId]
                ,[cte].[FileName]
                ,[cte].[MimeType]
                ,[cte].[Size]
                ,[cte].[IsFavourite]
                ,[cte].[IsDirectory]
                ,[cte].[FileGuid]
                ,[cte].[ParentId]
                ,[cte].[AccessMode]
                ,[cte].[ValidUntil]
                ,[cte].[ShareId]
                ,[cte].[ShareCreatedBy]
                ,[U].[UserName] AS [SharedUserName] 
                FROM [cte_numbered] AS [cte]
                INNER JOIN [ApplicationUsers] AS [U]
                ON [cte].[ShareCreatedBy] = [U].[Id]
                WHERE [cte].[RN] = 1 AND [cte].[FileStatus] = 0
                AND [cte].[ValidUntil] > SYSDATETIME()"
            );
             
            migrationBuilder.Sql(@"
                ALTER FUNCTION GetListOfFilesSharedByUserIdTVF (@userId INT)
                RETURNS TABLE
                AS
                    RETURN
                WITH recursive_cte AS
                (
                    SELECT DISTINCT [F].*
                    FROM [Share] AS [S]
                    INNER JOIN [File] AS [F] 
                    ON [F].[Id] = [S].[FileId]
                    WHERE [S].[SharedByUserId] = @userId AND [S].[ValidUntil] > SYSDATETIME() 
                    UNION All
                    SELECT [f].*
                        FROM [File] AS [f]
                    INNER JOIN recursive_cte AS [cte] ON [f].[ParentId] = [cte].[Id] 
                )
                SELECT * FROM recursive_cte
                WHERE [FileStatus] = 0"
            );
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP FUNCTION GetListOfAllSharedFilesForUserTVF"
            );
            
            migrationBuilder.Sql(@"
                DROP FUNCTION GetListOfFilesSharedByUserIdTVF"
            );
        }
    }
}

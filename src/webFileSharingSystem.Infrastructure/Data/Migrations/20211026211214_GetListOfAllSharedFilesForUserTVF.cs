using Microsoft.EntityFrameworkCore.Migrations;

namespace webFileSharingSystem.Infrastructure.Data.Migrations
{
    public partial class GetListOfAllSharedFilesForUserTVF : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
				@"CREATE FUNCTION GetListOfAllSharedFilesForUserTVF (@userId INT, @parentId INT)
					RETURNS TABLE
		            AS
			            RETURN
					WITH recursive_cte_inner AS
					(
						SELECT DISTINCT [F].*, [S].[AccessMode], [S].[ValidUntil], [S].[CreatedBy] AS [ShareCreatedBy]
						FROM [Share] AS [S]
						INNER JOIN [File] AS [F] 
						ON [F].[Id] = [S].[FileId]
						WHERE [S].[SharedWithUserId] = @userId
						UNION ALL
						SELECT [F].*, [S].[AccessMode], [S].[ValidUntil], [S].[CreatedBy] AS [ShareCreatedBy]
						FROM [Share] AS [S]
						INNER JOIN [File] AS [F] 
						ON [F].[Id] = [S].[FileId]
						INNER JOIN recursive_cte_inner AS [cte_i] ON [f].[ParentId] = [cte_i].[Id]
					), recursive_cte_outer AS
					(
						SELECT * 
						FROM recursive_cte_inner WHERE (@parentId IS NULL OR [Id] = @parentId)
						UNION ALL
						SELECT [cte_i].*
						FROM recursive_cte_inner [cte_i]
						INNER JOIN recursive_cte_outer AS [cte_o] ON [cte_i].[ParentId] = [cte_o].[Id]
					)

					SELECT DISTINCT [cte].*, [U].[UserName] AS [SharedUserName] FROM recursive_cte_outer AS [cte]
					INNER JOIN [ApplicationUsers] AS [U]
					ON [cte].[ShareCreatedBy] = [U].[Id]"
                 );

            migrationBuilder.Sql(
				@"CREATE FUNCTION GetListOfFilesSharedByUserIdTVF (@userId INT)
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
			            SELECT * FROM recursive_cte"
	            
	            );
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"DROP FUNCTION GetListOfAllSharedFilesForUserTVF"
            );
            
            migrationBuilder.Sql(
	            @"DROP FUNCTION GetListOfFilesSharedByUserIdTVF"
            );

        }
    }
}

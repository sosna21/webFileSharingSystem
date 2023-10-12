﻿using Microsoft.EntityFrameworkCore.Migrations;

namespace webFileSharingSystem.Infrastructure.Data.Migrations
{
    public partial class RenameGetListOfAllChildrenTVF : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"DROP FUNCTION GetListOfAllChildrenTVF"
            );
            
            migrationBuilder.Sql(
                @"CREATE FUNCTION GetListOfAllChildrenByParentTVF (@parentId INT)
                    RETURNS TABLE
                    AS
                    RETURN
                    WITH recursive_cte AS
                    (
                        SELECT * 
                        FROM [File] WHERE [ParentId] = @parentId
                    	UNION ALL
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
                @"DROP FUNCTION GetListOfAllChildrenByParentTVF"
            );
        }
    }
}

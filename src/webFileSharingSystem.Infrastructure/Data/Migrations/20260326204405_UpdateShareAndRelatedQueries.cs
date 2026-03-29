using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace webFileSharingSystem.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateShareAndRelatedQueries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Share_SharedByUserId",
                table: "Share",
                column: "SharedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Share_ApplicationUsers_SharedByUserId",
                table: "Share",
                column: "SharedByUserId",
                principalTable: "ApplicationUsers",
                principalColumn: "Id");
            
            migrationBuilder.Sql(
                @"CREATE OR ALTER FUNCTION GetSharedFileAccessMode (@userId INT, @fileId INT)
                  RETURNS TABLE AS
                  RETURN
                  WITH PathCTE AS
                      (
                          SELECT
                              f.Id,
                              f.ParentId,
                              0 AS Depth
                          FROM [File] f
                          WHERE f.Id = @fileId

                          UNION ALL

                          SELECT
                              p.Id,
                              p.ParentId,
                              c.Depth + 1
                          FROM [File] p
                              INNER JOIN PathCTE c ON c.ParentId = p.Id
                      ),
                      PathWithShares AS
                      (
                          SELECT
                              p.Id,
                              p.Depth,
                              s.AccessMode,
                              s.ValidUntil,
                              s.RevokedAt,
                              s.Id AS ShareId
                          FROM PathCTE p
                              LEFT JOIN [Share] s ON s.FileId = p.Id
                                  AND s.SharedWithUserId = @userId
                                  AND (s.ValidUntil IS NULL OR s.ValidUntil > SYSUTCDATETIME())
                                  AND s.RevokedAt IS NULL
                      )
                  SELECT TOP 1
                      ShareId AS Id,
                      AccessMode
                  FROM PathWithShares
                  WHERE ShareId IS NOT NULL
                  ORDER BY Depth;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Share_ApplicationUsers_SharedByUserId",
                table: "Share");

            migrationBuilder.DropIndex(
                name: "IX_Share_SharedByUserId",
                table: "Share");
            
            migrationBuilder.Sql(
                @"CREATE OR ALTER FUNCTION GetSharedFileAccessMode (@userId INT, @fileId INT)
                  RETURNS TABLE AS
                  RETURN
                  WITH PathCTE AS
                      (
                          SELECT
                              f.Id,
                              f.ParentId,
                              0 AS Depth
                          FROM [File] f
                          WHERE f.Id = @fileId

                          UNION ALL

                          SELECT
                              p.Id,
                              p.ParentId,
                              c.Depth + 1
                          FROM [File] p
                              INNER JOIN PathCTE c ON c.ParentId = p.Id
                      ),
                      PathWithShares AS
                      (
                          SELECT
                              p.Id,
                              p.Depth,
                              s.AccessMode,
                              s.ValidUntil,
                              s.Id AS ShareId
                          FROM PathCTE p
                              LEFT JOIN [Share] s ON s.FileId = p.Id
                                  AND s.SharedWithUserId = @userId
                                  AND (s.ValidUntil IS NULL OR s.ValidUntil > SYSUTCDATETIME())
                      )
                  SELECT TOP 1
                      ShareId AS Id,
                      AccessMode
                  FROM PathWithShares
                  WHERE ShareId IS NOT NULL
                  ORDER BY Depth;");
        }
    }
}

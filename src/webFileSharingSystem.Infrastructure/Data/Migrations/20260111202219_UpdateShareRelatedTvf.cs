using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace webFileSharingSystem.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateShareRelatedTvf : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"ALTER FUNCTION GetListOfAllSharedFilesForUserTVF (@userId INT, @parentId INT)
                    RETURNS TABLE AS
                    RETURN
                        WITH ExplicitShares AS
                                 (
                                     SELECT
                                         s.Id        AS ShareId,
                                         s.FileId    AS SourceFileId,
                                         s.AccessMode,
                                         s.ValidUntil,
                                         s.CreatedBy AS ShareCreatedBy
                                     FROM [Share] s
                                     WHERE
                                         s.SharedWithUserId = @userId
                                       AND (s.ValidUntil IS NULL OR s.ValidUntil > SYSUTCDATETIME())
                                       AND s.RevokedAt IS NULL
                                 ),
                             InheritedTree AS
                                 (
                                     -- Explicit shares
                                     SELECT
                                         f.Id,
                                         f.UserId,
                                         f.FileName,
                                         f.MimeType,
                                         f.Size,
                                         f.IsFavourite,
                                         f.IsDirectory,
                                         f.FileGuid,
                                         f.ParentId,
                                         f.FileStatus,

                                         es.AccessMode,
                                         es.ValidUntil,
                                         es.ShareId,
                                         es.SourceFileId,
                                         es.ShareCreatedBy,

                                         0 AS Depth
                                     FROM ExplicitShares es
                                              INNER JOIN [File] f ON f.Id = es.SourceFileId

                                     UNION ALL

                                     -- Inherited permissions
                                     SELECT
                                         f.Id,
                                         f.UserId,
                                         f.FileName,
                                         f.MimeType,
                                         f.Size,
                                         f.IsFavourite,
                                         f.IsDirectory,
                                         f.FileGuid,
                                         f.ParentId,
                                         f.FileStatus,

                                         it.AccessMode,
                                         it.ValidUntil,
                                         NULL AS ShareId,
                                         it.SourceFileId,
                                         it.ShareCreatedBy,

                                         it.Depth + 1
                                     FROM [File] f
                                              INNER JOIN InheritedTree it ON f.ParentId = it.Id
                                 ),
                             RankedPermissions AS
                                 (
                                     SELECT
                                         *,
                                         ROW_NUMBER() OVER (PARTITION BY Id ORDER BY Depth) AS RN
                                     FROM InheritedTree
                                 )
                        SELECT
                            rp.Id,
                            rp.UserId,
                            rp.FileName,
                            rp.MimeType,
                            rp.Size,
                            rp.IsFavourite,
                            rp.IsDirectory,
                            rp.FileGuid,
                            rp.ParentId,
                            rp.AccessMode,
                            rp.ValidUntil,
                            rp.ShareId,
                            rp.ShareCreatedBy,
                            u.UserName AS SharedUserName,
                            CAST(IIF(rp.Depth = 0, 0, 1) AS BIT) AS IsInherited
                        FROM RankedPermissions rp
                                 INNER JOIN [ApplicationUsers] u ON u.Id = rp.ShareCreatedBy
                        WHERE
                            rp.RN = 1
                          AND rp.FileStatus = 0
                          AND (
                            --Only explicit shares for root catalog
                            (@parentId IS NULL AND rp.Depth = 0)
                                OR rp.ParentId = @parentId
                            );
                go
                ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP FUNCTION GetListOfAllSharedFilesForUserTVF"
            );

        }
    }
}

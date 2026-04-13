using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace webFileSharingSystem.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateFileEntityRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_File_CreatedBy",
                table: "File",
                column: "CreatedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_File_ApplicationUsers_CreatedBy",
                table: "File",
                column: "CreatedBy",
                principalTable: "ApplicationUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
            
            migrationBuilder.Sql(
                @"CREATE OR ALTER FUNCTION GetListOfAllSharedFilesForUserTVF (@userId INT, @parentId INT)
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
                                 SELECT
                                     f.Id,
                                     f.UserId,
                                     f.ParentId,
                                     f.FileName,
                                     f.MimeType,
                                     f.Size,
                                     f.IsDirectory,
                                     f.FileGuid,
                                     f.FileStatus,
                                     f.CreatedBy,

                                     es.ShareId,
                                     es.AccessMode,
                                     es.ValidUntil,
                                     es.ShareCreatedBy,
                                     0 AS Depth
                                 FROM ExplicitShares es
                                          INNER JOIN [File] f ON f.Id = es.SourceFileId

                                 UNION ALL

                                 SELECT
                                     f.Id,
                                     f.UserId,
                                     f.ParentId,
                                     f.FileName,
                                     f.MimeType,
                                     f.Size,
                                     f.IsDirectory,
                                     f.FileGuid,
                                     f.FileStatus,
                                     f.CreatedBy,

                                     it.ShareId,
                                     it.AccessMode,
                                     it.ValidUntil,
                                     it.ShareCreatedBy,

                                     it.Depth + 1
                                 FROM [File] f
                                          INNER JOIN InheritedTree it ON f.ParentId = it.Id

                             ),
                         RankedPermissions AS
                             (
                                 SELECT *,
                                        ROW_NUMBER() OVER (PARTITION BY Id ORDER BY Depth) AS RN
                                 FROM InheritedTree
                             )
                    SELECT
                        rp.Id,
                        rp.UserId,
                        rp.ParentId,
                        rp.FileName,
                        rp.MimeType,
                        rp.Size,
                        rp.IsDirectory,
                        rp.FileGuid,
                        rp.CreatedBy AS FileCreatedBy,
                        creator.UserName      AS FileCreatedByUserName,
                        creator.EmailAddress  AS FileCreatedByEmail,
                        rp.FileStatus,
                        p.Id AS PartialFileInfoId,
                        p.FileSize AS UploadFileSize,
                        p.ChunkSize,
                        p.PersistenceMap,
                        rp.AccessMode,
                        rp.ValidUntil,
                        sharer.UserName AS SharedUserName,
                        CAST(IIF(rp.Depth = 0, 0, 1) AS bit) AS IsInherited
                    FROM RankedPermissions rp
                             INNER JOIN [ApplicationUsers] sharer
                                        ON sharer.Id = rp.ShareCreatedBy
                             LEFT JOIN [ApplicationUsers] creator
                                       ON creator.Id = rp.CreatedBy
                             LEFT JOIN [PartialFileInfos] p
                                       ON p.FileId = rp.Id
                    WHERE
                        rp.RN = 1
                      AND (
                        rp.FileStatus = 0 OR (rp.FileStatus = 1 AND rp.CreatedBy = @userId)
                        )
                      AND (
                        (@parentId IS NULL AND rp.Depth = 0)
                            OR rp.ParentId = @parentId
                        );
                go
            ");
                        
            migrationBuilder.Sql(
                @"CREATE OR ALTER FUNCTION GetSharedFileTVF (@userId INT, @fileId INT)
                RETURNS TABLE AS
                    RETURN
                    WITH PathCTE AS
                        (
                             SELECT
                                 f.Id,
                                 f.UserId,
                                 f.ParentId,
                                 f.FileName,
                                 f.MimeType,
                                 f.Size,
                                 f.IsDirectory,
                                 f.FileGuid,
                                 f.FileStatus,
                                 f.CreatedBy,
                                 0 AS Depth
                             FROM [File] f
                             WHERE f.Id = @fileId

                             UNION ALL

                             SELECT
                                 p.Id,
                                 p.UserId,
                                 p.ParentId,
                                 p.FileName,
                                 p.MimeType,
                                 p.Size,
                                 p.IsDirectory,
                                 p.FileGuid,
                                 p.FileStatus,
                                 p.CreatedBy,
                                 c.Depth + 1
                             FROM [File] p
                                      INNER JOIN PathCTE c ON c.ParentId = p.Id
                         ),
                     PathWithShares AS
                         (
                             SELECT
                                 p.*,
                                 s.Id AS ShareId,
                                 s.AccessMode,
                                 s.ValidUntil,
                                 s.CreatedBy AS ShareCreatedBy
                             FROM PathCTE p
                                      LEFT JOIN [Share] s
                                                ON s.FileId = p.Id
                                                    AND s.SharedWithUserId = @userId
                                                    AND (s.ValidUntil IS NULL OR s.ValidUntil > SYSUTCDATETIME())
                                                    AND s.RevokedAt IS NULL
                         ),
                     EffectiveShare AS
                         (
                             SELECT TOP 1 *
                             FROM PathWithShares
                             WHERE ShareId IS NOT NULL
                             ORDER BY Depth
                         )
                SELECT
                    f.Id,
                    f.UserId,
                    f.ParentId,
                    f.FileName,
                    f.MimeType,
                    f.Size,
                    f.IsDirectory,
                    f.FileGuid,
                    f.CreatedBy AS FileCreatedBy,
                    creator.UserName     AS FileCreatedByUserName,
                    creator.EmailAddress AS FileCreatedByEmail,
                    f.FileStatus,
                    pfi.Id             AS PartialFileInfoId,
                    pfi.FileSize       AS UploadFileSize,
                    pfi.ChunkSize,
                    pfi.PersistenceMap,
                    es.AccessMode,
                    es.ValidUntil,
                    sharer.UserName    AS SharedUserName,
                    CAST(IIF(f.Id = es.Id, 0, 1) AS bit) AS IsInherited

                FROM EffectiveShare es
                         INNER JOIN PathWithShares f ON f.Id = @fileId

                         INNER JOIN [ApplicationUsers] sharer
                                    ON sharer.Id = es.ShareCreatedBy

                         LEFT JOIN [ApplicationUsers] creator
                                   ON creator.Id = f.CreatedBy

                         LEFT JOIN [PartialFileInfos] pfi
                                   ON pfi.FileId = f.Id
                WHERE
                    (
                        f.FileStatus = 0
                            OR (f.FileStatus = 1 AND f.CreatedBy = @userId)
                        );
            go");
            
        migrationBuilder.Sql(
                @"CREATE OR ALTER FUNCTION GetSharedFilesSubtreeForUserTVF (@userId INT, @parentId INT)
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
                                         SELECT
                                             f.Id,
                                             f.UserId,
                                             f.ParentId,
                                             f.FileName,
                                             f.MimeType,
                                             f.Size,
                                             f.IsDirectory,
                                             f.FileGuid,
                                             f.FileStatus,
                                             f.CreatedBy,
                            
                                             es.ShareId,
                                             es.AccessMode,
                                             es.ValidUntil,
                                             es.ShareCreatedBy,
                                             0 AS Depth
                                         FROM ExplicitShares es
                                                  INNER JOIN [File] f ON f.Id = es.SourceFileId
                            
                                         UNION ALL
                            
                                         SELECT
                                             f.Id,
                                             f.UserId,
                                             f.ParentId,
                                             f.FileName,
                                             f.MimeType,
                                             f.Size,
                                             f.IsDirectory,
                                             f.FileGuid,
                                             f.FileStatus,
                                             f.CreatedBy,
                            
                                             it.ShareId,
                                             it.AccessMode,
                                             it.ValidUntil,
                                             it.ShareCreatedBy,
                            
                                             it.Depth + 1
                                         FROM [File] f
                                                  INNER JOIN InheritedTree it ON f.ParentId = it.Id
                            
                                     ),
                                 RankedPermissions AS
                                     (
                                         SELECT *,
                                                ROW_NUMBER() OVER (PARTITION BY Id ORDER BY Depth) AS RN
                                         FROM InheritedTree
                                     ),
                                SubTree AS
                                     (
                                         SELECT rp.Id
                                         FROM RankedPermissions rp
                                         WHERE rp.RN = 1
                                           AND rp.Id = @parentId
                            
                                         UNION ALL
                            
                                         SELECT child.Id
                                         FROM RankedPermissions child
                                                  INNER JOIN SubTree st ON child.ParentId = st.Id
                                         WHERE child.RN = 1
                                     )
                            SELECT
                                rp.Id,
                                rp.UserId,
                                rp.ParentId,
                                rp.FileName,
                                rp.MimeType,
                                rp.Size,
                                rp.IsDirectory,
                                rp.FileGuid,
                                rp.CreatedBy AS FileCreatedBy,
                                creator.UserName      AS FileCreatedByUserName,
                                creator.EmailAddress  AS FileCreatedByEmail,
                                rp.FileStatus,
                                p.Id AS PartialFileInfoId,
                                p.FileSize AS UploadFileSize,
                                p.ChunkSize,
                                p.PersistenceMap,
                                rp.AccessMode,
                                rp.ValidUntil,
                                sharer.UserName AS SharedUserName,
                                CAST(IIF(rp.Depth = 0, 0, 1) AS bit) AS IsInherited
                            FROM RankedPermissions rp
                            INNER JOIN [ApplicationUsers] sharer
                                ON sharer.Id = rp.ShareCreatedBy
                            LEFT JOIN [ApplicationUsers] creator
                                ON creator.Id = rp.CreatedBy
                            LEFT JOIN [PartialFileInfos] p
                                ON p.FileId = rp.Id
                            WHERE
                                rp.RN = 1
                                AND (
                                    rp.FileStatus = 0
                                    OR (rp.FileStatus = 1 AND rp.CreatedBy = @userId)
                                )
                                AND (
                                    @parentId IS NULL
                                    OR (
                                        rp.Id IN (SELECT Id FROM SubTree)
                                        AND rp.Id <> @parentId
                                    )
                                );
                go
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_File_ApplicationUsers_CreatedBy",
                table: "File");

            migrationBuilder.DropIndex(
                name: "IX_File_CreatedBy",
                table: "File");
            
            migrationBuilder.Sql(
                @"CREATE OR ALTER FUNCTION GetListOfAllSharedFilesForUserTVF (@userId INT, @parentId INT)
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
                                 SELECT
                                     f.Id,
                                     f.UserId,
                                     f.ParentId,
                                     f.FileName,
                                     f.MimeType,
                                     f.Size,
                                     f.IsDirectory,
                                     f.FileGuid,
                                     f.FileStatus,
                                     f.CreatedBy,

                                     es.ShareId,
                                     es.AccessMode,
                                     es.ValidUntil,
                                     es.ShareCreatedBy,
                                     0 AS Depth
                                 FROM ExplicitShares es
                                          INNER JOIN [File] f ON f.Id = es.SourceFileId

                                 UNION ALL

                                 SELECT
                                     f.Id,
                                     f.UserId,
                                     f.ParentId,
                                     f.FileName,
                                     f.MimeType,
                                     f.Size,
                                     f.IsDirectory,
                                     f.FileGuid,
                                     f.FileStatus,
                                     f.CreatedBy,

                                     it.ShareId,
                                     it.AccessMode,
                                     it.ValidUntil,
                                     it.ShareCreatedBy,

                                     it.Depth + 1
                                 FROM [File] f
                                          INNER JOIN InheritedTree it ON f.ParentId = it.Id

                             ),
                         RankedPermissions AS
                             (
                                 SELECT *,
                                        ROW_NUMBER() OVER (PARTITION BY Id ORDER BY Depth) AS RN
                                 FROM InheritedTree
                             )
                    SELECT
                        rp.Id,
                        rp.UserId,
                        rp.ParentId,
                        rp.FileName,
                        rp.MimeType,
                        rp.Size,
                        rp.IsDirectory,
                        rp.FileGuid,
                        rp.CreatedBy        AS FileCreatedBy,
                        rp.FileStatus,

                        p.Id AS PartialFileInfoId,
                        p.FileSize AS UploadFileSize,
                        p.ChunkSize,
                        p.PersistenceMap,

                        rp.AccessMode,
                        rp.ValidUntil,
                        u.UserName          AS SharedUserName,
                        CAST(IIF(rp.Depth = 0, 0, 1) AS bit) AS IsInherited
                    FROM RankedPermissions rp
                             INNER JOIN [ApplicationUsers] u ON u.Id = rp.ShareCreatedBy
                             LEFT JOIN [PartialFileInfos] p  ON p.FileId = rp.Id
                    WHERE
                        rp.RN = 1
                      AND (
                        rp.FileStatus = 0 OR (rp.FileStatus = 1 AND rp.CreatedBy = @userId)
                        )
                      AND (
                        (@parentId IS NULL AND rp.Depth = 0)
                            OR rp.ParentId = @parentId
                        );
                go
            ");
            
            migrationBuilder.Sql(
                @"CREATE OR ALTER FUNCTION GetSharedFileTVF (@userId INT, @fileId INT)
                RETURNS TABLE AS
                    RETURN
                    WITH PathCTE AS
                 (
                     SELECT
                         f.Id,
                         f.UserId,
                         f.ParentId,
                         f.FileName,
                         f.MimeType,
                         f.Size,
                         f.IsDirectory,
                         f.FileGuid,
                         f.FileStatus,
                         f.CreatedBy,
                         0 AS Depth
                     FROM [File] f
                     WHERE f.Id = @fileId
                     
                     UNION ALL

                    SELECT
                        p.Id,
                        p.UserId,
                        p.ParentId,
                        p.FileName,
                        p.MimeType,
                        p.Size,
                        p.IsDirectory,
                        p.FileGuid,
                        p.FileStatus,
                        p.CreatedBy,
                        c.Depth + 1
                    FROM [File] p
                             INNER JOIN PathCTE c ON c.ParentId = p.Id
                ),
                                 PathWithShares AS
                                     (
                                         SELECT
                                             p.*,
                                             s.Id AS ShareId,
                                             s.AccessMode,
                                             s.ValidUntil,
                                             s.CreatedBy AS ShareCreatedBy
                                         FROM PathCTE p
                                                  LEFT JOIN [Share] s
                                                            ON s.FileId = p.Id
                                                                AND s.SharedWithUserId = @userId
                                                                AND (s.ValidUntil IS NULL OR s.ValidUntil > SYSUTCDATETIME())
                                                                AND s.RevokedAt IS NULL
                                     ),
                                 EffectiveShare AS
                                     (
                                         SELECT TOP 1 *
                                         FROM PathWithShares
                                         WHERE ShareId IS NOT NULL
                                         ORDER BY Depth
                                     )
                SELECT
                    f.Id,
                    f.UserId,
                    f.ParentId,
                    f.FileName,
                    f.MimeType,
                    f.Size,
                    f.IsDirectory,
                    f.FileGuid,
                    f.CreatedBy        AS FileCreatedBy,
                    f.FileStatus,
                
                    pfi.Id             AS PartialFileInfoId,
                    pfi.FileSize       AS UploadFileSize,
                    pfi.ChunkSize,
                    pfi.PersistenceMap,
                
                    es.AccessMode,
                    es.ValidUntil,
                    u.UserName         AS SharedUserName,
                    CAST(IIF(f.Id = es.Id, 0, 1) AS bit) AS IsInherited
                FROM EffectiveShare es
                         INNER JOIN PathWithShares f ON f.Id = @fileId
                    INNER JOIN [ApplicationUsers] u ON u.Id = es.ShareCreatedBy
                    LEFT JOIN [PartialFileInfos] pfi ON pfi.FileId = f.Id
                WHERE
                    (
                    f.FileStatus = 0
                   OR (f.FileStatus = 1 AND f.CreatedBy = @userId)
                    );
            go");
            
            migrationBuilder.Sql(
                @"CREATE OR ALTER FUNCTION GetSharedFilesSubtreeForUserTVF (@userId INT, @parentId INT)
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
                                         SELECT
                                             f.Id,
                                             f.UserId,
                                             f.ParentId,
                                             f.FileName,
                                             f.MimeType,
                                             f.Size,
                                             f.IsDirectory,
                                             f.FileGuid,
                                             f.FileStatus,
                                             f.CreatedBy,
                           
                                             es.ShareId,
                                             es.AccessMode,
                                             es.ValidUntil,
                                             es.ShareCreatedBy,
                                             0 AS Depth
                                         FROM ExplicitShares es
                                                  INNER JOIN [File] f ON f.Id = es.SourceFileId
                            
                                         UNION ALL
                            
                                         SELECT
                                             f.Id,
                                             f.UserId,
                                             f.ParentId,
                                             f.FileName,
                                             f.MimeType,
                                             f.Size,
                                             f.IsDirectory,
                                             f.FileGuid,
                                             f.FileStatus,
                                             f.CreatedBy,
                            
                                             it.ShareId,
                                             it.AccessMode,
                                             it.ValidUntil,
                                             it.ShareCreatedBy,
                            
                                             it.Depth + 1
                                         FROM [File] f
                                                  INNER JOIN InheritedTree it ON f.ParentId = it.Id
                            
                                     ),
                                 RankedPermissions AS
                                     (
                                         SELECT *,
                                                ROW_NUMBER() OVER (PARTITION BY Id ORDER BY Depth) AS RN
                                         FROM InheritedTree
                                     ),
                                SubTree AS
                                     (
                                         SELECT rp.Id
                                         FROM RankedPermissions rp
                                         WHERE rp.RN = 1
                                           AND rp.Id = @parentId
                            
                                         UNION ALL
                            
                                         SELECT child.Id
                                         FROM RankedPermissions child
                                                  INNER JOIN SubTree st ON child.ParentId = st.Id
                                         WHERE child.RN = 1
                                     )
                            SELECT
                                rp.Id,
                                rp.UserId,
                                rp.ParentId,
                                rp.FileName,
                                rp.MimeType,
                                rp.Size,
                                rp.IsDirectory,
                                rp.FileGuid,
                                rp.CreatedBy        AS FileCreatedBy,
                                rp.FileStatus,
                            
                                p.Id AS PartialFileInfoId,
                                p.FileSize AS UploadFileSize,
                                p.ChunkSize,
                                p.PersistenceMap,
                            
                                rp.AccessMode,
                                rp.ValidUntil,
                                u.UserName          AS SharedUserName,
                                CAST(IIF(rp.Depth = 0, 0, 1) AS bit) AS IsInherited
                            FROM RankedPermissions rp
                                     INNER JOIN [ApplicationUsers] u ON u.Id = rp.ShareCreatedBy
                                     LEFT JOIN [PartialFileInfos] p  ON p.FileId = rp.Id
                            WHERE
                                rp.RN = 1
                              AND (
                                rp.FileStatus = 0
                                    OR (rp.FileStatus = 1 AND rp.CreatedBy = @userId)
                                )
                              AND (
                                @parentId IS NULL
                                    OR (
                                    rp.Id IN (SELECT Id FROM SubTree)
                                        AND rp.Id <> @parentId
                                    )
                                )
                go
                ");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace webFileSharingSystem.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CreateAndUpdateTvfQueries : Migration
    {
 protected override void Up(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.Sql(@"
                CREATE OR ALTER FUNCTION GetSharedFilePathParts (@userId INT, @fileId INT)
                    RETURNS TABLE AS
                        RETURN
                        WITH PathCTE AS
                         (
                             SELECT
                                 f.Id,
                                 f.FileName,
                                 f.ParentId,
                                 0 AS Depth
                             FROM [File] f
                             WHERE f.Id = @fileId

                             UNION ALL
                        
                                SELECT
                                    p.Id,
                                    p.FileName,
                                    p.ParentId,
                                    c.Depth + 1
                                FROM [File] p
                                         INNER JOIN PathCTE c ON c.ParentId = p.Id
                            ),
                            PathWithShares AS
                             (
                                 SELECT
                                     p.Id,
                                     p.FileName,
                                     p.ParentId,
                                     p.Depth,
                                     s.Id AS ShareId,
                                     s.AccessMode,
                                     s.ValidUntil
                                 FROM PathCTE p
                                          LEFT JOIN [Share] s
                                                    ON s.FileId = p.Id
                                                        AND s.SharedWithUserId = @userId
                                                        AND (s.ValidUntil IS NULL OR s.ValidUntil > SYSUTCDATETIME())
                                                        AND s.RevokedAt IS NULL
                             ),
                             ShareRoot AS
                                 (
                                     -- FARTHEST explicit share (breadcrumb root)
                                     SELECT TOP 1 *
                                     FROM PathWithShares
                                     WHERE ShareId IS NOT NULL
                                     ORDER BY Depth DESC
                                 ),
                             MaxDepth AS
                                 (
                                     SELECT MAX(Depth) AS MaxDepth
                                     FROM PathCTE
                                 )
                            SELECT
                                p.Id,
                                p.FileName,
                                (md.MaxDepth - p.Depth) + 1 AS [Level],
                                eff.AccessMode,
                                eff.ValidUntil
                            FROM PathWithShares p
                                     CROSS APPLY
                                 (
                                     -- nearest explicit share ABOVE or AT this node
                                     SELECT TOP 1
                                         s.AccessMode,
                                         s.ValidUntil
                                     FROM PathWithShares s
                                     WHERE
                                         s.ShareId IS NOT NULL
                                       AND s.Depth >= p.Depth
                                     ORDER BY s.Depth
                                 ) eff
                                     CROSS JOIN MaxDepth md
                            WHERE
                                p.Depth <= (SELECT Depth FROM ShareRoot);
                go");

            migrationBuilder.Sql(@"
                CREATE OR ALTER FUNCTION GetFilePathParts (@fileId INT)
                    RETURNS TABLE AS
                        RETURN
                        WITH PathCTE AS
                         (
                             SELECT
                                 f.Id,
                                 f.FileName,
                                 f.ParentId,
                                 0 AS Depth
                             FROM [File] f
                             WHERE f.Id = @fileId

                             UNION ALL

                            SELECT
                                p.Id,
                                p.FileName,
                                p.ParentId,
                                c.Depth + 1
                            FROM [File] p
                                     INNER JOIN PathCTE c ON c.ParentId = p.Id
                        ), MaxDepth AS
                        (
                            SELECT MAX(Depth) AS MaxDepth
                            FROM PathCTE
                        )
                        SELECT
                            p.Id,
                            p.FileName,
                            (md.MaxDepth - p.Depth) + 1 AS [Level],
                            NULL AS AccessMode,
                            NULL AS ValidUntil
                        FROM PathCTE p
                                 CROSS JOIN MaxDepth md;
                go");

            migrationBuilder.Sql(@"
                CREATE OR ALTER FUNCTION GetDescendantActiveRefreshTokens (@refreshToken nvarchar(100))
                    RETURNS TABLE AS
                        RETURN
                        WITH recursive_cte AS
                                 (
                                     SELECT *
                                     FROM [RefreshToken] WHERE [Token] = @refreshToken
                                     UNION All
                        SELECT [t].*
                        FROM [RefreshToken] AS [t]
                                 INNER JOIN recursive_cte AS [cte] ON [t].[Token] = [cte].[ReplacedByToken]
                        )
                        SELECT * FROM recursive_cte WHERE [Revoked] IS NULL 
                go");

            migrationBuilder.Sql(@"
                CREATE OR ALTER FUNCTION GetParentFiles (@fileId int)
                    RETURNS TABLE AS
                        RETURN
                        WITH recursive_cte AS
                                 (
                                     SELECT *
                                     FROM [File] WHERE Id = @fileId
                                     UNION ALL
                        SELECT [f].*
                        FROM [File] AS [f]
                                 INNER JOIN recursive_cte AS [cte] ON [cte].[ParentId] = [f].[Id]
                    )
                    SELECT * FROM recursive_cte
                go");

            migrationBuilder.Sql(@"
                CREATE OR ALTER FUNCTION GetChildrenAsFiles (@fileId int)
                    RETURNS TABLE AS
                        RETURN
                        WITH recursive_cte AS
                                 (
                                     SELECT *
                                     FROM [File] WHERE Id = @fileId
                                     UNION All
                        SELECT [f].*
                        FROM [File] AS [f]
                                 INNER JOIN recursive_cte AS [cte] ON [f].[ParentId] = [cte].[Id]
                    )
                    SELECT * FROM recursive_cte
                go");

            migrationBuilder.Sql(@"
                CREATE OR ALTER FUNCTION GetSharedFileAccessMode (@userId int, @fileId int)
                    RETURNS TABLE AS
                        RETURN
                        WITH recursive_cte AS
                                 (
                                     SELECT [Id], [ParentId], 0 AS [level]
                                     FROM [File] WHERE Id = @fileId
                                     UNION ALL
                        SELECT [F].[Id], [F].[ParentId], [cte].[level] + 1
                        FROM [File] AS [F]
                                 INNER JOIN recursive_cte AS [cte] ON [cte].[ParentId] = [F].[Id]
                        )
                        SELECT TOP(1) [S].[Id], [S].[AccessMode] FROM recursive_cte AS [cte]
                                                                          INNER JOIN [Share] AS [S]
                                                                                     ON [S].[FileId] = [cte].[Id]
                        WHERE ([S].[ValidUntil] > SYSUTCDATETIME() or [S].[ValidUntil] is null) AND [S].[SharedWithUserId] = @userId
                        ORDER BY [cte].[level]
                go");


        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE OR ALTER FUNCTION GetListOfAllSharedFilesForUserTVF (@userId INT, @parentId INT)
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
                AND [cte].[ValidUntil] > SYSUTCDATETIME()"
            );            
            
            migrationBuilder.Sql(@"
                DROP FUNCTION GetSharedFileTVF"
            );            
            
            migrationBuilder.Sql(@"
                DROP FUNCTION GetSharedFilePathParts"
            );            
            
            migrationBuilder.Sql(@"
                DROP FUNCTION GetFilePathParts"
            );

            migrationBuilder.Sql(@"
                DROP FUNCTION GetDescendantActiveRefreshTokens"
            );  
            
            migrationBuilder.Sql(@"
                DROP FUNCTION GetParentFiles"
            );            
            
            migrationBuilder.Sql(@"
                DROP FUNCTION GetChildrenAsFiles"
            );       
            
            migrationBuilder.Sql(@"
                DROP FUNCTION GetSharedFileAccessMode"
            );
        }
    }
}

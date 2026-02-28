using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace webFileSharingSystem.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateFileAndSharedFileEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Share_FileId",
                table: "Share");

            migrationBuilder.DropIndex(
                name: "IX_Share_SharedWithUserId",
                table: "Share");

            migrationBuilder.CreateIndex(
                name: "IX_Share_FileId_SharedWithUserId",
                table: "Share",
                columns: new[] { "FileId", "SharedWithUserId" },
                unique: true,
                filter: "[RevokedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Share_SharedWithUserId",
                table: "Share",
                column: "SharedWithUserId",
                filter: "[RevokedAt] IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Share_FileId_SharedWithUserId",
                table: "Share");

            migrationBuilder.DropIndex(
                name: "IX_Share_SharedWithUserId",
                table: "Share");
            
            migrationBuilder.CreateIndex(
                name: "IX_Share_FileId",
                table: "Share",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_Share_SharedWithUserId",
                table: "Share",
                column: "SharedWithUserId");
        }
    }
}

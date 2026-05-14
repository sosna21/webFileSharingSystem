using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace webFileSharingSystem.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class FileNameUniquenessConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_File_UserId",
                table: "File");

            migrationBuilder.AlterColumn<string>(
                name: "FileName",
                table: "File",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_File_UserId_ParentId_FileName",
                table: "File",
                columns: new[] { "UserId", "ParentId", "FileName" },
                unique: true,
                filter: "[ParentId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_File_UserId_ParentId_FileName",
                table: "File");

            migrationBuilder.AlterColumn<string>(
                name: "FileName",
                table: "File",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.CreateIndex(
                name: "IX_File_UserId",
                table: "File",
                column: "UserId");
        }
    }
}

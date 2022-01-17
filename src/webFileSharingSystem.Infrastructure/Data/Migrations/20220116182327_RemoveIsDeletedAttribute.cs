using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace webFileSharingSystem.Infrastructure.Data.Migrations
{
    public partial class RemoveIsDeletedAttribute : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "File");

            migrationBuilder.RenameColumn(
                name: "FileId",
                table: "File",
                newName: "FileGuid");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "FileGuid",
                table: "File",
                newName: "FileId");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "File",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}

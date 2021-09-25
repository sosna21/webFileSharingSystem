using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace webFileSharingSystem.Infrastructure.Data.Migrations
{
    public partial class ModifyFileEntity : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FileId",
                table: "File",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ParentId",
                table: "File",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_File_ParentId",
                table: "File",
                column: "ParentId",
                unique: true,
                filter: "[ParentId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_File_File_ParentId",
                table: "File",
                column: "ParentId",
                principalTable: "File",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_File_File_ParentId",
                table: "File");

            migrationBuilder.DropIndex(
                name: "IX_File_ParentId",
                table: "File");

            migrationBuilder.DropColumn(
                name: "FileId",
                table: "File");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "File");
        }
    }
}

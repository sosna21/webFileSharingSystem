using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace webFileSharingSystem.Infrastructure.Data.Migrations
{
    public partial class AddFileStatusAndParialFileInfo : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FileStatus",
                table: "File",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "PartialFileInfos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    ChunkSize = table.Column<int>(type: "int", nullable: false),
                    PersistenceMap = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                    FileId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartialFileInfos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PartialFileInfos_File_FileId",
                        column: x => x.FileId,
                        principalTable: "File",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PartialFileInfos_FileId",
                table: "PartialFileInfos",
                column: "FileId",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PartialFileInfos");

            migrationBuilder.DropColumn(
                name: "FileStatus",
                table: "File");
        }
    }
}

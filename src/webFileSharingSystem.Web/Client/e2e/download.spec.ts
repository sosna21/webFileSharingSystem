import { test, expect } from './fixtures/authenticated-fixture';
import { createFolderStructure, createTempFile } from './helpers/test-files';
import { UserFilesTable } from './pages/user-files-table.part';
import { UserFilesContextMenu } from './pages/user-files-context-menu.part';
import { UploadButtons } from './pages/upload-buttons.part';
import { captureDownload, readDownloadBuffer } from './helpers/downloads';

test.describe('Download Flow', () => {
  test('Single file download', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const menu = new UserFilesContextMenu(page);
    const uploadButtons = new UploadButtons(page);

    const fileName = `download-sample-${testInfo.parallelIndex}.txt`;
    const content = 'sample-download-content-' + crypto.randomUUID();

    const filePath = await createTempFile(testInfo, fileName, content);
    await uploadButtons.uploadFiles(filePath);

    await expect(table.fileRowByName(fileName)).toBeVisible({ timeout: 15000 });

    await table.openContextMenuForRow(fileName);

    const download = await captureDownload(page, async () => {
      await menu.downloadSelection();
    });

    expect(download.suggestedFilename()).toBeTruthy();
    const buf = await readDownloadBuffer(download);

    expect(buf.toString()).toContain(content);
  });

  test('Multiple file ZIP download', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const menu = new UserFilesContextMenu(page);
    const uploadButtons = new UploadButtons(page);

    const files = [
      `zip-file-1-${testInfo.parallelIndex}.txt`,
      `zip-file-2-${testInfo.parallelIndex}.txt`,
      `zip-file-3-${testInfo.parallelIndex}.txt`,
    ];

    const filePaths = await Promise.all(
      files.map(async (f) => await createTempFile(testInfo, f, `content-${f}`)),
    );
    await uploadButtons.uploadFiles(filePaths);
    await Promise.all(
      files.map((f) =>
        expect(table.fileRowByName(f)).toBeVisible({ timeout: 15000 }),
      ),
    );

    // Select multiple rows (Ctrl+click)
    await table.selectRowsCtrl(files);

    const download = await captureDownload(page, async () => {
      // Open context menu on one of selected rows
      await table.fileRowByName(files[0]).click({ button: 'right' });
      await menu.downloadSelection();
    });

    const suggested = download.suggestedFilename();
    expect(suggested).toBeTruthy();
    expect(suggested!.toLowerCase().endsWith('.zip')).toBeTruthy();

    const buf = await readDownloadBuffer(download);
    expect(buf.length).toBeGreaterThan(0);

    // Basic ZIP check: filenames should be present in the archive binary
    for (const f of files) {
      expect(buf.includes(Buffer.from(f))).toBeTruthy();
    }
  });

  test('Folder download', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const menu = new UserFilesContextMenu(page);
    const uploadButtons = new UploadButtons(page);

    const rootFolder = `download-folder-${testInfo.parallelIndex}`;
    const nestedFolder = 'nested';
    const nestedFile = 'nested-file.txt';
    const rootFile = 'root-file.txt';

    const folderPath = await createFolderStructure(testInfo, rootFolder, [
      { path: rootFile, content: `root-content-${crypto.randomUUID()}` },
      {
        path: `${nestedFolder}/${nestedFile}`,
        content: `nested-content-${crypto.randomUUID()}`,
      },
    ]);

    await uploadButtons.uploadFolder(folderPath);

    await expect(table.fileRowByName(rootFolder)).toBeVisible({
      timeout: 15000,
    });

    await table.openContextMenuForRow(rootFolder);

    const download = await captureDownload(page, async () => {
      await menu.downloadSelection();
    });

    const suggested = download.suggestedFilename();
    expect(suggested).toBeTruthy();
    expect(suggested!.toLowerCase().endsWith('.zip')).toBeTruthy();

    const buf = await readDownloadBuffer(download);
    expect(buf.length).toBeGreaterThan(0);

    expect(buf.includes(Buffer.from(rootFolder))).toBeTruthy();
    expect(buf.includes(Buffer.from(rootFile))).toBeTruthy();
    expect(buf.includes(Buffer.from(nestedFolder))).toBeTruthy();
    expect(buf.includes(Buffer.from(nestedFile))).toBeTruthy();
  });
});

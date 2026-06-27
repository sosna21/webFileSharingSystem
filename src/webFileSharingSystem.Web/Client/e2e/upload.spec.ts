import { test, expect } from './fixtures/authenticated-fixture';
import { dragDropEntries, startDragDropEntries } from './helpers/drag-drop';
import { createDirectoryName, createFileName } from './helpers/file-names';
import { createFolderStructure, createTempFile } from './helpers/test-files';
import { getUniqueName } from './helpers/unique-name';
import { UploadButtons } from './pages/upload-buttons.part';
import { UserFilesTable } from './pages/user-files-table.part';

const multiChunkContentSize = 'a'.repeat(100 * 1024 * 1024); // 100MB, ensures chunked upload
const singleChunkContentSize = 'a'.repeat(512); // 512B

test.describe('Upload Flow', () => {
  test('Single file upload via picker', async ({
    authenticatedPage,
  }, testInfo) => {
    const page = authenticatedPage;
    const fileName = createFileName(testInfo, 'upload');

    const uploadButtons = new UploadButtons(page);
    const table = new UserFilesTable(page);

    const filePath = await createTempFile(
      testInfo,
      fileName,
      singleChunkContentSize,
    );
    await uploadButtons.uploadFiles(filePath);

    await expect(table.fileRowByName(fileName)).toBeVisible();
  });

  test('Folder upload via picker keeps structure', async ({
    authenticatedPage,
  }, testInfo) => {
    const page = authenticatedPage;
    const rootFolder = createDirectoryName(testInfo, 'folder');
    const nestedFolder = 'nested';
    const nestedFile = 'nested-file.txt';
    const rootFile = 'root-file.txt';

    const uploadButtons = new UploadButtons(page);
    const table = new UserFilesTable(page);

    const folderPath = await createFolderStructure(testInfo, rootFolder, [
      { path: rootFile, content: singleChunkContentSize },
      {
        path: `${nestedFolder}/${nestedFile}`,
        content: singleChunkContentSize,
      },
    ]);

    await uploadButtons.uploadFolder(folderPath);

    await expect(table.fileRowByName(rootFolder)).toBeVisible();
    await table.openFolder(rootFolder);

    await expect(table.fileRowByName(rootFile)).toBeVisible();
    await expect(table.fileRowByName(nestedFolder)).toBeVisible();

    await table.openFolder(nestedFolder);
    await expect(table.fileRowByName(nestedFile)).toBeVisible();
  });

  test('Drag and drop mixed files and folders', async ({
    authenticatedPage,
  }, testInfo) => {
    const page = authenticatedPage;
    const mixedFile = createFileName(testInfo, 'drag-file');
    const folderName = createDirectoryName(testInfo, 'drag-folder');
    const nestedFile = 'inside.txt';

    const table = new UserFilesTable(page);

    await dragDropEntries(page, table.dropArea, [
      { path: mixedFile, content: singleChunkContentSize },
      { path: `${folderName}/${nestedFile}`, content: singleChunkContentSize },
    ]);

    await expect(table.fileRowByName(mixedFile)).toBeVisible();
    await expect(table.fileRowByName(folderName)).toBeVisible();

    await table.openFolder(folderName);
    await expect(table.fileRowByName(nestedFile)).toBeVisible();
  });

  test('Cross-method consistency uses unique names', async ({
    authenticatedPage,
  }, testInfo) => {
    const page = authenticatedPage;
    const fileName = createFileName(testInfo, 'duplicate');

    const uploadButtons = new UploadButtons(page);
    const table = new UserFilesTable(page);

    const filePath = await createTempFile(
      testInfo,
      fileName,
      singleChunkContentSize,
    );
    await uploadButtons.uploadFiles(filePath);

    await dragDropEntries(page, table.dropArea, [
      { path: fileName, content: singleChunkContentSize },
    ]);

    const expectedDuplicate = getUniqueName(new Set([fileName]), fileName);

    await expect(table.fileRowByName(fileName)).toBeVisible();
    await expect(table.fileRowByName(expectedDuplicate)).toBeVisible();
  });

  test('Shows upload overlay when dragging external files', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    const table = new UserFilesTable(page);

    const drag = await startDragDropEntries(page, table.dropArea, [
      { path: 'file.txt', content: 'abc' },
      { path: 'file2.txt', content: 'abcd' },
    ]);

    await expect(table.uploadOverlay).toBeVisible();
    await expect(table.uploadOverlay).toHaveText('Upload 2 file(s) here');

    await drag.drop();

    await expect(table.uploadOverlay).toBeHidden();
  });

  test('File upload with chunking', async ({
    authenticatedPage,
    browserName,
  }, testInfo) => {
    test.skip(
      browserName === 'webkit',
      'Chunked uploads are not reliable in WebKit Playwright',
    );

    const page = authenticatedPage;
    const fileName = createFileName(testInfo, 'chunking');

    const uploadButtons = new UploadButtons(page);
    const table = new UserFilesTable(page);

    const filePath = await createTempFile(
      testInfo,
      fileName,
      multiChunkContentSize,
    );
    await uploadButtons.uploadFiles(filePath);

    await table.uploadRowByName(fileName).waitForVisible();
    await expect(table.fileRowByName(fileName)).toBeVisible();
  });

  test('Pauses progress when clicking pause and resumes when clicking resume', async ({
    authenticatedPage,
    browserName,
  }, testInfo) => {
    test.skip(
      browserName === 'webkit',
      'Chunked uploads are not reliable in WebKit Playwright',
    );

    const page = authenticatedPage;
    const fileName = createFileName(testInfo, 'pause-resume');

    const uploadButtons = new UploadButtons(page);
    const table = new UserFilesTable(page);

    const filePath = await createTempFile(
      testInfo,
      fileName,
      multiChunkContentSize,
    );

    await uploadButtons.uploadFiles(filePath);

    const uploadRow = table.uploadRowByName(fileName);
    await uploadRow.waitForVisible();
    await uploadRow.waitForProgressGreaterThan(0);
    await uploadRow.pause();
    await uploadRow.waitForPaused();

    const pausedProgress = await uploadRow.getProgress();
    await uploadRow.waitForStableProgress();
    expect(await uploadRow.getProgress()).toBe(pausedProgress);

    await uploadRow.resume();
    await uploadRow.waitForUploading();
    await uploadRow.waitForProgressGreaterThan(pausedProgress);

    await uploadRow.waitForCompletion();
    await uploadRow.waitForHidden();
    await expect(table.fileRowByName(fileName)).toBeVisible();
  });
});

import { test, expect } from './fixtures/authenticated-fixture';
import { dragDropEntries, startDragDropEntries } from './helpers/drag-drop';
import { createFolderStructure, createTempFile } from './helpers/test-files';
import { getUniqueName } from './helpers/unique-name';
import { UploadButtons } from './pages/upload-buttons.part';
import { UserFilesTable } from './pages/user-files-table.part';

const multiChunkContentSize = 'a'.repeat(15 * 1024 * 1024); // 15MB, ensures chunked upload
const singleChunkContentSize = 'a'.repeat(512); // 512B

function buildUnique(testSuffix: string, prefix: string) {
  return `${prefix}-${Date.now()}-${testSuffix}`;
}

test.describe('Upload Flow', () => {
  test('single file upload via picker', async ({
    authenticatedPage,
  }, testInfo) => {
    const page = authenticatedPage;
    const suffix = `${testInfo.parallelIndex}`;
    const fileName = `${buildUnique(suffix, 'upload')}.txt`;

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

  test('folder upload via picker keeps structure', async ({
    authenticatedPage,
  }, testInfo) => {
    const page = authenticatedPage;
    const suffix = `${testInfo.parallelIndex}`;
    const rootFolder = buildUnique(suffix, 'folder');
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

  test('drag and drop mixed files and folders', async ({
    authenticatedPage,
  }, testInfo) => {
    const page = authenticatedPage;
    const suffix = `${testInfo.parallelIndex}`;
    const mixedFile = `${buildUnique(suffix, 'drag-file')}.txt`;
    const folderName = buildUnique(suffix, 'drag-folder');
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

  test('cross-method consistency uses unique names', async ({
    authenticatedPage,
  }, testInfo) => {
    const page = authenticatedPage;
    const suffix = `${testInfo.parallelIndex}`;
    const fileName = `${buildUnique(suffix, 'duplicate')}.txt`;

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

  test('shows upload overlay when dragging external files', async ({
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

  test('file upload with chunking', async ({
    authenticatedPage,
    browserName,
  }, testInfo) => {
    test.skip(
      browserName === 'webkit',
      'Chunked uploads are not reliable in WebKit Playwright',
    );

    const page = authenticatedPage;
    const suffix = `${testInfo.parallelIndex}`;
    const fileName = `${buildUnique(suffix, 'chunking')}.txt`;

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

  test('pauses progress when clicking pause and resumes when clicking resume', async ({
    authenticatedPage,
    browserName,
  }, testInfo) => {
    test.skip(
      browserName === 'webkit',
      'Chunked uploads are not reliable in WebKit Playwright',
    );

    const page = authenticatedPage;
    const suffix = `${testInfo.parallelIndex}`;
    const fileName = `${buildUnique(suffix, 'pause-resume')}.txt`;

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

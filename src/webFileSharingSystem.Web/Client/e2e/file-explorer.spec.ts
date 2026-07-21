import { expect, test } from './fixtures/authenticated-fixture';
import { createDirectoryName, createFileName } from './helpers/file-names';
import { FileActionsStrip } from './pages/file-actions-strip.part';
import { UserFilesTable } from './pages/user-files-table.part';
import { Breadcrumb } from './pages/breadcrumb.part';
import { UserFilesContextMenu } from './pages/user-files-context-menu.part';
import { SearchBar } from './pages/search-bar.part';
import { UploadButtons } from './pages/upload-buttons.part';
import { ToastNotification } from './pages/toast-notifications.part';
import { createTempFile } from './helpers/test-files';
import { dragDropEntries } from './helpers/drag-drop';
import { Page, TestInfo } from '@playwright/test';

const HOME = 'Home';
const SEARCH_RESULTS = 'Search result';

async function uploadTestFiles(page: Page, testInfo: TestInfo) {
  const uploadButtons = new UploadButtons(page);
  const notifications = new ToastNotification(page);

  const files = [];
  for (let i = 0; i < 3; i++) {
    const fileName = createFileName(testInfo, `file${i + 1}`);
    files.push({
      fileName,
      filePath: await createTempFile(testInfo, fileName, `content ${i}`),
    });
  }

  await uploadButtons.uploadFiles(files.map((f) => f.filePath));
  await notifications.expectUploadCompleted();
  return files.map((f) => f.fileName);
}

test.describe('Navigation', () => {
  test('Navigate nested folders', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const breadcrumb = new Breadcrumb(page);
    const fileActionsStrip = new FileActionsStrip(page);

    const folder = createDirectoryName(testInfo, 'folder');
    const nestedFolder = createDirectoryName(testInfo, 'nested');

    await fileActionsStrip.createDirectory(folder);

    await expect(table.fileRowByName(folder)).toBeVisible();
    await table.openFolder(folder);
    await breadcrumb.expectPath([HOME, folder]);

    await fileActionsStrip.createDirectory(nestedFolder);
    await expect(table.fileRowByName(nestedFolder)).toBeVisible();
    await table.openContextMenuForRow(nestedFolder);
    const contextMenu = new UserFilesContextMenu(page);
    await contextMenu.openDirectory();

    await breadcrumb.expectPath([HOME, folder, nestedFolder]);
  });

  test('Navigate using breadcrumbs', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const breadcrumb = new Breadcrumb(page);
    const fileActionsStrip = new FileActionsStrip(page);

    const folder = createDirectoryName(testInfo, 'folder');
    const nestedFolder = createDirectoryName(testInfo, 'nested');

    await fileActionsStrip.createDirectory(folder);

    await expect(table.fileRowByName(folder)).toBeVisible();
    await table.openFolder(folder);

    await fileActionsStrip.createDirectory(nestedFolder);
    await expect(table.fileRowByName(nestedFolder)).toBeVisible();
    await table.openFolder(nestedFolder);
    await breadcrumb.expectPath([HOME, folder, nestedFolder]);

    await breadcrumb.navigateTo(folder);
    await expect(table.fileRowByName(nestedFolder)).toBeVisible();
    await breadcrumb.expectPath([HOME, folder]);
  });
});

test.describe('Search', () => {
  test('Search by file name', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const breadcrumb = new Breadcrumb(page);
    const searchBar = new SearchBar(page);

    const fileNames = await uploadTestFiles(page, testInfo);
    await table.expectVisibleFiles(...fileNames);
    await breadcrumb.expectPath([HOME]);

    // Search for fileName2
    await searchBar.search(fileNames[1]);
    await table.expectHiddenFiles(fileNames[0], fileNames[2]);
    await table.expectVisibleFiles(fileNames[1]);
    await breadcrumb.expectPath([HOME, SEARCH_RESULTS]);

    // Clear search
    await searchBar.clear();
    await table.expectVisibleFiles(...fileNames);
    await breadcrumb.expectPath([HOME]);
  });

  test('Search nested file and open containing directory', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const breadcrumb = new Breadcrumb(page);
    const searchBar = new SearchBar(page);
    const notifications = new ToastNotification(page);

    const rootFile = createFileName(testInfo, 'root-file');
    const folderName = createDirectoryName(testInfo, 'drag-folder');
    const nestedFile = createFileName(testInfo, 'nested-file');

    await dragDropEntries(page, table.dropArea, [
      { path: rootFile, content: 'content' },
      { path: `${folderName}/${nestedFile}`, content: 'content' },
    ]);

    await notifications.expectUploadCompleted();
    await table.expectVisibleFiles(rootFile, folderName);
    await breadcrumb.expectPath([HOME]);

    // Search for nestedFile
    await searchBar.search(nestedFile);
    await table.expectHiddenFiles(rootFile, folderName);
    await table.expectVisibleFiles(nestedFile);
    await breadcrumb.expectPath([HOME, SEARCH_RESULTS]);

    // Open context menu and navigate to the file
    await table.openContextMenuForRow(nestedFile);
    const contextMenu = new UserFilesContextMenu(page);
    await contextMenu.openContainingDirectory();
    await breadcrumb.expectPath([HOME, folderName]);
    await table.expectRowSelectedAndVisible(nestedFile);
    await searchBar.expectValue('');
  });

  test('Search is scoped to the current directory', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const breadcrumb = new Breadcrumb(page);
    const searchBar = new SearchBar(page);
    const notifications = new ToastNotification(page);

    const rootFile = createFileName(testInfo, 'root-file');
    const folderName = createDirectoryName(testInfo, 'drag-folder');
    const nestedFile = createFileName(testInfo, 'nested-file');

    await dragDropEntries(page, table.dropArea, [
      { path: rootFile, content: 'content' },
      { path: `${folderName}/${nestedFile}`, content: 'content' },
    ]);
    await notifications.expectUploadCompleted();
    await table.expectVisibleFiles(rootFile, folderName);
    await breadcrumb.expectPath([HOME]);
    await searchBar.expectPlaceholder(`Search in ${HOME}`);

    await table.openFolder(folderName);
    await table.expectVisibleFiles(nestedFile);
    await breadcrumb.expectPath([HOME, folderName]);
    await searchBar.expectPlaceholder(`Search in ${folderName}`);

    await searchBar.search(rootFile);
    await table.expectHiddenFiles(nestedFile, rootFile);
    await breadcrumb.expectPath([HOME, folderName, SEARCH_RESULTS]);
  });
});

test.describe('Sorting', () => {
  test('Sort by name descending', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const fileNames = await uploadTestFiles(page, testInfo);

    const expectedAscending = fileNames.sort((a, b) => a.localeCompare(b));
    const expectedDescending = [...expectedAscending].reverse();
    await table.expectVisibleFiles(...expectedAscending);

    //Default sort order is by name ascending
    await table.expectRowOrder(expectedAscending);

    // Sort by name descending
    // First click sorts ascending, second click sorts descending
    await table.sortByColumn('name');
    await table.sortByColumn('name');
    await table.expectRowOrder(expectedDescending);
  });

  test('Selection persists after sorting', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const files = await uploadTestFiles(page, testInfo);

    await table.selectSingleRow(files[1]);
    await table.sortByColumn('name');
    await table.sortByColumn('name'); // Sort descending

    await table.expectRowsSelected(files[1]);
  });
});

test.describe('Selection', () => {
  test('Select all files Ctrl+A', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const files = await uploadTestFiles(page, testInfo);
    await table.expectVisibleFiles(...files);
    await table.selectAllRows();
    await table.expectRowsSelected(...files);
  });

  test('Move selection with arrow keys', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const files = await uploadTestFiles(page, testInfo);
    await table.expectVisibleFiles(...files);
    await table.selectSingleRow(files[0]);
    for (let i = 1; i < files.length; i++) {
      await page.keyboard.press('ArrowDown');
      await table.expectRowsSelected(files[i]);
    }

    for (let i = files.length - 2; i >= 0; i--) {
      await page.keyboard.press('ArrowUp');
      await table.expectRowsSelected(files[i]);
    }
  });

  test('Extend selection with Shift+Arrow', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const files = await uploadTestFiles(page, testInfo);
    await table.expectVisibleFiles(...files);
    await table.selectSingleRow(files[0]);
    await page.keyboard.down('Shift');
    for (let i = 1; i < files.length; i++) {
      await page.keyboard.press('ArrowDown');
      await table.expectRowsSelected(...files.slice(0, i + 1));
    }
    await page.keyboard.up('Shift');

    await table.selectSingleRow(files.at(-1)!);
    await page.keyboard.down('Shift');
    for (let i = files.length - 2; i >= 0; i--) {
      await page.keyboard.press('ArrowUp');
      await table.expectRowsSelected(...files.slice(i + 1, files.length));
    }
    await page.keyboard.up('Shift');
  });

  test('Extend selection with Ctrl+Click', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const files = await uploadTestFiles(page, testInfo);
    await table.expectVisibleFiles(...files);

    await table.selectSingleRow(files[0]);
    await table.selectRowsCtrl([...files.slice(1, files.length)]);
    await table.expectRowsSelected(...files);

    // Deselect the second file
    await table.selectRowsCtrl([files[1]]);
    await table.expectRowsSelected(...files.filter((f) => f !== files[1]));
  });

  test('Extend selection with Shift+Click', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const files = await uploadTestFiles(page, testInfo);
    await table.expectVisibleFiles(...files);

    await table.selectSingleRow(files[0]);
    await table.selectRange(files[0], files[2]);
    await table.expectRowsSelected(...files);
  });

  test('Select using drag selection', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const files = await uploadTestFiles(page, testInfo);
    await table.expectVisibleFiles(...files);
    const firstRow = table.fileRowByName(files[0]);
    const lastRow = table.fileRowByName(files.at(-1)!);
    await firstRow.scrollIntoViewIfNeeded();
    await firstRow.dragTo(lastRow);
    await table.expectRowsSelected(...files);
  });
});

import { expect, test } from './fixtures/authenticated-fixture';
import { createDirectoryName } from './helpers/file-names';
import { FileActionsStrip } from './pages/file-actions-strip.part';
import { UserFilesTable } from './pages/user-files-table.part';
import { Breadcrumb } from './pages/breadcrumb.part';
import { UserFilesContextMenu } from './pages/user-files-context-menu.part';

const HOME = 'Home';
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

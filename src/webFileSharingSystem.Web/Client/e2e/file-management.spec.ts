import { test } from './fixtures/authenticated-fixture';
import { createDirectoryName } from './helpers/file-names';
import { FileActionsStrip } from './pages/file-actions-strip.part';
import { TableContextMenu } from './pages/table-context-menu.part';
import { DirectoryCreationModal } from './pages/directory-creation-modal.part';
import { UserFilesTable } from './pages/user-files-table.part';
import { Breadcrumb } from './pages/breadcrumb.part';

test.describe('Directory Management', () => {
  test('Create directory', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const actionsStrip = new FileActionsStrip(page);

    const directoryName = createDirectoryName(testInfo, 'dir');
    await actionsStrip.createDirectory(directoryName);

    await table.expectRowSelectedAndVisible(directoryName);
  });

  test('Create directory via directory creation modal', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const table = new UserFilesTable(page);
    const tableMenu = new TableContextMenu(page);
    const modal = new DirectoryCreationModal(page);

    const directoryName = createDirectoryName(testInfo, 'dir');
    await tableMenu.open();
    await tableMenu.clickCreateFolder();

    await modal.waitForVisible();
    await modal.create(directoryName);

    await table.expectRowSelectedAndVisible(directoryName);
  });

  test('Create subdirectory', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const actionsStrip = new FileActionsStrip(page);
    const tableMenu = new TableContextMenu(page);
    const modal = new DirectoryCreationModal(page);
    const breadcrumb = new Breadcrumb(page);

    const parentDirectoryName = createDirectoryName(testInfo, 'parent-dir');
    const subdirectoryName = createDirectoryName(testInfo, 'child-dir');

    await actionsStrip.createDirectory(parentDirectoryName);

    await table.expectRowSelectedAndVisible(parentDirectoryName);
    await table.openFolder(parentDirectoryName);

    await tableMenu.open();
    await tableMenu.clickCreateFolder();
    await modal.waitForVisible();
    await modal.create(subdirectoryName);

    await table.expectRowSelectedAndVisible(subdirectoryName);

    await breadcrumb.expectPath(['Home', parentDirectoryName]);
  });
});

import { expect, test } from './fixtures/authenticated-fixture';
import { createDirectoryName, createFileName } from './helpers/file-names';
import { FileActionsStrip } from './pages/file-actions-strip.part';
import { TableContextMenu } from './pages/table-context-menu.part';
import { DirectoryCreationModal } from './pages/directory-creation-modal.part';
import { UserFilesTable } from './pages/user-files-table.part';
import { Breadcrumb } from './pages/breadcrumb.part';
import { UserFilesContextMenu } from './pages/user-files-context-menu.part';
import { UploadButtons } from './pages/upload-buttons.part';
import { createTempFile } from './helpers/test-files';
import { RenameInlineEditor } from './pages/rename-inline-editior.part';

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
    const modal = new DirectoryCreationModal(page);

    const directoryName = createDirectoryName(testInfo, 'dir');
    await table.openTableContextMenu();

    const tableMenu = new TableContextMenu(page);
    await tableMenu.clickCreateFolder();

    await modal.waitForVisible();
    await modal.create(directoryName);

    await table.expectRowSelectedAndVisible(directoryName);
  });

  test('Create subdirectory', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const actionsStrip = new FileActionsStrip(page);

    const modal = new DirectoryCreationModal(page);
    const breadcrumb = new Breadcrumb(page);

    const parentDirectoryName = createDirectoryName(testInfo, 'parent-dir');
    const subdirectoryName = createDirectoryName(testInfo, 'child-dir');

    await actionsStrip.createDirectory(parentDirectoryName);

    await table.expectRowSelectedAndVisible(parentDirectoryName);
    await table.openFolder(parentDirectoryName);
    await table.openTableContextMenu();

    const tableMenu = new TableContextMenu(page);
    await tableMenu.clickCreateFolder();
    await modal.waitForVisible();
    await modal.create(subdirectoryName);

    await table.expectRowSelectedAndVisible(subdirectoryName);
    await breadcrumb.expectPath(['Home', parentDirectoryName]);
  });

  test('Rename directory', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const actionsStrip = new FileActionsStrip(page);

    const directoryName = createDirectoryName(testInfo, 'dir');
    await actionsStrip.createDirectory(directoryName);

    await expect(table.fileRowByName(directoryName)).toBeVisible();
    await table.openContextMenuForRow(directoryName);

    const menu = new UserFilesContextMenu(page);
    await menu.clickRename();

    const renameEditor = new RenameInlineEditor(page);
    const newDirectoryName = createDirectoryName(testInfo, 'renamed-dir');
    await renameEditor.renameTo(newDirectoryName);

    await expect(table.fileRowByName(directoryName)).not.toBeVisible();
    await expect(table.fileRowByName(newDirectoryName)).toBeVisible();
  });
});

test.describe('File Management', () => {
  test('Rename file', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const uploadButtons = new UploadButtons(page);

    const fileName = createFileName(testInfo, 'file');
    const filePath = await createTempFile(testInfo, fileName, 'content');
    await uploadButtons.uploadFiles(filePath);

    await expect(table.fileRowByName(fileName)).toBeVisible();
    await table.openContextMenuForRow(fileName);

    const menu = new UserFilesContextMenu(page);
    await menu.clickRename();

    const renameEditor = new RenameInlineEditor(page);
    const newFileName = createFileName(testInfo, 'renamed-file');
    await renameEditor.renameTo(newFileName);

    await expect(table.fileRowByName(fileName)).not.toBeVisible();
    await expect(table.fileRowByName(newFileName)).toBeVisible();
  });
});

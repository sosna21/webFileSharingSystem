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

    await table.expectRowSelectedAndVisible(directoryName);
    await actionsStrip.initiateRename();

    const renameEditor = new RenameInlineEditor(page);
    const newDirectoryName = createDirectoryName(testInfo, 'renamed-dir');
    await renameEditor.renameTo(newDirectoryName);

    await expect(table.fileRowByName(directoryName)).not.toBeVisible();
    await table.expectRowSelectedAndVisible(newDirectoryName);
  });

  test('Move directory', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const actionsStrip = new FileActionsStrip(page);

    const directoryName = createDirectoryName(testInfo, 'root-dir');
    await actionsStrip.createDirectory(directoryName);
    await table.expectRowSelectedAndVisible(directoryName);

    const directoryToMoveName = createDirectoryName(testInfo, 'move-dir');
    await actionsStrip.createDirectory(directoryToMoveName);
    await table.expectRowSelectedAndVisible(directoryToMoveName);

    await table.openContextMenuForRow(directoryToMoveName);
    const menu = new UserFilesContextMenu(page);
    await menu.initiateMove();
    // Now row should be in "cut" state, but still visible (slighly faded)
    await expect(table.fileRowByName(directoryToMoveName)).toHaveAttribute(
      'data-cut',
      'true',
    );

    await expect(table.fileRowByName(directoryToMoveName)).toBeVisible();
    await table.openFolder(directoryName);
    await table.openTableContextMenu();
    const tableMenu = new TableContextMenu(page);
    await tableMenu.clickPaste();

    // Destination contains moved file
    await expect(table.fileRowByName(directoryToMoveName)).toBeVisible();

    const breadcrumb = new Breadcrumb(page);
    await breadcrumb.expectPath(['Home', directoryName]);
    await breadcrumb.navigateTo('Home');

    // Source no longer contains moved file
    await expect(table.fileRowByName(directoryToMoveName)).not.toBeVisible();
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
    await menu.initiateRename();

    const renameEditor = new RenameInlineEditor(page);
    const newFileName = createFileName(testInfo, 'renamed-file');
    await renameEditor.renameTo(newFileName);

    await expect(table.fileRowByName(fileName)).not.toBeVisible();
    await table.expectRowSelectedAndVisible(newFileName);
  });

  test('Move file', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const actionsStrip = new FileActionsStrip(page);
    const uploadButtons = new UploadButtons(page);

    const directoryName = createDirectoryName(testInfo, 'dir');
    await actionsStrip.createDirectory(directoryName);

    await table.expectRowSelectedAndVisible(directoryName);

    const fileName = createFileName(testInfo, 'file');
    const filePath = await createTempFile(testInfo, fileName, 'content');
    await uploadButtons.uploadFiles(filePath);

    await expect(table.fileRowByName(fileName)).toBeVisible();
    await table.selectSingleRow(fileName);
    await actionsStrip.initiateMoveForSelectedFiles();
    // Now row should be in "cut" state, but still visible (slighly faded)
    await expect(table.fileRowByName(fileName)).toHaveAttribute(
      'data-cut',
      'true',
    );

    await expect(table.fileRowByName(fileName)).toBeVisible();
    await table.openFolder(directoryName);
    await actionsStrip.pasteFilesToCurrentLocation();

    // Destination contains moved file
    await expect(table.fileRowByName(fileName)).toBeVisible();

    const breadcrumb = new Breadcrumb(page);
    await breadcrumb.expectPath(['Home', directoryName]);
    await breadcrumb.navigateTo('Home');

    // Source no longer contains moved file
    await expect(table.fileRowByName(fileName)).not.toBeVisible();
  });
});

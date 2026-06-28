import { test, expect } from './fixtures/authenticated-fixture';
import { dragDropEntries } from './helpers/drag-drop';
import { createFileName, createDirectoryName } from './helpers/file-names';
import { Breadcrumb } from './pages/breadcrumb.part';
import { FileActionsStrip } from './pages/file-actions-strip.part';
import { TableContextMenu } from './pages/table-context-menu.part';
import { ToastNotification } from './pages/toast-notifications.part';
import { UserFilesContextMenu } from './pages/user-files-context-menu.part';
import { UserFilesTable } from './pages/user-files-table.part';

test.describe('Command Availability', () => {
  test('Rename availability', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const actionsStrip = new FileActionsStrip(page);
    const menu = new UserFilesContextMenu(page);

    const firstFile = createFileName(testInfo, 'file-1');
    const secondFile = createFileName(testInfo, 'file-2');
    await dragDropEntries(page, table.dropArea, [
      { path: firstFile, content: 'abc' },
      { path: secondFile, content: 'def' },
    ]);

    await expect(table.fileRowByName(firstFile)).toBeVisible();
    await expect(table.fileRowByName(secondFile)).toBeVisible();

    await table.resetSelection();
    await actionsStrip.expectRenameDisabled();

    await table.selectSingleRow(firstFile);
    await actionsStrip.expectRenameEnabled();
    await table.openContextMenuForRow(firstFile);
    await menu.expectRenameEnabled();

    await table.resetSelection();
    await table.selectRowsCtrl([firstFile, secondFile]);
    await actionsStrip.expectRenameDisabled();
    await table.openContextMenuForSelectedRows();
    await menu.expectRenameDisabled();
  });

  test('Move availability', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const actionsStrip = new FileActionsStrip(page);
    const menu = new UserFilesContextMenu(page);

    const firstFile = createFileName(testInfo, 'file-1');
    const secondFile = createFileName(testInfo, 'file-2');
    await dragDropEntries(page, table.dropArea, [
      { path: firstFile, content: 'abc' },
      { path: secondFile, content: 'def' },
    ]);

    await expect(table.fileRowByName(firstFile)).toBeVisible();
    await expect(table.fileRowByName(secondFile)).toBeVisible();

    await table.resetSelection();
    await actionsStrip.expectMoveDisabled();

    await table.selectSingleRow(firstFile);
    await actionsStrip.expectMoveEnabled();
    await table.openContextMenuForRow(firstFile);
    await menu.expectMoveEnabled();

    await table.resetSelection();
    await table.selectRowsCtrl([firstFile, secondFile]);
    await actionsStrip.expectMoveEnabled();
    await table.openContextMenuForSelectedRows();
    await menu.expectMoveEnabled();
  });

  test('Copy availability', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const actionsStrip = new FileActionsStrip(page);
    const menu = new UserFilesContextMenu(page);

    const firstFile = createFileName(testInfo, 'file-1');
    const secondFile = createFileName(testInfo, 'file-2');
    await dragDropEntries(page, table.dropArea, [
      { path: firstFile, content: 'abc' },
      { path: secondFile, content: 'def' },
    ]);

    await expect(table.fileRowByName(firstFile)).toBeVisible();
    await expect(table.fileRowByName(secondFile)).toBeVisible();

    await table.resetSelection();
    await actionsStrip.expectCopyDisabled();

    await table.selectSingleRow(firstFile);
    await actionsStrip.expectCopyEnabled();
    await table.openContextMenuForRow(firstFile);
    await menu.expectCopyEnabled();

    await table.resetSelection();
    await table.selectRowsCtrl([firstFile, secondFile]);
    await actionsStrip.expectCopyEnabled();
    await table.openContextMenuForSelectedRows();
    await menu.expectCopyEnabled();
  });

  test('Paste availability', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const breadcrumb = new Breadcrumb(page);
    const actionsStrip = new FileActionsStrip(page);
    const notifications = new ToastNotification(page);
    const menu = new TableContextMenu(page);

    const firstFile = createFileName(testInfo, 'file-1');
    const directoryName = createDirectoryName(testInfo, 'dir');
    const secondFile = createFileName(testInfo, 'file-2');

    await dragDropEntries(page, table.dropArea, [
      { path: firstFile, content: 'abc' },
      { path: `${directoryName}/${secondFile}`, content: 'def' },
    ]);

    await notifications.expectUploadCompleted();

    await expect(table.fileRowByName(firstFile)).toBeVisible();
    await expect(table.fileRowByName(directoryName)).toBeVisible();

    await table.resetSelection();
    await actionsStrip.expectPasteDisabled();
    await table.openTableContextMenu();
    await menu.expectPasteDisabled();

    await table.resetSelection();
    await table.selectSingleRow(firstFile);
    await actionsStrip.initiateCopyForSelectedFiles();
    await table.openFolder(directoryName);
    await breadcrumb.expectPath(['Home', directoryName]);
    await actionsStrip.expectPasteEnabled();
    await table.openTableContextMenu();
    await menu.expectPasteEnabled();
    await menu.clickPaste();
    await table.expectRowSelectedAndVisible(firstFile);
    await actionsStrip.expectPasteDisabled();

    await table.resetSelection();
    await table.selectSingleRow(secondFile);
    await actionsStrip.initiateMoveForSelectedFiles();

    await breadcrumb.navigateTo('Home');
    await breadcrumb.expectPath(['Home']);
    await actionsStrip.expectPasteEnabled();
    await table.openTableContextMenu();
    await menu.expectPasteEnabled();
    await menu.clickPaste();
    await table.expectRowSelectedAndVisible(secondFile);
    await actionsStrip.expectPasteDisabled();
    await table.openTableContextMenu();
    await menu.expectPasteDisabled();
  });

  test('Delete availability', async ({ authenticatedPage: page }, testInfo) => {
    const table = new UserFilesTable(page);
    const actionsStrip = new FileActionsStrip(page);
    const menu = new UserFilesContextMenu(page);

    const firstFile = createFileName(testInfo, 'file-1');
    const secondFile = createFileName(testInfo, 'file-2');
    await dragDropEntries(page, table.dropArea, [
      { path: firstFile, content: 'abc' },
      { path: secondFile, content: 'def' },
    ]);

    await expect(table.fileRowByName(firstFile)).toBeVisible();
    await expect(table.fileRowByName(secondFile)).toBeVisible();

    await table.resetSelection();
    await actionsStrip.expectDeleteDisabled();

    await table.selectSingleRow(firstFile);
    await actionsStrip.expectDeleteEnabled();
    await table.openContextMenuForRow(firstFile);
    await menu.expectDeleteEnabled();

    await table.resetSelection();
    await table.selectRowsCtrl([firstFile, secondFile]);
    await actionsStrip.expectDeleteEnabled();
    await table.openContextMenuForSelectedRows();
    await menu.expectDeleteEnabled();
  });
});

import { test, expect } from './fixtures/shared-users-fixture';
import { AuthenticatedUser } from './helpers/authenticated-user';
import { createDirectoryName, createFileName } from './helpers/file-names';
import { createFolderStructure, createTempFile } from './helpers/test-files';
import { Breadcrumb } from './pages/breadcrumb.part';
import { ConfirmActionModal } from './pages/confirm-action-modal.part';
import { FileActionsStrip } from './pages/file-actions-strip.part';
import { FileShareModal, ShareAccessMode } from './pages/file-share-modal.part';
import { RenameInlineEditor } from './pages/rename-inline-editior.part';
import { SharedFilesContextMenu } from './pages/shared-files-context-menu.part';
import { SharedFilesTable } from './pages/shared-files-table.part';
import { Sidebar } from './pages/sidebar.part';
import { ToastNotification } from './pages/toast-notifications.part';
import { UploadButtons } from './pages/upload-buttons.part';
import { UserFilesTable } from './pages/user-files-table.part';

const readOnlyPermissions = {
  rename: false,
  move: false,
  copy: true,
  delete: false,
  download: true,
};

const readWritePermissions = {
  rename: true,
  move: true,
  copy: true,
  delete: false,
  download: true,
};

const fullPermissions = {
  rename: true,
  move: true,
  copy: true,
  delete: true,
  download: true,
};

test.describe('Share Creation', () => {
  test('Share file with ReadOnly access', async ({
    owner,
    recipient,
  }, testInfo) => {
    // Owner
    const ownerTable = new UserFilesTable(owner.page);
    const uploadButtons = new UploadButtons(owner.page);
    const actionStrip = new FileActionsStrip(owner.page);
    const notifications = new ToastNotification(owner.page);

    const fileName = createFileName(testInfo, 'file');
    const filePath = await createTempFile(testInfo, fileName, 'content');

    await uploadButtons.uploadFiles(filePath);
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();
    await ownerTable.selectSingleRow(fileName);
    await actionStrip.shareSelectedFiles();

    const shareModal = new FileShareModal(owner.page);
    await shareModal.expectVisible();
    await shareModal.fillShareWith(recipient.user.email);
    await shareModal.selectPermission(ShareAccessMode.ReadOnly);
    await shareModal.confirm();
    await shareModal.expectClosed();
    await notifications.expectShareSuccess();
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();

    // Recipient
    const sidebar = new Sidebar(recipient.page);
    await sidebar.navigateTo('shared-with-me');
    const recipientTable = new SharedFilesTable(recipient.page);
    await recipientTable.expectVisible();
    await expect(recipientTable.fileRowByName(fileName)).toBeVisible();

    const recipientActionStrip = new FileActionsStrip(recipient.page);
    await recipientTable.selectSingleRow(fileName);
    await recipientActionStrip.expectPermissions(readOnlyPermissions);
    await recipientTable.resetSelection();
    await recipientTable.openContextMenuForRow(fileName);
    const sharedContextMenu = new SharedFilesContextMenu(recipient.page);
    await sharedContextMenu.waitForVisible();
    await sharedContextMenu.expectPermissions(readOnlyPermissions);
  });

  test('Share folder with ReadOnly access', async ({
    owner,
    recipient,
  }, testInfo) => {
    // Owner
    const ownerTable = new UserFilesTable(owner.page);
    const uploadButtons = new UploadButtons(owner.page);
    const actionStrip = new FileActionsStrip(owner.page);
    const notifications = new ToastNotification(owner.page);

    const rootFolder = createDirectoryName(testInfo, 'folder');
    const rootFile = createFileName(testInfo, 'root-file');
    const nestedFolder = createDirectoryName(testInfo, 'nested-folder');
    const nestedFile = createFileName(testInfo, 'nested-file');
    const folderPath = await createFolderStructure(testInfo, rootFolder, [
      { path: rootFile, content: 'content' },
      {
        path: `${nestedFolder}/${nestedFile}`,
        content: 'content',
      },
    ]);

    await uploadButtons.uploadFolder(folderPath);
    await notifications.expectUploadCompleted();
    await expect(ownerTable.fileRowByName(rootFolder)).toBeVisible();

    await ownerTable.selectSingleRow(rootFolder);
    await actionStrip.shareSelectedFiles();

    const shareModal = new FileShareModal(owner.page);
    await shareModal.expectVisible();
    await shareModal.fillShareWith(recipient.user.email);
    await shareModal.selectPermission(ShareAccessMode.ReadOnly);
    await shareModal.confirm();
    await shareModal.expectClosed();
    await notifications.expectShareSuccess();
    await expect(ownerTable.fileRowByName(rootFolder)).toBeVisible();

    // Recipient
    const sidebar = new Sidebar(recipient.page);
    const breadcrumb = new Breadcrumb(recipient.page);

    await sidebar.navigateTo('shared-with-me');
    const recipientTable = new SharedFilesTable(recipient.page);
    await recipientTable.expectVisible();
    await expect(recipientTable.fileRowByName(rootFolder)).toBeVisible();

    const recipientActionStrip = new FileActionsStrip(recipient.page);
    await recipientTable.selectSingleRow(rootFolder);
    await recipientActionStrip.expectPermissions(readOnlyPermissions);

    await recipientTable.openFolder(rootFolder);
    await breadcrumb.expectPath(['Shared With Me', rootFolder]);
    await expect(recipientTable.fileRowByName(rootFile)).toBeVisible();
    await expect(recipientTable.fileRowByName(nestedFolder)).toBeVisible();
    await recipientTable.openFolder(nestedFolder);
    await breadcrumb.expectPath(['Shared With Me', rootFolder, nestedFolder]);
    await expect(recipientTable.fileRowByName(nestedFile)).toBeVisible();

    await recipientTable.selectSingleRow(nestedFile);
    await recipientActionStrip.expectPermissions(readOnlyPermissions);
    await recipientTable.resetSelection();
    await recipientTable.openContextMenuForRow(nestedFile);
    const sharedContextMenu = new SharedFilesContextMenu(recipient.page);
    await sharedContextMenu.waitForVisible();
    await sharedContextMenu.expectPermissions(readOnlyPermissions);
  });
});

test.describe('Share Permissions', () => {
  test('Share file with ReadWrite access', async ({
    owner,
    recipient,
  }, testInfo) => {
    // Owner
    const ownerTable = new UserFilesTable(owner.page);
    const uploadButtons = new UploadButtons(owner.page);
    const actionStrip = new FileActionsStrip(owner.page);
    const notifications = new ToastNotification(owner.page);

    const fileName = createFileName(testInfo, 'file');
    const filePath = await createTempFile(testInfo, fileName, 'content');

    await uploadButtons.uploadFiles(filePath);
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();
    await ownerTable.selectSingleRow(fileName);
    await actionStrip.shareSelectedFiles();

    const shareModal = new FileShareModal(owner.page);
    await shareModal.expectVisible();
    await shareModal.fillShareWith(recipient.user.email);
    await shareModal.selectPermission(ShareAccessMode.ReadWrite);
    await shareModal.confirm();
    await shareModal.expectClosed();
    await notifications.expectShareSuccess();
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();

    // Recipient
    const sidebar = new Sidebar(recipient.page);
    await sidebar.navigateTo('shared-with-me');
    const recipientTable = new SharedFilesTable(recipient.page);
    await recipientTable.expectVisible();
    await expect(recipientTable.fileRowByName(fileName)).toBeVisible();

    const recipientActionStrip = new FileActionsStrip(recipient.page);
    await recipientTable.selectSingleRow(fileName);
    await recipientActionStrip.expectPermissions(readWritePermissions);
    await recipientTable.resetSelection();
    await recipientTable.openContextMenuForRow(fileName);
    const sharedContextMenu = new SharedFilesContextMenu(recipient.page);
    await sharedContextMenu.waitForVisible();
    await sharedContextMenu.expectPermissions(readWritePermissions);
    await sharedContextMenu.initiateRename();
    const rename = new RenameInlineEditor(recipient.page);
    const renamedFileName = createFileName(testInfo, 'renamed-file');
    await rename.renameTo(renamedFileName);
    await expect(recipientTable.fileRowByName(fileName)).not.toBeVisible();
    await recipientTable.expectRowSelectedAndVisible(renamedFileName);

    // Owner sees recipient's changes
    await owner.page.reload();
    await expect(ownerTable.fileRowByName(fileName)).not.toBeVisible();
    await expect(ownerTable.fileRowByName(renamedFileName)).toBeVisible();
  });

  test('Share file with FullAccess access', async ({
    owner,
    recipient,
  }, testInfo) => {
    // Owner
    const ownerTable = new UserFilesTable(owner.page);
    const uploadButtons = new UploadButtons(owner.page);
    const actionStrip = new FileActionsStrip(owner.page);
    const notifications = new ToastNotification(owner.page);

    const fileName = createFileName(testInfo, 'file');
    const filePath = await createTempFile(testInfo, fileName, 'content');

    await uploadButtons.uploadFiles(filePath);
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();
    await ownerTable.selectSingleRow(fileName);
    await actionStrip.shareSelectedFiles();

    const shareModal = new FileShareModal(owner.page);
    await shareModal.expectVisible();
    await shareModal.fillShareWith(recipient.user.email);
    await shareModal.selectPermission(ShareAccessMode.FullAccess);
    await shareModal.confirm();
    await shareModal.expectClosed();
    await notifications.expectShareSuccess();
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();

    // Recipient
    const sidebar = new Sidebar(recipient.page);
    await sidebar.navigateTo('shared-with-me');
    const recipientTable = new SharedFilesTable(recipient.page);
    await recipientTable.expectVisible();
    await expect(recipientTable.fileRowByName(fileName)).toBeVisible();

    const recipientActionStrip = new FileActionsStrip(recipient.page);
    await recipientTable.selectSingleRow(fileName);
    await recipientActionStrip.expectPermissions(fullPermissions);
    await recipientTable.resetSelection();
    await recipientTable.openContextMenuForRow(fileName);
    const sharedContextMenu = new SharedFilesContextMenu(recipient.page);
    await sharedContextMenu.waitForVisible();
    await sharedContextMenu.expectPermissions(fullPermissions);
    await sharedContextMenu.deleteSelection();
    const confirmDialog = new ConfirmActionModal(recipient.page);
    await confirmDialog.expectVisible();
    await confirmDialog.confirm();
    await confirmDialog.expectClosed();
    await expect(recipientTable.fileRowByName(fileName)).not.toBeVisible();

    // Owner should see the deletion performed by the recipient
    await owner.page.reload();
    await expect(ownerTable.fileRowByName(fileName)).not.toBeVisible();
  });
});

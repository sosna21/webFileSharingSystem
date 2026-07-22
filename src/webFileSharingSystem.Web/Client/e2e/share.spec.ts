import { test, expect } from './fixtures/shared-users-fixture';
import { AuthenticatedUser } from './helpers/authenticated-user';
import { dragDropEntries } from './helpers/drag-drop';
import { createDirectoryName, createFileName } from './helpers/file-names';
import { createFolderStructure, createTempFile } from './helpers/test-files';
import { Breadcrumb } from './pages/breadcrumb.part';
import { ConfirmActionModal } from './pages/confirm-action-modal.part';
import { CopyToClipboardModal } from './pages/copy-to-clipboard-modal.part';
import { FileActionsStrip } from './pages/file-actions-strip.part';
import { FileShareModal, ShareAccessMode } from './pages/file-share-modal.part';
import { FileShareUpdateModal } from './pages/file-share-update-modal.part';
import { FileSharesManagementModal } from './pages/file-shares-management-modal.part';
import { RenameInlineEditor } from './pages/rename-inline-editior.part';
import { SharedFilesContextMenu } from './pages/shared-files-context-menu.part';
import { SharedFilesTable } from './pages/shared-files-table.part';
import { Sidebar } from './pages/sidebar.part';
import { ToastNotification } from './pages/toast-notifications.part';
import { UploadButtons } from './pages/upload-buttons.part';
import { UserFilesContextMenu } from './pages/user-files-context-menu.part';
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

async function expectFileSharedWith(user: AuthenticatedUser, fileName: string) {
  const sidebar = new Sidebar(user.page);
  await sidebar.navigateTo('shared-with-me');

  const table = new SharedFilesTable(user.page);
  await table.expectVisible();
  await expect(table.fileRowByName(fileName)).toBeVisible();
}

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
    await shareModal.shareWith(
      [recipient.user.email],
      ShareAccessMode.ReadOnly,
    );
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
    await shareModal.shareWith(
      [recipient.user.email],
      ShareAccessMode.ReadOnly,
    );
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

  test('Share multiple files at once', async ({
    owner,
    recipient,
  }, testInfo) => {
    // Owner
    const ownerTable = new UserFilesTable(owner.page);
    const actionStrip = new FileActionsStrip(owner.page);
    const notifications = new ToastNotification(owner.page);

    const fileName = createFileName(testInfo, 'drag-file');
    const folderName = createDirectoryName(testInfo, 'drag-folder');
    const nestedFileName = 'inside.txt';

    await dragDropEntries(owner.page, ownerTable.dropArea, [
      { path: fileName, content: 'content' },
      { path: `${folderName}/${nestedFileName}`, content: 'content' },
    ]);

    await notifications.expectUploadCompleted();
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();
    await expect(ownerTable.fileRowByName(folderName)).toBeVisible();

    await ownerTable.selectAllRows();
    await actionStrip.shareSelectedFiles();

    const shareModal = new FileShareModal(owner.page);
    await shareModal.expectVisible();
    await shareModal.shareWith(
      [recipient.user.email],
      ShareAccessMode.ReadOnly,
    );
    await notifications.expectShareSuccess();
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();

    // Recipient
    const sidebar = new Sidebar(recipient.page);
    await sidebar.navigateTo('shared-with-me');
    const recipientTable = new SharedFilesTable(recipient.page);
    await recipientTable.expectVisible();
    await expect(recipientTable.fileRowByName(fileName)).toBeVisible();
    await expect(recipientTable.fileRowByName(folderName)).toBeVisible();
    await recipientTable.openFolder(folderName);
    await expect(recipientTable.fileRowByName(nestedFileName)).toBeVisible();

    const recipientActionStrip = new FileActionsStrip(recipient.page);
    await recipientTable.selectSingleRow(nestedFileName);
    await recipientActionStrip.expectPermissions(readOnlyPermissions);
  });

  test('Share file with multiple recipients', async ({
    owner,
    recipient,
    createUser,
  }, testInfo) => {
    const recipient2 = await createUser();
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
    const recipientEmails = [recipient.user.email, recipient2.user.email];
    await shareModal.shareWith(recipientEmails, ShareAccessMode.ReadOnly);
    await notifications.expectShareSuccess();
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();

    await expectFileSharedWith(recipient, fileName);
    await expectFileSharedWith(recipient2, fileName);
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
    await shareModal.shareWith(
      [recipient.user.email],
      ShareAccessMode.ReadWrite,
    );
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
    await shareModal.shareWith(
      [recipient.user.email],
      ShareAccessMode.FullAccess,
    );
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

test.describe('Share Management', () => {
  test('Update share', async ({ owner, recipient }, testInfo) => {
    // Owner: create ReadOnly share
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
    await shareModal.shareWith(
      [recipient.user.email],
      ShareAccessMode.ReadOnly,
    );
    await notifications.expectShareSuccess();
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();

    // Recipient: verify initial ReadOnly permissions
    const sidebar = new Sidebar(recipient.page);
    await sidebar.navigateTo('shared-with-me');
    const recipientTable = new SharedFilesTable(recipient.page);
    await recipientTable.expectVisible();
    await expect(recipientTable.fileRowByName(fileName)).toBeVisible();

    const recipientActionStrip = new FileActionsStrip(recipient.page);
    await recipientTable.selectSingleRow(fileName);
    await recipientActionStrip.expectPermissions(readOnlyPermissions);

    // Owner: update share to ReadWrite
    await ownerTable.selectSingleRow(fileName);
    await actionStrip.shareSelectedFiles();
    const shareManagementModal = new FileSharesManagementModal(owner.page);
    await shareManagementModal.expectVisible();
    await shareManagementModal.waitForLoaded();
    await shareManagementModal.clickEditByUserName(recipient.user.userName);
    const shareUpdateModal = new FileShareUpdateModal(owner.page);
    await shareUpdateModal.expectVisible();
    await shareUpdateModal.updateShare(ShareAccessMode.ReadWrite);
    await notifications.expectShareSuccess();
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();

    // Recipient: verify updated permissions
    await recipient.page.reload();
    await expect(recipientTable.fileRowByName(fileName)).toBeVisible();
    await recipientTable.selectSingleRow(fileName);
    await recipientActionStrip.expectPermissions(readWritePermissions);
  });

  test('Delete share', async ({ owner, recipient }, testInfo) => {
    // Owner: create share
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
    await shareModal.shareWith(
      [recipient.user.email],
      ShareAccessMode.ReadOnly,
    );
    await notifications.expectShareSuccess();
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();

    // Recipient: verify share exists
    const sidebar = new Sidebar(recipient.page);
    await sidebar.navigateTo('shared-with-me');
    const recipientTable = new SharedFilesTable(recipient.page);
    await recipientTable.expectVisible();
    await expect(recipientTable.fileRowByName(fileName)).toBeVisible();

    // Owner: Delete share
    await ownerTable.selectSingleRow(fileName);
    await actionStrip.shareSelectedFiles();
    const shareManagementModal = new FileSharesManagementModal(owner.page);
    await shareManagementModal.expectVisible();
    await shareManagementModal.waitForLoaded();
    await shareManagementModal.clickCancelByUserName(recipient.user.userName);
    const confirmDialog = new ConfirmActionModal(owner.page);
    await confirmDialog.expectVisible();
    await confirmDialog.confirm();
    await confirmDialog.expectClosed();
    await notifications.expectShareCancelled();
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();

    // Recipient: verify share is removed
    await recipient.page.reload();
    await expect(recipientTable.fileRowByName(fileName)).not.toBeVisible();
  });
});

const shareLinkRegex =
  /^https?:\/\/.+\/api\/Download\/file\?token=.*&bewit=.*$/;
test.describe('Share links', () => {
  test('Generate share link', async ({ owner }, testInfo) => {
    const ownerTable = new UserFilesTable(owner.page);
    const uploadButtons = new UploadButtons(owner.page);
    const actionStrip = new FileActionsStrip(owner.page);

    const fileName = createFileName(testInfo, 'file');
    const filePath = await createTempFile(testInfo, fileName, 'content');

    await uploadButtons.uploadFiles(filePath);
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();
    await ownerTable.selectSingleRow(fileName);
    await actionStrip.shareSelectedFiles();

    const shareModal = new FileShareModal(owner.page);
    await shareModal.expectVisible();
    await shareModal.generateLink();
    const shareLinkModal = new CopyToClipboardModal(owner.page);
    await shareLinkModal.expectVisible();
    await shareLinkModal.expectTitle('Share Link');
    const shareLink = await shareLinkModal.getShareLinkValue();

    await expect(shareLink).toMatch(shareLinkRegex);
  });

  test('Download through share link', async ({
    owner,
    recipient,
  }, testInfo) => {
    // Owner: generate share link
    const ownerTable = new UserFilesTable(owner.page);
    const uploadButtons = new UploadButtons(owner.page);
    const actionStrip = new FileActionsStrip(owner.page);

    const fileName = createFileName(testInfo, 'file');
    const fileContent = 'sample-download-content-' + crypto.randomUUID();
    const filePath = await createTempFile(testInfo, fileName, fileContent);

    await uploadButtons.uploadFiles(filePath);
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();
    await ownerTable.selectSingleRow(fileName);
    await actionStrip.shareSelectedFiles();

    const shareModal = new FileShareModal(owner.page);
    await shareModal.expectVisible();
    await shareModal.generateLink();
    const shareLinkModal = new CopyToClipboardModal(owner.page);
    await shareLinkModal.expectVisible();
    await shareLinkModal.expectTitle('Share Link');
    const shareLink = await shareLinkModal.getShareLinkValue();

    // Recipient: download file through share link
    const response = await recipient.page.request.get(shareLink);
    expect(response.ok()).toBeTruthy();
    const buf = await response.body();
    expect(buf.toString()).toContain(fileContent);
  });

  test('Download multiple files through share link', async ({
    owner,
    recipient,
  }, testInfo) => {
    // Owner
    const ownerTable = new UserFilesTable(owner.page);
    const notifications = new ToastNotification(owner.page);

    const fileName = createFileName(testInfo, 'drag-file');
    const folderName = createDirectoryName(testInfo, 'drag-folder');
    const nestedFileName = 'inside.txt';
    const rootContent = `root-${crypto.randomUUID()}`;
    const nestedContent = `nested-${crypto.randomUUID()}`;

    await dragDropEntries(owner.page, ownerTable.dropArea, [
      { path: fileName, content: rootContent },
      { path: `${folderName}/${nestedFileName}`, content: nestedContent },
    ]);

    await notifications.expectUploadCompleted();
    await expect(ownerTable.fileRowByName(fileName)).toBeVisible();
    await expect(ownerTable.fileRowByName(folderName)).toBeVisible();

    await ownerTable.selectAllRows();
    await ownerTable.openContextMenuForSelectedRows();
    const contextMenu = new UserFilesContextMenu(owner.page);
    await contextMenu.waitForVisible();
    await contextMenu.generateShareLink();
    const shareLinkModal = new CopyToClipboardModal(owner.page);
    await shareLinkModal.expectVisible();
    await shareLinkModal.expectTitle('Share Link');
    const shareLink = await shareLinkModal.getShareLinkValue();

    // Recipient: download file through share link
    const response = await recipient.page.request.get(shareLink);
    expect(response.ok()).toBeTruthy();
    const buf = await response.body();

    expect(buf.length).toBeGreaterThan(0);
    expect(buf.includes(Buffer.from(fileName))).toBeTruthy();
    expect(buf.includes(Buffer.from(folderName))).toBeTruthy();
    expect(buf.includes(Buffer.from(nestedFileName))).toBeTruthy();
    expect(buf.includes(Buffer.from(rootContent))).toBeTruthy();
    expect(buf.includes(Buffer.from(nestedContent))).toBeTruthy();
  });
});

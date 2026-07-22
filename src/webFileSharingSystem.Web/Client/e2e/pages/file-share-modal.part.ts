import { expect, type Locator, type Page } from '@playwright/test';

export enum ShareAccessMode {
  ReadOnly,
  ReadWrite,
  FullAccess,
}

export class FileShareModal {
  readonly modal: Locator;
  readonly title: Locator;
  readonly shareWithInput: Locator;
  readonly shareDurationSelect: Locator;
  readonly readOnlyPermission: Locator;
  readonly readWritePermission: Locator;
  readonly fullControlPermission: Locator;
  readonly generateLinkButton: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.modal = page.getByTestId('file-share-modal');
    this.title = this.modal.getByTestId('file-share-modal-title');
    this.shareWithInput = this.modal.getByTestId('file-share-modal-share-with');
    this.shareDurationSelect = this.modal.getByTestId(
      'file-share-modal-share-duration',
    );
    this.readOnlyPermission = this.modal.getByTestId(
      'file-share-modal-permission-read-only',
    );
    this.readWritePermission = this.modal.getByTestId(
      'file-share-modal-permission-read-write',
    );
    this.fullControlPermission = this.modal.getByTestId(
      'file-share-modal-permission-full-control',
    );
    this.generateLinkButton = this.modal.getByTestId(
      'file-share-modal-generate-link',
    );
    this.cancelButton = this.modal.getByTestId('file-share-modal-cancel');
    this.confirmButton = this.modal.getByTestId('file-share-modal-confirm');
  }

  async expectVisible(timeout = 3_000) {
    await expect(this.modal).toBeVisible({ timeout });
  }

  async expectClosed() {
    await expect(this.modal).not.toBeVisible();
  }

  async fillShareWith(value: string) {
    await this.shareWithInput.fill(value);
  }

  async selectPermission(permission: ShareAccessMode) {
    switch (permission) {
      case ShareAccessMode.ReadOnly:
        await this.readOnlyPermission.check();
        break;
      case ShareAccessMode.ReadWrite:
        await this.readWritePermission.check();
        break;
      case ShareAccessMode.FullAccess:
        await this.fullControlPermission.check();
        break;
    }
  }

  async selectShareDuration(hours: number) {
    await this.shareDurationSelect.selectOption(String(hours));
  }

  async generateLink() {
    await this.generateLinkButton.click();
  }

  async confirm() {
    await this.confirmButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async shareWith(users: string[], permission: ShareAccessMode) {
    const formattedUsers = users.join(', ');
    await this.fillShareWith(formattedUsers);
    await this.selectPermission(permission);
    await this.confirm();
    await this.expectClosed();
  }
}

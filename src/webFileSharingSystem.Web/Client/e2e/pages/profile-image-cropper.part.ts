import { expect, type Locator } from '@playwright/test';

export class ProfileImageCropper {
  readonly root: Locator;
  readonly container: Locator;
  readonly fileName: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(root: Locator) {
    this.root = root.getByTestId('profile-image-cropper');
    this.container = this.root.getByTestId('profile-image-cropper-container');
    this.fileName = this.root.getByTestId('profile-image-cropper-file-name');
    this.saveButton = this.root.getByTestId('profile-image-cropper-save');
    this.cancelButton = this.root.getByTestId('profile-image-cropper-cancel');
  }

  async expectVisible() {
    await expect(this.root).toBeVisible();
  }

  async expectFileName(name: string) {
    await expect(this.fileName).toContainText(name);
  }

  async save() {
    await this.saveButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}

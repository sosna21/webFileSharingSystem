import { expect, type Locator } from '@playwright/test';

export class ProfilePhotoDropzone {
  readonly root: Locator;
  readonly dropZone: Locator;
  readonly input: Locator;
  readonly browseButton: Locator;

  constructor(root: Locator) {
    this.root = root.getByTestId('profile-photo-dropzone');
    this.dropZone = this.root.getByTestId('profile-photo-dropzone-drop-zone');
    this.input = this.root.getByTestId('profile-photo-dropzone-input');
    this.browseButton = this.root.getByTestId('profile-photo-dropzone-browse');
  }

  async expectVisible() {
    await expect(this.root).toBeVisible();
  }

  async upload(filePath: string) {
    await this.input.setInputFiles(filePath);
  }
}

import type { Locator, Page } from '@playwright/test';

export class UploadButtons {
  readonly fileInput: Locator;
  readonly folderInput: Locator;

  constructor(page: Page) {
    this.fileInput = page.getByTestId('upload-files-input');
    this.folderInput = page.getByTestId('upload-folder-input');
  }

  async uploadFiles(filePaths: string | string[]) {
    await this.fileInput.setInputFiles(filePaths);
  }

  async uploadFolder(folderPath: string) {
    await this.folderInput.setInputFiles(folderPath);
  }
}

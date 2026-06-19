import type { Locator, Page } from '@playwright/test';
import { UploadRow } from './upload-row.part';

export class UserFilesTable {
  readonly table: Locator;
  readonly uploadOverlay: Locator;
  readonly dropArea: Locator;

  constructor(page: Page) {
    this.table = page.getByTestId('user-files-table');
    this.uploadOverlay = page.getByTestId('upload-overlay');
    this.dropArea = page.getByTestId('user-files-drop-area');
  }

  fileRowByName(name: string): Locator {
    return this.table
      .locator('[data-testid^="file-row-"]')
      .filter({ hasText: name });
  }

  uploadRowByName(name: string): UploadRow {
    const row = this.table
      .locator('[data-testid^="upload-row-"]')
      .filter({ hasText: name });

    return new UploadRow(row);
  }

  async openFolder(name: string) {
    await this.fileRowByName(name).dblclick();
  }
}

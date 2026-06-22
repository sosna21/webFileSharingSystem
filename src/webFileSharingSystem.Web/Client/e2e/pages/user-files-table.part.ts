import { expect, type Locator, type Page } from '@playwright/test';
import { UploadRow } from './upload-row.part';

const selectedRowClass = /selected/;

export class UserFilesTable {
  readonly page: Page;
  readonly table: Locator;
  readonly uploadOverlay: Locator;
  readonly dropArea: Locator;

  constructor(page: Page) {
    this.page = page;
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

  async expectRowSelectedAndVisible(name: string) {
    const row = this.fileRowByName(name);

    await expect(row).toBeVisible();
    await expect(row).toHaveClass(selectedRowClass);
    await expect(row).toBeInViewport();
  }

  async openFolder(name: string) {
    await this.fileRowByName(name).dblclick();
  }

  async openContextMenuForRow(name: string) {
    const row = this.fileRowByName(name);
    await row.click(); // ensure selected
    await row.click({ button: 'right' });
  }

  async rightClickRow(name: string) {
    const row = this.fileRowByName(name);
    await row.click({ button: 'right' });
  }

  async selectRowsCtrl(names: string[]) {
    await this.page.keyboard.down('Control');
    for (const n of names) {
      await this.fileRowByName(n).click();
    }
    await this.page.keyboard.up('Control');
  }

  async selectRange(startName: string, endName: string) {
    const start = this.fileRowByName(startName);
    const end = this.fileRowByName(endName);

    await start.click();
    await this.page.keyboard.down('Shift');
    await end.click();
    await this.page.keyboard.up('Shift');
  }
}

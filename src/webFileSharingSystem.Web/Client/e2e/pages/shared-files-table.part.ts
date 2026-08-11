import { expect, type Locator, type Page } from '@playwright/test';
import { UploadRow } from './upload-row.part';

const selectedRowClass = 'selected-row';

export class SharedFilesTable {
  readonly page: Page;
  readonly table: Locator;
  readonly uploadOverlay: Locator;
  readonly dropArea: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.getByTestId('shared-files-table');
    this.uploadOverlay = page.getByTestId('upload-overlay');
    this.dropArea = page.getByTestId('shared-files-drop-area');
  }

  async expectVisible() {
    await expect(this.table).toBeVisible();
  }

  fileRowByName(name: string): Locator {
    return this.table.getByTestId(`file-row-${name}`);
  }

  uploadRowByName(name: string): UploadRow {
    const row = this.table.getByTestId(`upload-row-${name}`);

    return new UploadRow(row);
  }

  async expectRowSelectedAndVisible(name: string) {
    const row = this.fileRowByName(name);

    await expect(row).toBeVisible();
    await expect(row).toContainClass(selectedRowClass);
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

  async openContextMenuForSelectedRows() {
    //find first row with selected class, it should have getByTestId starting with `file-row-` then first from that list with selected class
    const row = this.table
      .locator('[data-testid^="file-row-"].selected-row')
      .first();
    await row.click({ button: 'right' });
  }

  async openTableContextMenu() {
    await this.table.click({ button: 'right' });
  }

  async selectSingleRow(name: string) {
    const row = this.fileRowByName(name);
    await row.click();
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

  async selectAllRows() {
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('KeyA');
    await this.page.keyboard.up('Control');
  }

  async resetSelection() {
    await this.table.hover();
    await this.table.dispatchEvent('pointerdown');
    await this.table.dispatchEvent('pointerup');
  }
}

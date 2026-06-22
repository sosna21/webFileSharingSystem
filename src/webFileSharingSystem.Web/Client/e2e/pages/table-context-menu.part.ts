import type { Locator, Page } from '@playwright/test';

export class TableContextMenu {
  readonly page: Page;
  readonly tableWrapper: Locator;
  readonly createFolderItem: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tableWrapper = page.getByTestId('user-files-table');
    this.createFolderItem = page.getByTestId(
      'table-context-menu-create-folder',
    );
  }

  async open() {
    await this.tableWrapper.click({ button: 'right' });
  }

  async clickCreateFolder() {
    await this.createFolderItem.waitFor({ state: 'visible', timeout: 5000 });
    await this.createFolderItem.click();
  }
}

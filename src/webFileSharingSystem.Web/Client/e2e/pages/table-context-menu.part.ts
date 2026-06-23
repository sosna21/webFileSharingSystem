import type { Locator, Page } from '@playwright/test';

export class TableContextMenu {
  readonly page: Page;
  readonly createFolderItem: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createFolderItem = page.getByTestId(
      'table-context-menu-create-folder',
    );
  }

  async clickCreateFolder() {
    await this.createFolderItem.waitFor({ state: 'visible', timeout: 5000 });
    await this.createFolderItem.click();
  }
}

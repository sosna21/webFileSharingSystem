import { expect, type Locator, type Page } from '@playwright/test';

export class TableContextMenu {
  readonly page: Page;
  readonly createFolderItem: Locator;
  readonly pasteItem: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createFolderItem = page.getByTestId(
      'table-context-menu-create-folder',
    );
    this.pasteItem = page.getByTestId('table-context-menu-paste');
  }

  async clickCreateFolder() {
    await this.createFolderItem.click();
  }

  async clickPaste() {
    await this.pasteItem.click();
  }

  // Availability assertions

  async expectPasteEnabled() {
    await expect(this.pasteItem).toBeEnabled();
  }

  async expectPasteDisabled() {
    await expect(this.pasteItem).toBeDisabled();
  }
}

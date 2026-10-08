import { expect, type Locator, type Page } from '@playwright/test';

export class TableContextMenu {
  readonly desktopMenu: Locator;
  readonly mobileMenu: Locator;

  readonly createFolderItem: Locator;
  readonly pasteItem: Locator;

  constructor(page: Page, menuType: 'desktop' | 'mobile' = 'desktop') {
    this.desktopMenu = page.getByTestId('desktop-context-menu');
    this.mobileMenu = page.getByTestId('mobile-context-menu');

    const container =
      menuType === 'desktop' ? this.desktopMenu : this.mobileMenu;

    this.createFolderItem = container.getByTestId(
      'table-context-menu-create-folder',
    );
    this.pasteItem = container.getByTestId('table-context-menu-paste');
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

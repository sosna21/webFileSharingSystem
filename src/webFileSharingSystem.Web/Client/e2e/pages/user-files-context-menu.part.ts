import type { Page } from '@playwright/test';

export class UserFilesContextMenu {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async clickDownload() {
    await this.page.getByTestId('context-menu-download').click();
  }

  async clickRename() {
    await this.page.getByTestId('context-menu-rename').click();
  }
}

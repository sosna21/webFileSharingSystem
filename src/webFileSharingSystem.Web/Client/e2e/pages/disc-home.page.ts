import { expect, type Locator, type Page } from '@playwright/test';

export class DiscHomePage {
  readonly page: Page;
  readonly userFilesTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userFilesTable = page.getByTestId('user-files-table');
  }

  async expectVisible() {
    await expect(this.userFilesTable).toBeVisible();
  }
}

import type { Locator, Page } from '@playwright/test';

export class ActionsCell {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async openActionsForRow(row: Locator) {
    const actions = row.locator('app-actions-cell');
    await actions.click();
  }
}

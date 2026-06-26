import { expect, type Locator, type Page } from '@playwright/test';

export class ConfirmActionModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId('confirm-modal');
    this.confirmButton = page.getByTestId('confirm-modal-accept');
    this.cancelButton = page.getByTestId('confirm-modal-cancel');
  }

  async expectVisible(timeout = 3_000) {
    await expect(this.modal).toBeVisible({ timeout });
  }

  async expectClosed() {
    await expect(this.modal).not.toBeVisible();
  }

  async confirm() {
    await this.confirmButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}

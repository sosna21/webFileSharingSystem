import { expect, type Locator, type Page } from '@playwright/test';

export class FileSharesManagementModal {
  readonly modal: Locator;
  readonly title: Locator;
  readonly createNewButton: Locator;
  readonly loadingSpinner: Locator;
  readonly table: Locator;
  readonly exitButton: Locator;

  constructor(page: Page) {
    this.modal = page.getByTestId('file-shares-management-modal');
    this.title = this.modal.getByTestId('file-shares-management-modal-title');
    this.createNewButton = this.modal.getByTestId(
      'file-shares-management-modal-create-new',
    );
    this.loadingSpinner = this.modal.getByTestId(
      'file-shares-management-modal-loading',
    );
    this.table = this.modal.getByTestId('file-shares-management-modal-table');
    this.exitButton = this.modal.getByTestId(
      'file-shares-management-modal-exit',
    );
  }

  async expectVisible(timeout = 3_000) {
    await expect(this.modal).toBeVisible({ timeout });
  }

  async expectClosed() {
    await expect(this.modal).not.toBeVisible();
  }

  async waitForLoaded(timeout = 15_000) {
    await expect(this.loadingSpinner).toBeHidden({ timeout });
    await expect(this.table).toBeVisible({ timeout });
  }

  async openCreateNew() {
    await this.createNewButton.click();
  }

  async exit() {
    await this.exitButton.click();
  }

  rowByShareId(shareId: string | number): Locator {
    return this.modal.getByTestId(
      `file-shares-management-modal-row-${shareId}`,
    );
  }

  rowByUserName(userName: string): Locator {
    return this.table.locator('tbody tr').filter({ hasText: userName });
  }

  async clickEditByUserName(userName: string) {
    const row = this.rowByUserName(userName);
    await row.getByRole('button', { name: /edit/i }).click();
  }

  async clickCancelByUserName(userName: string) {
    const row = this.rowByUserName(userName);
    await row
      .locator('[data-testid^="file-shares-management-modal-cancel-share-"]')
      .click();
  }
}

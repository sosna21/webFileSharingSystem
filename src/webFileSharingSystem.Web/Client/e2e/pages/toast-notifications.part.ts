import { expect, Locator, Page } from '@playwright/test';

export class ToastNotification {
  readonly successToast: Locator;
  readonly errorToast: Locator;
  readonly infoToast: Locator;

  constructor(page: Page) {
    this.successToast = page.getByTestId('toast-success');
    this.errorToast = page.getByTestId('toast-error');
    this.infoToast = page.getByTestId('toast-info');
  }

  async expectUploadCompleted() {
    await this.expectSuccess('Upload complete');
  }

  async expectSuccess(message: string) {
    await expect(this.successToast).toBeVisible();
    await expect(this.successToast).toContainText(message);
  }

  async expectError(message: string) {
    await expect(this.errorToast).toBeVisible();
    await expect(this.errorToast).toContainText(message);
  }

  async expectInfo(message: string) {
    await expect(this.infoToast).toBeVisible();
    await expect(this.infoToast).toContainText(message);
  }

  async expectSuccessGone() {
    await expect(this.successToast).not.toBeVisible();
  }

  async expectErrorGone() {
    await expect(this.errorToast).not.toBeVisible();
  }

  async expectInfoGone() {
    await expect(this.infoToast).not.toBeVisible();
  }
}

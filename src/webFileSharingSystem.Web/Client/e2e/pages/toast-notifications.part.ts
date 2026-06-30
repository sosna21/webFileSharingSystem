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

  async expectShareSuccess() {
    await this.expectSuccess('File Share');
  }

  async expectShareCancelled() {
    await this.expectSuccess('Share cancellation');
  }

  private async expectToast(toasts: Locator, message: string) {
    await expect(toasts.filter({ hasText: message }).first()).toBeVisible();
  }

  async expectSuccess(message: string) {
    await this.expectToast(this.successToast, message);
  }

  async expectError(message: string) {
    await this.expectToast(this.errorToast, message);
  }

  async expectInfo(message: string) {
    await this.expectToast(this.infoToast, message);
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

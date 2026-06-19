import { expect, type Locator } from '@playwright/test';

export enum ProgressStatus {
  Started,
  Stopping,
  Stopped,
}

export class UploadRow {
  readonly pauseButton: Locator;
  readonly resumeButton: Locator;
  readonly progressBar: Locator;
  readonly progressText: Locator;

  constructor(readonly row: Locator) {
    this.pauseButton = row.locator('[data-testid="file-upload-pause-btn"]');
    this.resumeButton = row.locator('[data-testid="file-upload-resume-btn"]');
    this.progressBar = row.locator('[data-testid="file-upload-progressbar"]');
    this.progressText = row
      .locator('[data-testid="file-upload-progress"]')
      .filter({ visible: true });
  }

  async waitForVisible(timeout = 3_000) {
    await expect(this.row).toBeVisible({ timeout });
  }

  async waitForHidden(timeout = 15_000) {
    await expect(this.row).toBeHidden({ timeout });
  }

  async pause() {
    await this.pauseButton.click();
  }

  async resume() {
    await this.resumeButton.click();
  }

  async getProgress(): Promise<number> {
    const value = await this.progressBar.getAttribute('aria-valuenow');

    if (!value) {
      throw new Error('Progress value not found');
    }

    return Number(value);
  }

  async waitForProgressGreaterThan(value: number, timeout = 10_000) {
    await expect
      .poll(async () => this.getProgress(), { timeout })
      .toBeGreaterThan(value);
  }

  async waitForCompletion(timeout = 15_000) {
    await expect(this.row).toBeHidden({ timeout });
  }

  async waitForStopping() {
    await this.waitForStatus(ProgressStatus.Stopping);
  }

  async waitForPaused() {
    await this.waitForStatus(ProgressStatus.Stopped);
  }

  async waitForUploading() {
    await this.waitForStatus(ProgressStatus.Started);
  }

  async waitForStableProgress(durationMs = 2_000) {
    await this.progressBar.waitFor({ timeout: durationMs });
  }

  async waitForStatus(status: ProgressStatus, timeout = 10_000) {
    await expect(this.progressText).toHaveAttribute(
      'data-progress-status',
      ProgressStatus[status],
      { timeout },
    );
  }
}

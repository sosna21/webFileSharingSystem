import type { Locator, Page } from '@playwright/test';

export class FileActionsStrip {
  readonly createDirectoryTrigger: Locator;
  readonly createDirectoryInput: Locator;

  constructor(page: Page) {
    this.createDirectoryTrigger = page.getByTestId('directory-create-trigger');
    this.createDirectoryInput = page.getByTestId('directory-create-input');
  }

  async startDirectoryCreation() {
    await this.createDirectoryTrigger.click();
  }

  async createDirectory(name: string) {
    await this.startDirectoryCreation();
    await this.createDirectoryInput.fill(name);
    await this.createDirectoryInput.press('Enter');
  }
}

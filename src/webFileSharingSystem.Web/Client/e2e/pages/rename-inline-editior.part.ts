import { Locator, Page } from '@playwright/test';

export class RenameInlineEditor {
  readonly input: Locator;

  constructor(page: Page) {
    this.input = page.getByTestId('rename-input');
  }

  async renameTo(name: string) {
    await this.input.fill(name);
    await this.input.press('Enter');
  }

  async cancel() {
    await this.input.press('Escape');
  }
}

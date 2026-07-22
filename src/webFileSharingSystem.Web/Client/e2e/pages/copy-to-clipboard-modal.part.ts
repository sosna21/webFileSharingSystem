import { expect, type Locator, type Page } from '@playwright/test';

export class CopyToClipboardModal {
  private readonly page: Page;
  readonly modal: Locator;
  readonly title: Locator;
  readonly input: Locator;
  readonly copyButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId('copy-to-clipboard-modal');

    this.title = this.modal.getByTestId('copy-to-clipboard-modal-title');
    this.input = this.modal.getByTestId('copy-to-clipboard-modal-input');
    this.copyButton = this.modal.getByTestId('copy-to-clipboard-modal-copy');
    this.closeButton = this.modal.getByTestId('copy-to-clipboard-modal-close');
  }

  async expectVisible() {
    await expect(this.modal).toBeVisible();
  }

  async expectTitle(title: string) {
    await expect(this.title).toHaveText(title);
  }

  async expectText(text: string) {
    await expect(this.input).toHaveValue(text);
  }

  async getShareLinkValue(): Promise<string> {
    return this.input.inputValue();
  }

  async copy() {
    await this.copyButton.click();
  }

  async close() {
    await this.closeButton.click();
  }
}

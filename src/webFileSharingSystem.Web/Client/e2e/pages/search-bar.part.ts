import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class SearchBar {
  readonly root: Locator;
  readonly input: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('search');
    this.input = this.root.getByTestId('search-input');
  }

  async expectPlaceholder(text: string) {
    await expect(this.input).toHaveAttribute('placeholder', text);
  }

  async search(searchTerm: string) {
    await this.input.fill(searchTerm);
  }

  async clear() {
    await this.input.clear();
  }

  async expectValue(value: string) {
    await expect(this.input).toHaveValue(value);
  }
}

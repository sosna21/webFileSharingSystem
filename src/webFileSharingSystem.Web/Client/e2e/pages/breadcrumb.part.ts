import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class Breadcrumb {
  readonly root: Locator;
  readonly items: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('navigation', {
      name: 'breadcrumb',
    });

    this.items = this.root.getByTestId('breadcrumb-item');
  }

  async expectPath(path: string[]) {
    await expect(this.items).toHaveText(path);
  }

  item(name: string): Locator {
    return this.items.filter({ hasText: name });
  }

  async navigateTo(name: string) {
    await this.item(name).click();
  }
}

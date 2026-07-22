import type { Locator, Page } from '@playwright/test';

export class Sidebar {
  readonly root: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('navigation', {
      name: 'sidebar',
    });
  }

  link(name: SidebarLink): Locator {
    return this.root.getByTestId(`sidebar-link-${name}`);
  }

  async navigateTo(name: SidebarLink) {
    await this.link(name).click();
  }
}

export type SidebarLink =
  | 'home'
  | 'shared-with-me'
  | 'shared-by-me'
  | 'favourite'
  | 'recent';

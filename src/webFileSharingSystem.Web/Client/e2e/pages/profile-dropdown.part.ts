import { type Locator, type Page } from '@playwright/test';

export class ProfileDropdown {
  readonly page: Page;
  readonly toggle: Locator;
  readonly signOut: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toggle = page
      .getByTestId('profile-dropdown-toggle')
      .filter({ visible: true });
    this.signOut = page
      .getByTestId('profile-signout')
      .filter({ visible: true });
  }

  async open() {
    await this.toggle.click();
  }

  async logout() {
    await this.open();
    await this.signOut.click();
  }
}

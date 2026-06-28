import { expect, type Locator, type Page } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly username: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly confirmPassword: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.username = page.getByTestId('register-username');
    this.email = page.getByTestId('register-email');
    this.password = page.getByTestId('register-password');
    this.confirmPassword = page.getByTestId('register-confirm-password');
    this.submit = page.getByTestId('register-submit');
  }

  async goto() {
    await this.page.goto('/register');
  }

  async register(values: {
    username: string;
    email: string;
    password: string;
  }) {
    await this.username.fill(values.username);
    await this.email.fill(values.email);
    await this.password.fill(values.password);
    await this.confirmPassword.fill(values.password);
    await this.submit.click();
  }

  async expectVisible() {
    await expect(this.username).toBeVisible();
  }
}

import { expect, type Locator, type Page } from '@playwright/test';

export class DirectoryCreationModal {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByTestId('directory-creation-modal-input');
    this.createButton = page.getByTestId('directory-creation-modal-create');
    this.cancelButton = page.getByTestId('directory-creation-modal-cancel');
  }

  async waitForVisible(timeout = 3_000) {
    await expect(this.nameInput).toBeVisible({ timeout });
  }

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async confirm() {
    await this.createButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async create(name: string) {
    await this.fillName(name);
    await this.confirm();
  }
}

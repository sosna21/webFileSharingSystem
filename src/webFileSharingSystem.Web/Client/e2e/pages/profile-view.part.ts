import { expect, type Locator } from '@playwright/test';

export class ProfileView {
  readonly root: Locator;
  readonly content: Locator;
  readonly avatar: Locator;
  readonly userName: Locator;
  readonly email: Locator;

  constructor(root: Locator) {
    this.root = root.getByTestId('profile-view');
    this.content = this.root.getByTestId('profile-view-content');
    this.avatar = this.root.getByTestId('profile-view-avatar');
    this.userName = this.root.getByTestId('profile-view-user-name');
    this.email = this.root.getByTestId('profile-view-email');
  }

  async expectVisible() {
    await expect(this.root).toBeVisible();
  }

  async expectUserName(userName: string) {
    await expect(this.userName).toHaveText(userName);
  }

  async expectEmail(email: string) {
    await expect(this.email).toHaveText(email);
  }

  async expectAvatarVisible() {
    await expect(this.avatar).toBeVisible();
  }

  async expectAvatarSrc(pattern: string | RegExp) {
    await expect(this.avatar).toHaveAttribute('src', pattern);
  }

  async avatarSrc(): Promise<string> {
    return (await this.avatar.getAttribute('src')) ?? '';
  }
}

import { Page, Locator, expect } from '@playwright/test';
import { ProfilePhotoDropzone } from './profile-photo-dropzone.part';
import { ProfileImageCropper } from './profile-image-cropper.part';
import { ProfileView } from './profile-view.part';

export class ProfilePage {
  readonly page: Page;
  readonly root: Locator;

  readonly view: ProfileView;
  readonly dropzone: ProfilePhotoDropzone;
  readonly cropper: ProfileImageCropper;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('profile-component');

    this.view = new ProfileView(this.root);
    this.dropzone = new ProfilePhotoDropzone(this.root);
    this.cropper = new ProfileImageCropper(this.root);
  }

  async goto() {
    await this.page.goto('/profile');
  }

  async expectVisible() {
    await expect(this.root).toBeVisible();
  }
}

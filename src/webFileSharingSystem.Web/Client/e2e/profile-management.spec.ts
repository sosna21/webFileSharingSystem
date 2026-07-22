import { Page } from '@playwright/test';
import { expect, test } from './fixtures/authenticated-fixture';
import { createTempImage } from './helpers/images';
import { ProfilePage } from './pages/profile.page';
import { ToastNotification } from './pages/toast-notifications.part';

async function blobToBuffer(page: Page, blobUrl: string): Promise<Buffer> {
  const bytes = await page.evaluate(async (url) => {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
  }, blobUrl);

  return Buffer.from(bytes);
}

test.describe('Profile Photo Management', () => {
  test('Upload profile photo', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const profile = new ProfilePage(page);

    await profile.goto();
    await profile.expectVisible();
    await profile.view.expectVisible();

    const avatarBefore = await profile.view.avatarSrc();
    const imagePath = await createTempImage(
      page.context().browser()!,
      testInfo,
      'profile-photo.png',
    );
    await profile.dropzone.upload(imagePath);

    await profile.cropper.expectVisible();
    // Cropper auto-crops by default.
    await profile.cropper.save();

    await profile.view.expectVisible();
    await expect
      .poll(async () => profile.view.avatarSrc())
      .not.toBe(avatarBefore);
  });

  test('Profile photo persists after reload', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const profile = new ProfilePage(page);

    await profile.goto();
    await profile.expectVisible();
    await profile.view.expectVisible();

    const avatarBefore = await profile.view.avatarSrc();
    const imagePath = await createTempImage(
      page.context().browser()!,
      testInfo,
      'profile-photo.png',
    );
    await profile.dropzone.upload(imagePath);

    await profile.cropper.expectVisible();
    // Cropper auto-crops by default.
    await profile.cropper.save();

    await profile.view.expectVisible();
    await expect
      .poll(async () => profile.view.avatarSrc())
      .not.toBe(avatarBefore);

    const avatarBeforeReload = await blobToBuffer(
      page,
      await profile.view.avatarSrc(),
    );

    await page.reload();

    const avatarAfterReload = await blobToBuffer(
      page,
      await profile.view.avatarSrc(),
    );

    expect(Buffer.compare(avatarBeforeReload, avatarAfterReload)).toBe(0);
  });

  test('Cancel crop', async ({ authenticatedPage: page }, testInfo) => {
    const profile = new ProfilePage(page);

    await profile.goto();
    await profile.expectVisible();
    await profile.view.expectVisible();

    const avatarBefore = await profile.view.avatarSrc();
    const imagePath = await createTempImage(
      page.context().browser()!,
      testInfo,
      'profile-photo.png',
    );
    await profile.dropzone.upload(imagePath);

    await profile.cropper.expectVisible();
    await profile.cropper.cancel();
    await profile.cropper.expectHidden();

    await profile.view.expectVisible();
    await profile.dropzone.expectVisible();
    await profile.view.expectAvatarSrc(avatarBefore);
  });

  test('Reject unsupported profile photo format', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const profile = new ProfilePage(page);
    const notifications = new ToastNotification(page);

    await profile.goto();
    await profile.expectVisible();
    await profile.view.expectVisible();

    const avatarBefore = await profile.view.avatarSrc();

    const imagePath = await createTempImage(
      page.context().browser()!,
      testInfo,
      'profile-photo.webp',
    );

    await profile.dropzone.upload(imagePath);

    await notifications.expectError('Invalid format');

    await profile.cropper.expectHidden();
    await profile.dropzone.expectVisible();
    await profile.view.expectAvatarSrc(avatarBefore);
  });

  test('Remove profile photo', async ({
    authenticatedPage: page,
  }, testInfo) => {
    const profile = new ProfilePage(page);
    const notifications = new ToastNotification(page);

    await profile.goto();
    await profile.expectVisible();
    await profile.view.expectVisible();

    const avatarBefore = await profile.view.avatarSrc();
    const imagePath = await createTempImage(
      page.context().browser()!,
      testInfo,
      'profile-photo.png',
    );
    await profile.dropzone.upload(imagePath);

    await profile.cropper.expectVisible();
    // Cropper auto-crops by default.
    await profile.cropper.save();

    await profile.view.expectVisible();
    await expect
      .poll(async () => profile.view.avatarSrc())
      .not.toBe(avatarBefore);
    await profile.view.removeProfilePhoto();
    await notifications.expectSuccess('Photo Deleted');
    await profile.view.expectAvatarSrc(avatarBefore);
  });
});

import { expect, type Locator, type Page } from '@playwright/test';

export class UserFilesContextMenu {
  readonly desktopMenu: Locator;
  readonly mobileMenu: Locator;

  readonly openDirectoryTrigger: Locator;
  readonly openContainingFolderTrigger: Locator;

  readonly downloadTrigger: Locator;
  readonly renameTrigger: Locator;
  readonly copyTrigger: Locator;
  readonly moveTrigger: Locator;
  readonly favouriteTrigger: Locator;
  readonly shareTrigger: Locator;
  readonly manageSharesTrigger: Locator;
  readonly generateShareLinkTrigger: Locator;
  readonly deleteTrigger: Locator;

  readonly pauseUploadTrigger: Locator;
  readonly resumeUploadTrigger: Locator;
  readonly cancelUploadTrigger: Locator;

  readonly manageUploadsTrigger: Locator;
  readonly manageFilesTrigger: Locator;

  constructor(page: Page, menuType: 'desktop' | 'mobile' = 'desktop') {
    this.desktopMenu = page.getByTestId('desktop-context-menu');
    this.mobileMenu = page.getByTestId('mobile-context-menu');

    const container =
      menuType === 'desktop' ? this.desktopMenu : this.mobileMenu;

    this.openDirectoryTrigger = container.getByTestId(
      'context-menu-open-folder',
    );
    this.openContainingFolderTrigger = container.getByTestId(
      'context-menu-open-directory',
    );

    this.downloadTrigger = container.getByTestId('context-menu-download');
    this.renameTrigger = container.getByTestId('context-menu-rename');
    this.copyTrigger = container.getByTestId('context-menu-copy');
    this.moveTrigger = container.getByTestId('context-menu-cut');
    this.favouriteTrigger = container.getByTestId('context-menu-favourite');
    this.shareTrigger = container.getByTestId('context-menu-share');
    this.manageSharesTrigger = container.getByTestId(
      'context-menu-manage-shares',
    );
    this.generateShareLinkTrigger = container.getByTestId(
      'context-menu-share-link',
    );
    this.deleteTrigger = container.getByTestId('context-menu-delete');

    this.pauseUploadTrigger = container.getByTestId(
      'context-menu-pause-upload',
    );
    this.resumeUploadTrigger = container.getByTestId(
      'context-menu-resume-upload',
    );
    this.cancelUploadTrigger = container.getByTestId(
      'context-menu-cancel-upload',
    );

    this.manageUploadsTrigger = container.getByTestId(
      'context-menu-manage-uploads',
    );
    this.manageFilesTrigger = container.getByTestId(
      'context-menu-manage-files',
    );
  }

  async waitForVisible() {
    await expect(
      this.downloadTrigger
        .or(this.pauseUploadTrigger)
        .or(this.manageUploadsTrigger),
    ).toBeVisible();
  }

  // Mixed selection menu

  async openManageUploads() {
    await this.manageUploadsTrigger.click();
  }

  async openManageFiles() {
    await this.manageFilesTrigger.click();
  }

  // Upload actions

  async pauseSelectedUploads() {
    await this.pauseUploadTrigger.click();
  }

  async resumeSelectedUploads() {
    await this.resumeUploadTrigger.click();
  }

  async cancelSelectedUploads() {
    await this.cancelUploadTrigger.click();
  }

  // File / directory actions

  async openDirectory() {
    await this.openDirectoryTrigger.click();
  }

  async openContainingDirectory() {
    await this.openContainingFolderTrigger.click();
  }

  async downloadSelection() {
    await this.downloadTrigger.click();
  }

  async initiateRename() {
    await this.renameTrigger.click();
  }

  async initiateCopy() {
    await this.copyTrigger.click();
  }

  async initiateMove() {
    await this.moveTrigger.click();
  }

  async toggleFavourite() {
    await this.favouriteTrigger.click();
  }

  async shareSelection() {
    await this.shareTrigger.click();
  }

  async openShareManagement() {
    await this.manageSharesTrigger.click();
  }

  async generateShareLink() {
    await this.generateShareLinkTrigger.click();
  }

  async deleteSelection() {
    await this.deleteTrigger.click();
  }

  // Availability assertions

  async expectRenameEnabled() {
    await expect(this.renameTrigger).toBeEnabled();
  }

  async expectRenameDisabled() {
    await expect(this.renameTrigger).toBeDisabled();
  }

  async expectMoveEnabled() {
    await expect(this.moveTrigger).toBeEnabled();
  }

  async expectMoveDisabled() {
    await expect(this.moveTrigger).toBeDisabled();
  }

  async expectCopyEnabled() {
    await expect(this.copyTrigger).toBeEnabled();
  }

  async expectCopyDisabled() {
    await expect(this.copyTrigger).toBeDisabled();
  }

  async expectDeleteEnabled() {
    await expect(this.deleteTrigger).toBeEnabled();
  }

  async expectDeleteDisabled() {
    await expect(this.deleteTrigger).toBeDisabled();
  }

  async expectShareEnabled() {
    await expect(this.shareTrigger).toBeEnabled();
  }

  async expectShareDisabled() {
    await expect(this.shareTrigger).toBeDisabled();
  }

  async expectPauseEnabled() {
    await expect(this.pauseUploadTrigger).toBeEnabled();
  }

  async expectPauseDisabled() {
    await expect(this.pauseUploadTrigger).toBeDisabled();
  }

  async expectResumeEnabled() {
    await expect(this.resumeUploadTrigger).toBeEnabled();
  }

  async expectResumeDisabled() {
    await expect(this.resumeUploadTrigger).toBeDisabled();
  }
}

import { expect, type Locator, type Page } from '@playwright/test';

const disabledClass = 'disabled';
export class FileActionsStrip {
  readonly createDirectoryTrigger: Locator;
  readonly createDirectoryInput: Locator;
  readonly cutFilesTrigger: Locator;
  readonly copyFilesTrigger: Locator;
  readonly pasteFilesTrigger: Locator;
  readonly downloadFilesTrigger: Locator;
  readonly renameFileTrigger: Locator;
  readonly shareFilesTrigger: Locator;
  readonly deleteFilesTrigger: Locator;

  constructor(page: Page) {
    this.createDirectoryInput = page.getByTestId('directory-create-input');
    this.createDirectoryTrigger = page.getByTestId('directory-create-trigger');
    this.cutFilesTrigger = page.getByTestId('cut-files-trigger');
    this.copyFilesTrigger = page.getByTestId('copy-files-trigger');
    this.pasteFilesTrigger = page.getByTestId('paste-files-trigger');
    this.downloadFilesTrigger = page.getByTestId('download-files-trigger');
    this.renameFileTrigger = page.getByTestId('rename-files-trigger');
    this.shareFilesTrigger = page.getByTestId('share-files-trigger');
    this.deleteFilesTrigger = page.getByTestId('delete-files-trigger');
  }

  async startDirectoryCreation() {
    await this.createDirectoryTrigger.click();
  }

  async createDirectory(name: string) {
    await this.startDirectoryCreation();
    await this.createDirectoryInput.fill(name);
    await this.createDirectoryInput.press('Enter');
  }

  async initiateMoveForSelectedFiles() {
    await this.cutFilesTrigger.click();
  }

  async initiateCopyForSelectedFiles() {
    await this.copyFilesTrigger.click();
  }

  async pasteFilesToCurrentLocation() {
    await this.pasteFilesTrigger.click();
  }

  async downloadSelectedFiles() {
    await this.downloadFilesTrigger.click();
  }

  async initiateRename() {
    await this.renameFileTrigger.click();
  }

  async shareSelectedFiles() {
    await this.shareFilesTrigger.click();
  }

  async deleteSelection() {
    await this.deleteFilesTrigger.click();
  }

  // Availability assertions
  async expectRenameEnabled() {
    await this.expectTriggerEnabled(this.renameFileTrigger);
  }

  async expectRenameDisabled() {
    await this.expectTriggerDisabled(this.renameFileTrigger);
  }

  async expectMoveEnabled() {
    await this.expectTriggerEnabled(this.cutFilesTrigger);
  }

  async expectMoveDisabled() {
    await this.expectTriggerDisabled(this.cutFilesTrigger);
  }

  async expectCopyEnabled() {
    await this.expectTriggerEnabled(this.copyFilesTrigger);
  }

  async expectPasteEnabled() {
    await this.expectTriggerEnabled(this.pasteFilesTrigger);
  }

  async expectPasteDisabled() {
    await this.expectTriggerDisabled(this.pasteFilesTrigger);
  }
  
  async expectCopyDisabled() {
    await this.expectTriggerDisabled(this.copyFilesTrigger);
  }

  async expectDeleteEnabled() {
    await this.expectTriggerEnabled(this.deleteFilesTrigger);
  }

  async expectDeleteDisabled() {
    await this.expectTriggerDisabled(this.deleteFilesTrigger);
  }

  private async expectTriggerEnabled(trigger: Locator) {
    await expect(trigger).not.toContainClass(disabledClass);
  }

  private async expectTriggerDisabled(trigger: Locator) {
    await expect(trigger).toContainClass(disabledClass);
  }
}

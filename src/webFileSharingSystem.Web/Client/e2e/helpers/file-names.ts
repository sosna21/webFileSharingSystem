import type { TestInfo } from '@playwright/test';

export function createDirectoryName(
  testInfo: TestInfo,
  prefix: string = 'folder',
): string {
  return `${prefix}-${testInfo.parallelIndex}-${Date.now()}`;
}

export function createFileName(
  testInfo: TestInfo,
  prefix: string = 'file',
  extension: string = 'txt',
): string {
  return `${prefix}-${Date.now()}-${testInfo.parallelIndex}.${extension}`;
}

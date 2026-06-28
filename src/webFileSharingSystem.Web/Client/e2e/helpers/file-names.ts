import type { TestInfo } from '@playwright/test';
import path from 'path/win32';

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

export function getFileNameOnCopy(fileName: string, copyIndex: number): string {
  const parsed = path.parse(fileName);
  return `${parsed.name} - Copy${copyIndex > 1 ? ` (${copyIndex})` : ''}${parsed.ext}`;
}

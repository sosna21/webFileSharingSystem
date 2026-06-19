import { promises as fs } from 'fs';
import path from 'path';
import type { TestInfo } from '@playwright/test';

export type FileEntry = {
  path: string;
  content: string;
  mimeType?: string;
};

export async function createTempFile(
  testInfo: TestInfo,
  name: string,
  content: string,
): Promise<string> {
  const filePath = testInfo.outputPath('uploads', name);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

export async function createFolderStructure(
  testInfo: TestInfo,
  rootName: string,
  entries: FileEntry[],
): Promise<string> {
  const rootPath = testInfo.outputPath('uploads', rootName);
  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, entry.content, 'utf8');
  }
  return rootPath;
}

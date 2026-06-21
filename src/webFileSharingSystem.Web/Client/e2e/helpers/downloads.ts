import type { Download, Page } from '@playwright/test';
import { promises as fs } from 'fs';

export async function captureDownload(
  page: Page,
  action: () => Promise<void>,
  timeout = 30000,
): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout }),
    action(),
  ]);

  return download;
}

export async function readDownloadBuffer(download: Download): Promise<Buffer> {
  const path = await download.path();
  if (!path) throw new Error('Download path is null');
  return fs.readFile(path);
}

import { Browser, TestInfo } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

export async function createTempImage(
  browser: Browser,
  testInfo: TestInfo,
  fileName: string,
): Promise<string> {
  const dir = path.join(testInfo.outputDir, 'temp-images');

  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, fileName);

  const context = await browser.newContext({
    viewport: { width: 256, height: 256 },
  });

  const page = await context.newPage();

  await page.setContent(`
    <body style="
      margin:0;
      width:100vw;
      height:100vh;
      background:#4f8ef7;
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-family:sans-serif;
      font-size:48px;
    ">
      👤
    </body>
  `);

  await page.screenshot({
    path: filePath,
    type: 'png',
  });

  await context.close();

  return filePath;
}

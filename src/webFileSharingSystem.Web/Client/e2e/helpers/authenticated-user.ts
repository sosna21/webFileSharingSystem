import { type Browser, type BrowserContext, type Page } from '@playwright/test';
import { registerAndLogin, type SeededUser } from './api';
import { createCredentials } from './credentials';

export type AuthenticatedUser = {
  user: SeededUser;
  context: BrowserContext;
  page: Page;
};

export async function createUserContext(
  browser: Browser,
  request: Parameters<typeof registerAndLogin>[0],
): Promise<AuthenticatedUser> {
  const credentials = createCredentials();
  const seededUser = await registerAndLogin(request, credentials);

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript(
    ({ seededUser }) => {
      localStorage.setItem('currentUser', JSON.stringify(seededUser));
    },
    { seededUser },
  );

  await page.goto('/disc/home');

  return {
    user: seededUser,
    context,
    page,
  };
}

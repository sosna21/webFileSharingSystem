import { test as base, expect, type Page } from '@playwright/test';
import { registerAndLogin, type SeededUser } from '../helpers/api';
import { createCredentials } from '../helpers/credentials';

type Fixtures = {
  seededUser: SeededUser;
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  seededUser: async ({ request }, use) => {
    const credentials = createCredentials();
    const user = await registerAndLogin(request, credentials);
    await use(user);
  },
  authenticatedPage: async ({ page, seededUser }, use) => {
    await page.addInitScript(
      ({ seededUser }) => {
        localStorage.setItem('currentUser', JSON.stringify(seededUser));
      },
      { seededUser },
    );
    await page.goto('/disc/home');
    await use(page);
  },
});

export { expect };

import {
  test as base,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { registerAndLogin, type SeededUser } from '../helpers/api';
import { createCredentials } from '../helpers/credentials';

type AuthenticatedUser = {
  user: SeededUser;
  context: BrowserContext;
  page: Page;
};

type Fixtures = {
  owner: AuthenticatedUser;
  recipient: AuthenticatedUser;
};

async function createAuthenticatedUser(
  browser: Browser,
  seededUser: SeededUser,
): Promise<AuthenticatedUser> {
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

export const test = base.extend<Fixtures>({
  owner: async ({ browser, request }, use) => {
    const credentials = createCredentials();
    const seededUser = await registerAndLogin(request, credentials);

    const owner = await createAuthenticatedUser(browser, seededUser);

    try {
      await use(owner);
    } finally {
      await owner.context.close();
    }
  },

  recipient: async ({ browser, request }, use) => {
    const credentials = createCredentials();
    const seededUser = await registerAndLogin(request, credentials);

    const recipient = await createAuthenticatedUser(browser, seededUser);

    try {
      await use(recipient);
    } finally {
      await recipient.context.close();
    }
  },
});

export { expect };

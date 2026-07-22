import { test as base, expect, type Browser } from '@playwright/test';
import { registerAndLogin } from '../helpers/api';
import {
  AuthenticatedUser,
  createUserContext,
} from '../helpers/authenticated-user';

async function withAuthenticatedUser(
  browser: Browser,
  request: Parameters<typeof registerAndLogin>[0],
  use: (user: AuthenticatedUser) => Promise<void>,
) {
  const user = await createUserContext(browser, request);

  try {
    await use(user);
  } finally {
    await user.context.close();
  }
}

type Fixtures = {
  owner: AuthenticatedUser;
  recipient: AuthenticatedUser;
  createUser: () => Promise<AuthenticatedUser>;
};

export const test = base.extend<Fixtures>({
  owner: async ({ browser, request }, use) => {
    await withAuthenticatedUser(browser, request, use);
  },

  recipient: async ({ browser, request }, use) => {
    await withAuthenticatedUser(browser, request, use);
  },

  createUser: async ({ browser, request }, use) => {
    const createdUsers: AuthenticatedUser[] = [];

    await use(async () => {
      const user = await createUserContext(browser, request);
      createdUsers.push(user);
      return user;
    });

    await Promise.all(createdUsers.map((user) => user.context.close()));
  },
});

export { expect };

import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/api';
import { createCredentials } from './helpers/credentials';
import { DiscHomePage } from './pages/disc-home.page';
import { LoginPage } from './pages/login.page';
import { ProfileDropdown } from './pages/profile-dropdown.part';
import { RegisterPage } from './pages/register.page';

test.describe('Authentication Flow', () => {
  test('register', async ({ page }) => {
    const credentials = createCredentials();
    const registerPage = new RegisterPage(page);
    const loginPage = new LoginPage(page);

    await registerPage.goto();
    await registerPage.register(credentials);

    await expect(page).toHaveURL(/\/login$/);
    await loginPage.expectVisible();
  });

  test('login', async ({ page, request }) => {
    const credentials = createCredentials();
    await registerUser(request, credentials);

    const loginPage = new LoginPage(page);
    const homePage = new DiscHomePage(page);
    const profileDropdown = new ProfileDropdown(page);

    await loginPage.goto();
    await loginPage.login(credentials.username, credentials.password);

    await expect(page).toHaveURL(/\/disc\/home$/);
    await homePage.expectVisible();
    await expect(profileDropdown.toggle).toContainText(credentials.username);
  });

  test('logout', async ({ page, request }) => {
    const credentials = createCredentials();
    await registerUser(request, credentials);

    const loginPage = new LoginPage(page);
    const profileDropdown = new ProfileDropdown(page);

    await loginPage.goto();
    await loginPage.login(credentials.username, credentials.password);
    await profileDropdown.logout();

    await expect(page).toHaveURL(/\/login$/);
    const storedUser = await page.evaluate(() => localStorage.getItem('currentUser'));
    expect(storedUser).toBeNull();
  });
});

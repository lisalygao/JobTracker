import { expect, test, type Page } from '@playwright/test';

// These tests exercise the built content scripts against local fixture pages
// that mimic LinkedIn's Easy Apply modal and an ATS confirmation page.
// The chrome extension API is stubbed so the scripts run on a plain page:
// selectors.json is fetched from /public/, and sendMessage calls are
// recorded on window.__sentMessages instead of reaching a service worker.
//
// Run `npm run build` first — the spec injects dist/content/*.js.

declare global {
  interface Window {
    __sentMessages: unknown[];
  }
}

async function stubChrome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__sentMessages = [];
    // Minimal stub of the extension APIs the content scripts touch.
    (window as unknown as Record<string, unknown>).chrome = {
      runtime: {
        getURL: (path: string) => `/public/${path}`,
        sendMessage: async (message: unknown) => {
          window.__sentMessages.push(message);
          return { ok: true };
        },
        onMessage: { addListener: () => {} },
      },
    };
  });
}

test('LinkedIn detector: toast on submitted modal, save sends the application', async ({
  page,
}) => {
  await stubChrome(page);
  await page.goto('/tests/e2e/fixtures/easy-apply.html');
  await page.addScriptTag({ path: 'dist/content/linkedin.js' });

  // No toast before the confirmation modal exists.
  await expect(page.locator('#jobtracker-toast-host')).toHaveCount(0);

  await page.click('#apply');
  const toast = page.locator('#jobtracker-toast-host');
  await expect(toast).toHaveCount(1);
  await expect(toast.locator('input.company')).toHaveValue('Acme');
  await expect(toast.locator('input.role')).toHaveValue('Senior Frontend Engineer');

  await toast.locator('button.save').click();
  await expect(toast).toHaveCount(0);

  const messages = await page.evaluate(() => window.__sentMessages);
  expect(messages).toHaveLength(1);
  expect(messages[0]).toMatchObject({
    type: 'SAVE_APPLICATION',
    candidate: {
      company: 'Acme',
      role_title: 'Senior Frontend Engineer',
      source: 'linkedin_easy_apply',
    },
  });
});

test('LinkedIn detector: dismiss saves nothing', async ({ page }) => {
  await stubChrome(page);
  await page.goto('/tests/e2e/fixtures/easy-apply.html');
  await page.addScriptTag({ path: 'dist/content/linkedin.js' });

  await page.click('#apply');
  const toast = page.locator('#jobtracker-toast-host');
  await expect(toast).toHaveCount(1);
  await toast.locator('button.dismiss').click();
  await expect(toast).toHaveCount(0);

  expect(await page.evaluate(() => window.__sentMessages)).toHaveLength(0);
});

test('ATS detector: fires on a confirmation page with edited fields saved', async ({ page }) => {
  await stubChrome(page);
  await page.goto('/tests/e2e/fixtures/greenhouse-confirmation.html');
  await page.addScriptTag({ path: 'dist/content/ats.js' });

  const toast = page.locator('#jobtracker-toast-host');
  await expect(toast).toHaveCount(1);
  await expect(toast.locator('input.company')).toHaveValue('Acme');
  await expect(toast.locator('input.role')).toHaveValue('Senior Backend Engineer');

  // The toast supports inline edits before saving.
  await toast.locator('input.company').fill('Acme Inc.');
  await toast.locator('button.save').click();
  await expect(toast).toHaveCount(0);

  const messages = await page.evaluate(() => window.__sentMessages);
  expect(messages[0]).toMatchObject({
    type: 'SAVE_APPLICATION',
    candidate: { company: 'Acme Inc.', role_title: 'Senior Backend Engineer' },
  });
});

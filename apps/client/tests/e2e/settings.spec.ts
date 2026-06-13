import { test, expect, gotoApp } from './helpers/fixtures.js';
import { assertNoPseudoLeakage, isPseudoProject } from './helpers/pseudo-leakage.js';

declare global {
  interface Window {
    __twFlushSave?: () => Promise<void>;
  }
}

test('Polish: notifications default off, opt-in persists; online-only labeled', async ({
  page,
}, testInfo) => {
  await gotoApp(page, testInfo);
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill('Settler');
  await page.getByTestId('settlement-settlement.thornholt').click();
  await page.getByTestId('create-begin').click();
  await expect(page.locator('[data-screen="home"]')).toBeVisible();

  await page.getByTestId('nav-settings').click();
  await expect(page.locator('[data-screen="settings"]')).toBeVisible();

  // Every category is opted out by default (FR-064).
  const caravan = page.getByTestId('notify-toggle-caravan-arrival');
  await expect(caravan).not.toBeChecked();
  // The online-only category is shown but honestly labeled (FR-262).
  await expect(page.getByTestId('notify-online-only-committed-start-approaching')).toBeVisible();
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  // Opt in; the preference persists across a reload.
  await caravan.check();
  await expect(caravan).toBeChecked();
  await page.evaluate(() => window.__twFlushSave!());
  await page.reload();
  await page.waitForFunction(() => !!window.__twTestClock);
  await page.getByTestId('nav-settings').click();
  await expect(page.getByTestId('notify-toggle-caravan-arrival')).toBeChecked();
});

test('Polish: language selection persists across reload', async ({ page }, testInfo) => {
  // The pseudo projects force the locale via URL on every load (test harness),
  // which deliberately overrides persistence — so this check is default-only.
  test.skip(isPseudoProject(testInfo.project.name), 'locale is URL-forced in pseudo projects');
  await gotoApp(page, testInfo);
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill('Settler');
  await page.getByTestId('settlement-settlement.thornholt').click();
  await page.getByTestId('create-begin').click();
  await expect(page.locator('[data-screen="home"]')).toBeVisible();

  await page.getByTestId('nav-settings').click();
  // The two generated validation locales never appear; only shipped 'en'.
  await expect(page.getByTestId('locale-en')).toBeVisible();
  await page.getByTestId('locale-en').click();
  await expect(page.getByTestId('locale-en')).toHaveAttribute('aria-pressed', 'true');

  await page.evaluate(() => window.__twFlushSave!());
  await page.reload();
  await page.waitForFunction(() => !!window.__twTestClock);
  await page.getByTestId('nav-settings').click();
  await expect(page.getByTestId('locale-en')).toHaveAttribute('aria-pressed', 'true');
});

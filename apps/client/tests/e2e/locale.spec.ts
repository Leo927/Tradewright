import { test, expect, gotoApp, advanceClock, projectLocale } from './helpers/fixtures.js';

const CJK_NAME = '雪村アリス·Ærø';

async function createAndWork(page: import('@playwright/test').Page) {
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill(CJK_NAME);
  await page.getByTestId('settlement-settlement.thornholt').click();
  await page.getByTestId('create-begin').click();
  await page.getByTestId('find-work').click();
  await page.getByTestId('activity-activity.fell-pines').click();
  await page.getByTestId('confirm-start').click();
  await advanceClock(page, 2 * 60);
  await expect(page.getByTestId('stored-item.pinewood')).toContainText('2');
}

test('US0-b/d/g: mid-session live switch re-renders every screen, values and engine state untouched', async ({
  page,
}, testInfo) => {
  await gotoApp(page, testInfo);
  await createAndWork(page);

  const startLocale = projectLocale(testInfo);
  const target = startLocale === 'en' ? 'pseudo-expand' : 'en';
  const before = await page.evaluate(() => window.__twWorldState!());
  const walletBefore = await page.getByTestId('wallet').textContent();

  await page.evaluate((l) => window.__twSetLocale!(l), target);

  const heading = page.getByTestId('settlement-name');
  if (target === 'pseudo-expand') {
    await expect(heading).toContainText('⟦', { timeout: 2000 });
  } else {
    await expect(heading).toHaveText('Thornholt', { timeout: 2000 });
  }

  await expect(page.getByTestId('character-name')).toHaveText(CJK_NAME);
  const walletAfter = await page.getByTestId('wallet').textContent();
  expect(walletAfter?.replace(/[^\d]/g, '')).toBe(walletBefore?.replace(/[^\d]/g, ''));
  const after = await page.evaluate(() => window.__twWorldState!());
  expect(after).toBe(before);

  await page.getByTestId('nav-settings').click();
  if (target === 'pseudo-expand') {
    await expect(page.locator('[data-screen="settings"] h1')).toContainText('⟦');
  } else {
    await expect(page.locator('[data-screen="settings"] h1')).toHaveText('Settings');
  }
});

test('US0-e: a key missing from the active validation locale renders the base string', async ({
  page,
}, testInfo) => {
  test.skip(projectLocale(testInfo) === 'en', 'needs a non-base active locale');
  await gotoApp(page, testInfo, { params: { 'drop-key': 'firstrun.begin' } });
  const begin = page.getByTestId('begin');
  await expect(begin).toHaveText('Begin');
  await expect(begin).not.toHaveText(/firstrun\.begin/);
});

test('US0-b (US2): a locale switch re-renders a pending summary in place (FR-076)', async ({
  page,
}, testInfo) => {
  await gotoApp(page, testInfo);
  await createAndWork(page);
  await page.evaluate(() => window.__twFlushSave!());
  await page.evaluate(() => sessionStorage.setItem('tw-clock-offset', String(8 * 3600 * 1000)));
  await page.reload();
  await page.waitForFunction(() => !!window.__twTestClock);

  const modal = page.getByTestId('return-summary');
  await expect(modal).toBeVisible();
  const startLocale = projectLocale(testInfo);
  const target = startLocale === 'en' ? 'pseudo-expand' : 'en';
  await page.evaluate((l) => window.__twSetLocale!(l), target);
  if (target === 'pseudo-expand') {
    await expect(modal.locator('h2')).toContainText('⟦', { timeout: 2000 });
  } else {
    await expect(modal.locator('h2')).toHaveText('While you were away', { timeout: 2000 });
  }
  await expect(modal.getByTestId('summary-row-0')).toBeVisible();
});

declare global {
  interface Window {
    __twFlushSave?: () => Promise<void>;
  }
}

test('US0-b (US4): a locale switch re-renders populated transaction history (FR-076)', async ({
  page,
}, testInfo) => {
  await gotoApp(page, testInfo);
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill('Ledger');
  await page.getByTestId('settlement-settlement.brackwater').click();
  await page.getByTestId('create-begin').click();

  // Populate the ledger with a trade in addition to the starter grant.
  await page.evaluate(() => window.__twGrant!('settlement.brackwater', 'item.silverfin', 5));
  await page.getByTestId('nav-market').click();
  await page.getByTestId('market-item-item.silverfin').click();
  await page.getByTestId('order-side-sell').click();
  await page.getByTestId('order-qty').fill('5');
  await page.getByTestId('order-price').fill('2');
  await page.getByTestId('place-order').click();
  await advanceClock(page, 30 * 60);

  await page.getByTestId('nav-transactions').click();
  const list = page.getByTestId('txn-list');
  await expect(list).toBeVisible();

  const startLocale = projectLocale(testInfo);
  const target = startLocale === 'en' ? 'pseudo-expand' : 'en';
  await page.evaluate((l) => window.__twSetLocale!(l), target);
  if (target === 'pseudo-expand') {
    await expect(list).toContainText('⟦', { timeout: 2000 });
  } else {
    await expect(list).toContainText('Starting coin', { timeout: 2000 });
  }
});

test('US0-g: player-authored names render verbatim in every locale (FR-078)', async ({
  page,
}, testInfo) => {
  await gotoApp(page, testInfo);
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill(CJK_NAME);
  await page.getByTestId('settlement-settlement.brackwater').click();
  await page.getByTestId('create-begin').click();
  await expect(page.getByTestId('character-name')).toHaveText(CJK_NAME);
  const other = projectLocale(testInfo) === 'en' ? 'pseudo-cjk' : 'en';
  await page.evaluate((l) => window.__twSetLocale!(l), other);
  await expect(page.getByTestId('character-name')).toHaveText(CJK_NAME);
});

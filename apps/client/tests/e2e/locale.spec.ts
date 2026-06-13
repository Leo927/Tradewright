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

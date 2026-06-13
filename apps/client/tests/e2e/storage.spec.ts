import { test, expect, gotoApp } from './helpers/fixtures.js';
import { assertNoPseudoLeakage, isPseudoProject } from './helpers/pseudo-leakage.js';

declare global {
  interface Window {
    __twGrantCoin?: (amount: number) => void;
  }
}

test('Polish: storage expansion at escalating cost, capped at the facility tier', async ({
  page,
}, testInfo) => {
  await gotoApp(page, testInfo);
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill('Keeper');
  await page.getByTestId('settlement-settlement.brackwater').click();
  await page.getByTestId('create-begin').click();
  await expect(page.locator('[data-screen="home"]')).toBeVisible();

  // Top up so the coin sink can be exercised (expansions cost 200 + 320 + 512).
  await page.evaluate(() => window.__twGrantCoin!(2000));

  await page.getByTestId('manage-storage').click();
  await expect(page.locator('[data-screen="storage"]')).toBeVisible();
  await expect(page.getByTestId('storage-capacity')).toContainText('4,000');
  await expect(page.getByTestId('expansion-cost')).toBeVisible();
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  // Brackwater's storage facility is tier 3 → exactly three expansions.
  await page.getByTestId('expand-storage').click();
  await expect(page.getByTestId('storage-capacity')).toContainText('6,000');
  await page.getByTestId('expand-storage').click();
  await expect(page.getByTestId('storage-capacity')).toContainText('8,000');
  await page.getByTestId('expand-storage').click();
  await expect(page.getByTestId('storage-capacity')).toContainText('10,000');

  // At the facility-tier cap the purchase is replaced by an explanation.
  await expect(page.getByTestId('expansion-capped')).toBeVisible();
  await expect(page.getByTestId('expand-storage')).toHaveCount(0);
});

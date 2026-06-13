import { test, expect, gotoApp, advanceClock } from './helpers/fixtures.js';
import { assertNoPseudoLeakage, isPseudoProject } from './helpers/pseudo-leakage.js';

async function grant(
  page: import('@playwright/test').Page,
  settlementId: string,
  itemId: string,
  qty: number,
): Promise<void> {
  await page.evaluate(
    ([s, i, q]) => window.__twGrant!(s as string, i as string, q as number),
    [settlementId, itemId, qty] as const,
  );
}

test('US3: refine seeded inputs → craft a two-skill good; locks show shortfall + tier', async ({
  page,
}, testInfo) => {
  await gotoApp(page, testInfo);

  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill('Tanner');
  await page.getByTestId('settlement-settlement.brackwater').click();
  await page.getByTestId('create-begin').click();
  await expect(page.locator('[data-screen="home"]')).toBeVisible();

  // Seed raw hides for refining + one bolt of the other skill's output, so the
  // two-skill craft becomes reachable after a single refine.
  await grant(page, 'settlement.brackwater', 'item.coney-hide', 6);
  await grant(page, 'settlement.brackwater', 'item.rough-cloth', 1);

  await page.getByTestId('nav-crafting').click();
  await expect(page.locator('[data-screen="crafting"]')).toBeVisible();
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  // Locked recipe shows the required tier; the two-skill craft is locked for a
  // missing input (we hold cloth but no leather yet).
  const elk = page.getByTestId('activity-activity.tan-elk-leather');
  await expect(elk).toBeDisabled();
  await expect(elk).toContainText('2');
  await expect(page.getByTestId('activity-activity.stitch-leather-vest')).toBeDisabled();

  // Refine: tan coney hides into leather (input-consuming action).
  await page.getByTestId('activity-activity.tan-coney-leather').click();
  await page.getByTestId('confirm-start').click();
  await expect(page.locator('[data-screen="home"]')).toBeVisible();

  await advanceClock(page, 3 * 120);
  await expect(page.getByTestId('stored-item.coney-leather')).toContainText('3');
  await expect(page.getByTestId('stored-item.coney-hide')).toHaveCount(0);

  // The two-skill craft is now available (2 leather + 1 cloth on hand).
  await page.getByTestId('nav-crafting').click();
  const vest = page.getByTestId('activity-activity.stitch-leather-vest');
  await expect(vest).toBeEnabled();
  await vest.click();
  await page.getByTestId('confirm-start').click();
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  await expect(page.locator('[data-screen="home"]')).toBeVisible();
  await advanceClock(page, 240);
  await expect(page.getByTestId('stored-item.leather-vest')).toContainText('1');
});

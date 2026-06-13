import { test, expect, gotoApp, advanceClock } from './helpers/fixtures.js';
import { assertNoPseudoLeakage, isPseudoProject } from './helpers/pseudo-leakage.js';

const SILVER = 'item.silverfin';

test('US4: empty book → sell order → no self-match → NPC fill → linked-market browse', async ({
  page,
}, testInfo) => {
  await gotoApp(page, testInfo);
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill('Merchant');
  await page.getByTestId('settlement-settlement.brackwater').click();
  await page.getByTestId('create-begin').click();
  await expect(page.locator('[data-screen="home"]')).toBeVisible();

  await page.evaluate(() => window.__twGrant!('settlement.brackwater', 'item.silverfin', 5));

  await page.getByTestId('nav-market').click();
  await expect(page.locator('[data-screen="market"]')).toBeVisible();

  // Empty-book state renders as a state, not an error — and an order is still placeable.
  await page.getByTestId(`market-item-${SILVER}`).click();
  await expect(page.getByTestId('empty-book')).toBeVisible();
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  // Place a sell order (goods escrow into the order).
  await page.getByTestId('order-side-sell').click();
  await page.getByTestId('order-qty').fill('5');
  await page.getByTestId('order-price').fill('20');
  await expect(page.getByTestId('order-fee')).toBeVisible(); // fee/tax disclosed before confirm
  await page.getByTestId('place-order').click();
  await expect(page.locator('[data-testid^="my-order-"]')).toHaveCount(1);

  // A same-owner crossing buy never matches the sell (FR-033): both rest, both cancellable.
  await page.getByTestId(`market-item-${SILVER}`).click();
  await page.getByTestId('order-side-buy').click();
  await page.getByTestId('order-qty').fill('2');
  await page.getByTestId('order-price').fill('25'); // crosses the 20 sell, but same owner
  await page.getByTestId('place-order').click();
  await expect(page.locator('[data-testid^="my-order-"]')).toHaveCount(2);
  await expect(page.locator('[data-testid^="cancel-order-"]')).toHaveCount(2); // neither filled
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  // An NPC demand sweep fills the resting sell on the next market ticks.
  await advanceClock(page, 30 * 60);
  await expect
    .poll(async () => page.locator('[data-testid^="cancel-order-"]').count())
    .toBeLessThan(2); // at least one order is no longer open (filled)

  // The sale and its sales tax are auditable in the ledger.
  await page.getByTestId('nav-transactions').click();
  await expect(page.locator('[data-screen="transactions"]')).toBeVisible();
  await expect(page.getByTestId('txn-list')).toBeVisible();
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  // Linked market: browse another settlement's book. It shows that settlement's
  // goods, never the brackwater-only silverfin listing (home-book locality).
  await page.getByTestId('nav-market').click();
  await page.getByTestId('market-settlement-settlement.emberfall').click();
  await expect(page.getByTestId('market-item-item.tin-ore')).toBeVisible();
  await expect(page.getByTestId(`market-item-${SILVER}`)).toHaveCount(0);
});

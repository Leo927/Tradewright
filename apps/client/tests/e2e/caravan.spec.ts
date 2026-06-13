import { test, expect, gotoApp, advanceClock } from './helpers/fixtures.js';
import { assertNoPseudoLeakage, isPseudoProject } from './helpers/pseudo-leakage.js';
import type { Page, TestInfo } from '@playwright/test';

const ROUTE = 'route.brackwater-emberfall';
const PINE = 'item.pinewood';

/** Fresh character at Brackwater with raw goods seeded into local storage —
 *  the e2e proxy for "buy low in A" (the trade itself is covered by US4). */
async function setUpAtBrackwater(page: Page, testInfo: TestInfo, pinewood = 20): Promise<void> {
  await gotoApp(page, testInfo);
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill('Hauler');
  await page.getByTestId('settlement-settlement.brackwater').click();
  await page.getByTestId('create-begin').click();
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
  await page.evaluate((qty) => window.__twGrant!('settlement.brackwater', 'item.pinewood', qty), pinewood);
}

test('US5: dispatch a caravan, travel, and arrive with the goods delivered', async ({ page }, testInfo) => {
  await setUpAtBrackwater(page, testInfo);

  // Map shows the route with caravan/personal durations and risk pre-confirm.
  await page.getByTestId('nav-map').click();
  await expect(page.getByTestId(`route-${ROUTE}`)).toBeVisible();
  await expect(page.getByTestId(`route-caravan-${ROUTE}`)).toBeVisible();
  await expect(page.getByTestId(`route-risk-${ROUTE}`)).toBeVisible();
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  // Composer: full cost disclosure + weight gauge before dispatch.
  await page.getByTestId(`load-caravan-${ROUTE}`).click();
  await expect(page.getByTestId('composer')).toBeVisible();
  await expect(page.getByTestId('dispatch-cost')).toBeVisible();
  await expect(page.getByTestId('weight-gauge')).toBeVisible();
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  await page.getByTestId(`manifest-qty-${PINE}`).fill('10');
  await page.getByTestId('dispatch-caravan').click();
  await expect(page.getByTestId('shipment-list')).toBeVisible();
  await expect(page.locator('[data-testid^="shipment-eta-"]').first()).toBeVisible();
  // Dispatch cost (30) left the wallet (100 → 70) — UI reflects it at once.
  await expect(page.getByTestId('wallet')).toContainText('70');

  // Personal travel to the destination — the UI keeps working during transit.
  await page.getByTestId('nav-map').click();
  await page.getByTestId(`travel-${ROUTE}`).click();
  await expect(page.getByTestId('map-traveling')).toBeVisible();
  await page.getByTestId('nav-market').click(); // app stays navigable mid-transit
  await expect(page.locator('[data-screen="market"]')).toBeVisible();

  // Advance past both arrivals; travel + caravan resolve live, no blocking.
  await advanceClock(page, 4 * 3600);

  // No longer traveling, and the haul has been delivered to the destination.
  await page.getByTestId('nav-map').click();
  await expect(page.getByTestId('map-location')).toBeVisible();
  await page.getByTestId('nav-home').click();
  await expect(page.getByTestId('stored-item.pinewood')).toBeVisible();
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);
});

test('US5: a second dispatch beyond the slot limit explains itself', async ({ page }, testInfo) => {
  await setUpAtBrackwater(page, testInfo);
  await page.getByTestId('nav-map').click();
  await page.getByTestId(`load-caravan-${ROUTE}`).click();
  await page.getByTestId(`manifest-qty-${PINE}`).fill('5');
  await page.getByTestId('dispatch-caravan').click();
  await expect(page.getByTestId('shipment-list')).toBeVisible();

  // The only slot is busy — a second dispatch is rejected with an explanation.
  await page.getByTestId('nav-map').click();
  await page.getByTestId(`load-caravan-${ROUTE}`).click();
  await page.getByTestId(`manifest-qty-${PINE}`).fill('5');
  await page.getByTestId('dispatch-caravan').click();
  await expect(page.getByRole('alert')).toBeVisible();
});

test('US5: an over-capacity load is blocked before dispatch', async ({ page }, testInfo) => {
  await setUpAtBrackwater(page, testInfo, 40); // 40 pinewood × weight 2 = 80 available
  await page.getByTestId('nav-map').click();
  await page.getByTestId(`load-caravan-${ROUTE}`).click();
  await page.getByTestId(`manifest-qty-${PINE}`).fill('31'); // 62 weight > 60 capacity
  await expect(page.getByTestId('weight-gauge')).toBeVisible();
  await expect(page.getByTestId('dispatch-caravan')).toBeDisabled();
});

import { test, expect, gotoApp } from './helpers/fixtures.js';
import type { Page, TestInfo } from '@playwright/test';

const VIEWPORT_WIDTH = 390;

async function createCharacter(page: Page, testInfo: TestInfo): Promise<void> {
  await gotoApp(page, testInfo);
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill('Auditor');
  await page.getByTestId('settlement-settlement.brackwater').click();
  await page.getByTestId('create-begin').click();
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
}

/** No gameplay-critical info is clipped off the side at 390 px — the core
 *  expanded-text stress (FR-077/SC-013) and CJK render smoke (quickstart US0-f). */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflowBy = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflowBy, 'screen overflows horizontally at 390px').toBeLessThanOrEqual(1);
}

test('every shipped screen is usable at 390×844 with its primary action visible', async ({
  page,
}, testInfo) => {
  await createCharacter(page, testInfo);

  // Seed coin + goods so storage/caravan primary actions render fully.
  await page.evaluate(() => {
    window.__twGrantCoin?.(2000);
    window.__twGrant?.('settlement.brackwater', 'item.pinewood', 20);
  });

  const navScreens: { id: string; primary: string }[] = [
    { id: 'home', primary: 'find-work' },
    { id: 'activities', primary: 'nav-home' },
    { id: 'crafting', primary: 'nav-home' },
    { id: 'market', primary: 'market-settlement-settlement.brackwater' },
    { id: 'map', primary: 'route-route.brackwater-emberfall' },
    { id: 'transactions', primary: 'nav-home' },
    { id: 'settings', primary: 'locale-en' },
  ];

  for (const { id, primary } of navScreens) {
    await page.getByTestId(`nav-${id}`).click();
    await expect(page.locator(`[data-screen="${id}"]`)).toBeVisible();
    await expect(page.getByTestId(primary).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const box = await page.getByTestId(primary).first().boundingBox();
    expect(box, `primary action on ${id} has no box`).not.toBeNull();
    if (box) expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
  }

  // Storage (reached from home) and the caravan composer (reached from the map).
  await page.getByTestId('nav-home').click();
  await page.getByTestId('manage-storage').click();
  await expect(page.locator('[data-screen="storage"]')).toBeVisible();
  await expect(page.getByTestId('expand-storage')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByTestId('nav-map').click();
  await page.getByTestId('load-caravan-route.brackwater-emberfall').click();
  await expect(page.locator('[data-screen="caravans"]')).toBeVisible();
  await expect(page.getByTestId('dispatch-caravan')).toBeVisible();
  await expect(page.getByTestId('weight-gauge')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

declare global {
  interface Window {
    __twGrantCoin?: (amount: number) => void;
    __twGrant?: (settlementId: string, itemId: string, qty: number) => void;
  }
}

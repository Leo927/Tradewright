import { test, expect, gotoApp, projectLocale } from './helpers/fixtures.js';
import type { Page, TestInfo } from '@playwright/test';

async function createCharacter(page: Page, testInfo: TestInfo): Promise<void> {
  await gotoApp(page, testInfo);
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill('Pacer');
  await page.getByTestId('settlement-settlement.brackwater').click();
  await page.getByTestId('create-begin').click();
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
}

test('SC-001: a fresh player reaches their first activity in a short, fast flow', async ({
  page,
}, testInfo) => {
  const start = Date.now();
  await gotoApp(page, testInfo);
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill('Pacer');
  await page.getByTestId('settlement-settlement.brackwater').click();
  await page.getByTestId('create-begin').click();
  await page.getByTestId('find-work').click();
  await page.getByTestId('activity-activity.line-silverfin').click();
  await page.getByTestId('confirm-start').click();
  await expect(page.getByTestId('current-activity-name')).toBeVisible();
  // The path is 7 interactions; the wall budget is a generous "not blocked/slow"
  // proxy for SC-001's 3-minute human target (the engine drives no real waits).
  expect(Date.now() - start).toBeLessThan(60_000);
});

test('SC-004: placing an order takes no more than 6 inputs', async ({ page }, testInfo) => {
  await createCharacter(page, testInfo);
  await page.evaluate(() => window.__twGrant?.('settlement.brackwater', 'item.silverfin', 5));
  await page.getByTestId('nav-market').click();
  await page.getByTestId('market-item-item.silverfin').click();
  await expect(page.locator('.order-form')).toBeVisible();
  const controls = await page.locator('.order-form input, .order-form button').count();
  expect(controls).toBeLessThanOrEqual(6);
});

test('SC-012 + FR-062: navigation is immediate and a language switch re-renders fast', async ({
  page,
}, testInfo) => {
  await createCharacter(page, testInfo);

  // FR-062: navigation acknowledges locally — the screen flips without awaiting
  // any engine round-trip.
  await page.getByTestId('nav-market').click();
  await expect(page.locator('[data-screen="market"]')).toBeVisible({ timeout: 1000 });

  // SC-012: a live language switch re-renders within 2 s (no reload). Switch to a
  // locale different from the project's current one and watch a string change.
  const target = projectLocale(testInfo) === 'en' ? 'pseudo-expand' : 'en';
  const before = await page.getByTestId('nav-home').textContent();
  await page.evaluate((l) => window.__twSetLocale?.(l), target);
  await expect(async () => {
    const after = await page.getByTestId('nav-home').textContent();
    expect(after).not.toBe(before);
  }).toPass({ timeout: 2000 });
});

declare global {
  interface Window {
    __twGrant?: (settlementId: string, itemId: string, qty: number) => void;
    __twSetLocale?: (localeId: string) => void;
  }
}

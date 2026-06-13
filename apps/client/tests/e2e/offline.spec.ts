import { test, expect, gotoApp } from './helpers/fixtures.js';
import { assertNoPseudoLeakage, isPseudoProject } from './helpers/pseudo-leakage.js';
import type { Page, TestInfo } from '@playwright/test';

async function startGathering(page: Page, testInfo: TestInfo) {
  await gotoApp(page, testInfo);
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill('Returner');
  await page.getByTestId('settlement-settlement.thornholt').click();
  await page.getByTestId('create-begin').click();
  await page.getByTestId('find-work').click();
  await page.getByTestId('activity-activity.fell-pines').click();
  await page.getByTestId('confirm-start').click();
  await expect(page.getByTestId('current-activity-name')).toBeVisible();
  await page.evaluate(() => window.__twFlushSave!());
}

async function returnAfter(page: Page, totalOffsetHours: number) {
  await page.evaluate(
    (h) => sessionStorage.setItem('tw-clock-offset', String(h * 3600 * 1000)),
    totalOffsetHours,
  );
  await page.reload();
  await page.waitForFunction(() => !!window.__twTestClock);
}

declare global {
  interface Window {
    __twFlushSave?: () => Promise<void>;
  }
}

test('US2: 8 h away → summary reports ⌊8h ÷ action time⌋ actions with items and XP', async ({
  page,
}, testInfo) => {
  await startGathering(page, testInfo);
  await returnAfter(page, 8);

  const modal = page.getByTestId('return-summary');
  await expect(modal).toBeVisible();
  await expect(page.getByTestId('summary-row-0')).toContainText('480');
  await expect(modal.getByTestId('summary-capped')).not.toBeVisible();
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  await page.getByTestId('summary-collect').click();
  await expect(modal).not.toBeVisible();
  await expect(page.getByTestId('stored-item.pinewood')).toContainText('480');
});

test('US2: an absence beyond the cap states the cap', async ({ page }, testInfo) => {
  await startGathering(page, testInfo);
  await returnAfter(page, 30);

  await expect(page.getByTestId('return-summary')).toBeVisible();
  await expect(page.getByTestId('summary-capped')).toBeVisible();
  await expect(page.getByTestId('summary-row-0')).toContainText('1,440');
});

test('US2: storage filling mid-absence shows the halt with time and reason', async ({
  page,
}, testInfo) => {
  await startGathering(page, testInfo);
  await returnAfter(page, 24);
  await page.getByTestId('summary-collect').click();
  await page.evaluate(() => window.__twFlushSave!());

  await returnAfter(page, 48);
  const modal = page.getByTestId('return-summary');
  await expect(modal).toBeVisible();
  await expect(modal.locator('[data-summary-kind="halt"]')).toBeVisible();
  await page.getByTestId('summary-collect').click();
  await expect(page.getByTestId('halt-reason')).toBeVisible();
});

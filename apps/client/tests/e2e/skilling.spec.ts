import { test, expect, gotoApp, advanceClock } from './helpers/fixtures.js';
import { assertNoPseudoLeakage, isPseudoProject } from './helpers/pseudo-leakage.js';

test('US1: create character → pick settlement → gather → items and XP tick per action', async ({
  page,
}, testInfo) => {
  await gotoApp(page, testInfo);

  await page.getByTestId('begin').click();
  await expect(page.locator('[data-screen="create-character"]')).toBeVisible();
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  await page.getByTestId('name-input').fill('Ærwyn 旅商');
  await page.getByTestId('settlement-settlement.thornholt').click();
  await page.getByTestId('create-begin').click();

  await expect(page.locator('[data-screen="home"]')).toBeVisible();
  await expect(page.getByTestId('character-name')).toHaveText('Ærwyn 旅商');
  await expect(page.getByTestId('wallet')).toContainText('100');
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  await page.getByTestId('find-work').click();
  await expect(page.locator('[data-screen="activities"]')).toBeVisible();

  const locked = page.getByTestId('activity-activity.fell-oaks');
  await expect(locked).toBeDisabled();
  await expect(locked).toContainText('2');
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  await page.getByTestId('activity-activity.fell-pines').click();
  await page.getByTestId('confirm-start').click();

  await expect(page.locator('[data-screen="home"]')).toBeVisible();
  await expect(page.getByTestId('current-activity-name')).toBeVisible();
  await expect(page.getByTestId('action-time')).toBeVisible();
  if (isPseudoProject(testInfo.project.name)) await assertNoPseudoLeakage(page);

  await advanceClock(page, 3 * 60);
  await expect(page.getByTestId('stored-item.pinewood')).toContainText('3');
  await expect(page.getByTestId('skill-skill.timberfelling')).toContainText('1');

  await advanceClock(page, 2 * 60);
  await expect(page.getByTestId('stored-item.pinewood')).toContainText('5');
});

test('US1: stopping work returns to the idle state', async ({ page }, testInfo) => {
  await gotoApp(page, testInfo);
  await page.getByTestId('begin').click();
  await page.getByTestId('name-input').fill('Stopper');
  await page.getByTestId('settlement-settlement.brackwater').click();
  await page.getByTestId('create-begin').click();
  await page.getByTestId('find-work').click();
  await page.getByTestId('activity-activity.line-silverfin').click();
  await page.getByTestId('confirm-start').click();
  await page.getByTestId('stop-work').click();
  await expect(page.getByTestId('find-work')).toBeVisible();
});

import { test, expect, gotoApp } from './helpers/fixtures.js';
import { assertNoPseudoLeakage, isPseudoProject } from './helpers/pseudo-leakage.js';

test('app boots at 390×844 and shows the first-run screen', async ({ page }, testInfo) => {
  await gotoApp(page, testInfo);
  await expect(page.locator('[data-screen="first-run"]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('begin')).toBeVisible();

  const viewport = page.viewportSize();
  expect(viewport).toEqual({ width: 390, height: 844 });

  if (isPseudoProject(testInfo.project.name)) {
    await assertNoPseudoLeakage(page);
  }
});

import { test as base, expect, type Page, type TestInfo } from '@playwright/test';

export const PROJECT_LOCALES: Record<string, string> = {
  default: 'en',
  pseudo: 'pseudo-expand',
  'pseudo-cjk': 'pseudo-cjk',
};

export function projectLocale(testInfo: TestInfo): string {
  return PROJECT_LOCALES[testInfo.project.name] ?? 'en';
}

/** Opens the app with the project's locale forced (test-only override) and a
 *  fresh world; pins the test clock so flows control time deterministically. */
export async function gotoApp(
  page: Page,
  testInfo: TestInfo,
  opts: { fresh?: boolean } = {},
): Promise<void> {
  const locale = projectLocale(testInfo);
  const params = new URLSearchParams();
  if (locale !== 'en') params.set('locale', locale);
  const query = params.toString();
  const url = query ? `/?${query}` : '/';
  if (opts.fresh !== false) {
    await page.goto(url);
    await page.evaluate(() => {
      const req = indexedDB.deleteDatabase('tradewright');
      return new Promise((resolve) => {
        req.onsuccess = req.onerror = req.onblocked = () => resolve(null);
      });
    });
  }
  await page.goto(url);
  await page.waitForFunction(() => !!window.__twTestClock);
}

export async function advanceClock(page: Page, seconds: number): Promise<void> {
  await page.evaluate((s) => window.__twTestClock!.advance(s * 1000), seconds);
}

export const test = base;
export { expect };

declare global {
  interface Window {
    __twTestClock?: { advance(ms: number): void; set(epochMs: number): void; now(): number };
  }
}

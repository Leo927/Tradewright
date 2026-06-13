import { expect, type Page } from '@playwright/test';

const PSEUDO_MARKERS = /[⟦⟧「」]/;
const RAW_KEY = /^[a-z][a-z0-9]*(\.[a-z0-9-]+){2,}$/;

/** SC-011 / quickstart US0-a: in a pseudo locale every rendered system string
 *  carries the pseudo markers; raw keys and blanks fail outright.
 *  Player-authored text (FR-078) is excepted via data-player-text. */
export async function assertNoPseudoLeakage(page: Page): Promise<void> {
  const texts = await page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = (node as Text).parentElement;
      if (!parent) continue;
      if (parent.closest('[data-player-text]')) continue;
      if (parent.closest('[data-i18n-exempt]')) continue;
      if (parent.closest('script,style')) continue;
      if (parent.closest('[hidden]')) continue;
      const text = (node.textContent ?? '').trim();
      if (text.length > 0) out.push(text);
    }
    return out;
  });

  for (const text of texts) {
    if (/^[\d\s.,:%×+\-–—·¤/()✓⚙‹›…🔒]+$/.test(text)) continue;
    expect(text, `raw key leaked to screen: "${text}"`).not.toMatch(RAW_KEY);
    expect(text, `unlocalized string leaked: "${text}"`).toMatch(PSEUDO_MARKERS);
  }
}

/** Shared by every flow spec: run only in the pseudo projects. */
export function isPseudoProject(projectName: string): boolean {
  return projectName.startsWith('pseudo');
}

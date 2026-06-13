import localesJson from '@tradewright/content/text/locales.json';

export interface LocaleInfo {
  id: string;
  endonym: string;
  status: 'shipped' | 'validation';
}

export const locales = localesJson as LocaleInfo[];
export const BASE_LOCALE = 'en';

const uiModules = import.meta.glob('../../../../packages/content/text/*/ui.json', {
  eager: true,
}) as Record<string, { default: Record<string, string> }>;

const contentModules = import.meta.glob('../../../../packages/content/text/*/content/*.json', {
  eager: true,
}) as Record<string, { default: Record<string, string> }>;

function localeOf(path: string): string {
  const m = /text\/([^/]+)\//.exec(path);
  return m?.[1] ?? '';
}

const catalogByLocale = new Map<string, Record<string, string>>();
for (const [path, mod] of [...Object.entries(uiModules), ...Object.entries(contentModules)]) {
  const locale = localeOf(path);
  const existing = catalogByLocale.get(locale) ?? {};
  catalogByLocale.set(locale, { ...existing, ...mod.default });
}

export function availableCatalogLocales(): string[] {
  return [...catalogByLocale.keys()];
}

/** Active-locale messages over a base-locale floor: a missing key renders the
 *  base string, never a blank or raw key (FR-075); every gap is logged. */
export function messagesFor(localeId: string): Record<string, string> {
  return messagesForWithDrops(localeId, []);
}

/** `dropKeys` simulates catalog gaps for fallback validation (US0-e) — only
 *  reachable from the dev-only query hook, never in production. */
export function messagesForWithDrops(localeId: string, dropKeys: string[]): Record<string, string> {
  const base = catalogByLocale.get(BASE_LOCALE) ?? {};
  if (localeId === BASE_LOCALE) return base;
  const active = catalogByLocale.get(localeId);
  if (!active) {
    console.warn(`[i18n] no catalogs for locale ${localeId}; falling back to ${BASE_LOCALE}`);
    return base;
  }
  let effective = active;
  if (dropKeys.length > 0) {
    effective = { ...active };
    for (const key of dropKeys) delete effective[key];
  }
  for (const key of Object.keys(base)) {
    if (!(key in effective)) {
      console.warn(`[i18n] ${localeId} missing key ${key}; using ${BASE_LOCALE} fallback`);
    }
  }
  return { ...base, ...effective };
}

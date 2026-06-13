import { locales, BASE_LOCALE } from './catalogs.js';

const knownIds = new Set(locales.map((l) => l.id));

/** App locale → a structurally valid Intl locale. `pseudo-cjk` is not a
 *  valid BCP-47 tag for Intl; it formats with CJK conventions instead. */
export function intlLocale(appLocale: string): string {
  if (appLocale === 'pseudo-cjk') return 'zh';
  try {
    Intl.getCanonicalLocales(appLocale);
    return appLocale;
  } catch {
    return 'en';
  }
}

export function shippedLocales(): { id: string; endonym: string }[] {
  return locales.filter((l) => l.status === 'shipped');
}

/** Test-only forcing for the pseudo Playwright projects — dead code in
 *  production builds (T009/T044 pattern). */
export function testForcedLocale(): string | null {
  if (import.meta.env.DEV) {
    const forced = new URLSearchParams(window.location.search).get('locale');
    if (forced && knownIds.has(forced)) return forced;
  }
  return null;
}

/** FR-072: persisted choice → supported device language → base locale. */
export function resolveInitialLocale(persisted: string | null): string {
  const forced = testForcedLocale();
  if (forced) return forced;
  if (persisted && knownIds.has(persisted)) return persisted;
  const shipped = new Set(shippedLocales().map((l) => l.id));
  for (const lang of navigator.languages ?? []) {
    if (shipped.has(lang)) return lang;
    const short = lang.split('-')[0]!;
    if (shipped.has(short)) return short;
  }
  return BASE_LOCALE;
}

/** Whether the device language has no supported match (FR-072 messaging). */
export function deviceLanguageUnsupported(): boolean {
  const shipped = new Set(shippedLocales().map((l) => l.id));
  return !(navigator.languages ?? []).some(
    (lang) => shipped.has(lang) || shipped.has(lang.split('-')[0]!),
  );
}

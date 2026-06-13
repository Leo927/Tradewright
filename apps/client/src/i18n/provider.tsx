import { IntlProvider } from 'react-intl';
import type { ReactNode } from 'react';
import { messagesForWithDrops, BASE_LOCALE } from './catalogs.js';
import { intlLocale } from './locale.js';

function devDropKeys(): string[] {
  if (import.meta.env.DEV) {
    return new URLSearchParams(window.location.search).getAll('drop-key');
  }
  return [];
}

export function I18nProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return (
    <IntlProvider
      locale={intlLocale(locale)}
      defaultLocale={BASE_LOCALE}
      messages={messagesForWithDrops(locale, devDropKeys())}
      onError={(err) => {
        if (err.code === 'MISSING_TRANSLATION') return;
        console.warn('[i18n]', err.message);
      }}
    >
      {children}
    </IntlProvider>
  );
}

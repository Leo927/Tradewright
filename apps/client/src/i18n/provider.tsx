import { IntlProvider } from 'react-intl';
import type { ReactNode } from 'react';
import { messagesFor, BASE_LOCALE } from './catalogs.js';

export function I18nProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return (
    <IntlProvider
      locale={locale}
      defaultLocale={BASE_LOCALE}
      messages={messagesFor(locale)}
      onError={(err) => {
        if (err.code === 'MISSING_TRANSLATION') return;
        console.warn('[i18n]', err.message);
      }}
    >
      {children}
    </IntlProvider>
  );
}

import { FormattedMessage } from 'react-intl';
import { shippedLocales, deviceLanguageUnsupported } from '../i18n/locale.js';
import { BASE_LOCALE } from '../i18n/catalogs.js';
import { useAppState, setLocale, navigate } from '../state/store.js';

export function SettingsScreen() {
  const { locale } = useAppState();
  const baseEndonym = shippedLocales().find((l) => l.id === BASE_LOCALE)?.endonym ?? 'English';
  return (
    <main className="screen" data-screen="settings">
      <header className="screen-header">
        <button onClick={() => navigate('home')}>
          <FormattedMessage id="common.back" />
        </button>
        <h1>
          <FormattedMessage id="nav.settings" />
        </h1>
      </header>
      <section>
        <h2 className="section-label">
          <FormattedMessage id="settings.language" />
        </h2>
        <ul className="option-list">
          {shippedLocales().map((l) => (
            <li key={l.id}>
              <button
                data-testid={`locale-${l.id}`}
                aria-pressed={locale === l.id}
                onClick={() => setLocale(l.id)}
              >
                <span data-i18n-exempt>{l.endonym}</span>
                {locale === l.id ? <span aria-hidden="true"> ✓</span> : null}
              </button>
            </li>
          ))}
        </ul>
        {deviceLanguageUnsupported() ? (
          <p className="hint">
            <FormattedMessage
              id="settings.language.device-unsupported"
              values={{ fallback: baseEndonym }}
            />
          </p>
        ) : null}
      </section>
    </main>
  );
}

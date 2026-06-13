import { FormattedMessage, useIntl } from 'react-intl';
import { shippedLocales, deviceLanguageUnsupported } from '../i18n/locale.js';
import { BASE_LOCALE } from '../i18n/catalogs.js';
import { useAppState, setLocale, navigate, setNotificationPrefAction } from '../state/store.js';
import { iosNeedsInstall } from '../notifications/scheduler.js';

export function SettingsScreen() {
  const { locale, notificationPrefs } = useAppState();
  const intl = useIntl();
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

      <section>
        <h2 className="section-label">
          <FormattedMessage id="settings.notifications" />
        </h2>
        <ul className="plain-list">
          {(notificationPrefs?.categories ?? []).map((c) => (
            <li key={c.categoryId}>
              <label>
                <input
                  type="checkbox"
                  data-testid={`notify-toggle-${c.categoryId}`}
                  checked={c.optedIn}
                  onChange={(e) => void setNotificationPrefAction(c.categoryId, e.target.checked)}
                />
                {intl.formatMessage({ id: `notify.${c.categoryId}.title` })}
              </label>
              {c.onlineVersionOnly ? (
                <span className="hint" data-testid={`notify-online-only-${c.categoryId}`}>
                  {' '}
                  <FormattedMessage id="settings.notify.online-only" />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        {iosNeedsInstall() ? (
          <p className="hint" data-testid="notify-ios-note">
            <FormattedMessage id="settings.notify.ios-note" />
          </p>
        ) : null}
      </section>
    </main>
  );
}

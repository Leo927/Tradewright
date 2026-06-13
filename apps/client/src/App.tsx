import { FormattedMessage, useIntl } from 'react-intl';
import { I18nProvider } from './i18n/provider.js';
import { useAppState, navigate } from './state/store.js';
import { SettingsScreen } from './screens/settings.js';

function SettingsButton() {
  const intl = useIntl();
  return (
    <button
      className="icon-button"
      aria-label={intl.formatMessage({ id: 'settings.open' })}
      onClick={() => navigate('settings')}
    >
      <span aria-hidden="true">⚙</span>
    </button>
  );
}

function FirstRun() {
  return (
    <main className="screen first-run" data-screen="first-run">
      <header className="screen-header">
        <span />
        <SettingsButton />
      </header>
      <h1>
        <FormattedMessage id="app.title" />
      </h1>
      <p>
        <FormattedMessage id="firstrun.tagline" />
      </p>
      <button className="primary" data-testid="begin">
        <FormattedMessage id="firstrun.begin" />
      </button>
    </main>
  );
}

function Home() {
  return (
    <main className="screen" data-screen="home">
      <header className="screen-header">
        <h1>
          <FormattedMessage id="app.title" />
        </h1>
        <SettingsButton />
      </header>
    </main>
  );
}

function Screens() {
  const { phase, screen, character } = useAppState();
  if (phase === 'booting') {
    return <main className="screen" data-screen="booting" aria-busy="true" />;
  }
  switch (screen) {
    case 'settings':
      return <SettingsScreen />;
    case 'first-run':
      return character ? <Home /> : <FirstRun />;
    default:
      return <Home />;
  }
}

export default function App() {
  const { locale } = useAppState();
  return (
    <I18nProvider locale={locale}>
      <Screens />
    </I18nProvider>
  );
}

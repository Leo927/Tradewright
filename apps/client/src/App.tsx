import { FormattedMessage, useIntl } from 'react-intl';
import { I18nProvider } from './i18n/provider.js';
import { useAppState, navigate, type ScreenId } from './state/store.js';
import { SettingsScreen } from './screens/settings.js';
import { CreateCharacterScreen } from './screens/create-character.js';
import { SettlementHomeScreen } from './screens/settlement-home.js';
import { ActivitiesScreen } from './screens/activities.js';
import { ReturnSummaryModal } from './screens/return-summary.js';

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
      <button
        className="primary"
        data-testid="begin"
        onClick={() => navigate('create-character')}
      >
        <FormattedMessage id="firstrun.begin" />
      </button>
    </main>
  );
}

function BottomNav() {
  const { screen } = useAppState();
  const tab = (id: ScreenId, labelKey: string) => (
    <button aria-pressed={screen === id} data-testid={`nav-${id}`} onClick={() => navigate(id)}>
      <FormattedMessage id={labelKey} />
    </button>
  );
  return (
    <nav className="bottom-nav">
      {tab('home', 'nav.home')}
      {tab('activities', 'nav.activities')}
      {tab('settings', 'nav.settings')}
    </nav>
  );
}

function Screens() {
  const { phase, screen, character } = useAppState();
  if (phase === 'booting') {
    return <main className="screen" data-screen="booting" aria-busy="true" />;
  }
  if (!character) {
    switch (screen) {
      case 'settings':
        return <SettingsScreen />;
      case 'create-character':
        return <CreateCharacterScreen />;
      default:
        return <FirstRun />;
    }
  }
  const body = (() => {
    switch (screen) {
      case 'settings':
        return <SettingsScreen />;
      case 'activities':
        return <ActivitiesScreen />;
      default:
        return <SettlementHomeScreen />;
    }
  })();
  return (
    <>
      {body}
      <BottomNav />
      <ReturnSummaryModal />
    </>
  );
}

export default function App() {
  const { locale } = useAppState();
  return (
    <I18nProvider locale={locale}>
      <Screens />
    </I18nProvider>
  );
}

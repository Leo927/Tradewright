import { FormattedMessage } from 'react-intl';
import { I18nProvider } from './i18n/provider.js';
import { useAppState } from './state/store.js';

function FirstRun() {
  return (
    <main className="screen first-run" data-screen="first-run">
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
      <h1>
        <FormattedMessage id="app.title" />
      </h1>
    </main>
  );
}

function Screens() {
  const { phase, screen } = useAppState();
  if (phase === 'booting') {
    return <main className="screen" data-screen="booting" aria-busy="true" />;
  }
  switch (screen) {
    case 'first-run':
      return <FirstRun />;
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

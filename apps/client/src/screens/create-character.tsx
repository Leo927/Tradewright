import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { messagesFor, BASE_LOCALE } from '../i18n/catalogs.js';
import { createCharacterAction } from '../state/store.js';
import { useNames } from '../i18n/names.js';

/** The startable settlement list is derived from the base text catalog —
 *  the GUI never reads mechanics content (Gate 3 boundary). */
const SETTLEMENT_IDS = Object.keys(messagesFor(BASE_LOCALE))
  .filter((k) => /^settlement\.[^.]+\.name$/.test(k))
  .map((k) => k.replace(/\.name$/, ''))
  .sort();

export function CreateCharacterScreen() {
  const intl = useIntl();
  const { name: nameOf, description } = useNames();
  const [name, setName] = useState('');
  const [settlementId, setSettlementId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const ready = name.trim().length > 0 && settlementId !== null;

  return (
    <main className="screen" data-screen="create-character">
      <h1>
        <FormattedMessage id="app.title" />
      </h1>
      <label>
        <span className="section-label">
          <FormattedMessage id="create.name-label" />
        </span>
        <input
          data-testid="name-input"
          data-player-text
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
      </label>
      <h2 className="section-label">
        <FormattedMessage id="create.settlement-label" />
      </h2>
      <ul className="option-list">
        {SETTLEMENT_IDS.map((id) => (
          <li key={id}>
            <button
              data-testid={`settlement-${id}`}
              aria-pressed={settlementId === id}
              onClick={() => setSettlementId(id)}
            >
              <span>
                <strong>{nameOf(id)}</strong>
                <br />
                <small className="hint">{description(id)}</small>
              </span>
              {settlementId === id ? <span aria-hidden="true">✓</span> : null}
            </button>
          </li>
        ))}
      </ul>
      {errorCode ? (
        <p role="alert" className="error">
          {intl.formatMessage({ id: `error.${errorCode}` })}
        </p>
      ) : null}
      <button
        className="primary"
        data-testid="create-begin"
        disabled={!ready}
        onClick={async () => {
          if (!ready) return;
          const code = await createCharacterAction(name.trim(), settlementId!);
          if (code) setErrorCode(code);
        }}
      >
        <FormattedMessage id="create.begin" />
      </button>
    </main>
  );
}

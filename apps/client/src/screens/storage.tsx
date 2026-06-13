import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppState, navigate, expandStorageAction } from '../state/store.js';
import { useNames } from '../i18n/names.js';
import { formatCoin } from '../i18n/format.js';

export function StorageScreen() {
  const { character, storage, locale } = useAppState();
  const { name } = useNames();
  const intl = useIntl();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  if (!character || !storage) return null;
  const pct = storage.capacity > 0 ? Math.min(1, storage.capacityUsed / storage.capacity) : 0;

  return (
    <main className="screen" data-screen="storage">
      <header className="screen-header">
        <button onClick={() => navigate('home')}>
          <FormattedMessage id="common.back" />
        </button>
        <h1>
          <FormattedMessage id="nav.storage" />
        </h1>
        <span data-testid="wallet" className="wallet">
          {formatCoin(locale, character.wallet)}
        </span>
      </header>

      <section className="card">
        <p data-testid="storage-capacity">
          <FormattedMessage
            id="storage.capacity"
            values={{ used: storage.capacityUsed, capacity: storage.capacity }}
          />
        </p>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${Math.round(pct * 100)}%` }} />
        </div>
        <ul className="plain-list" data-testid="storage-list">
          {storage.slots.map((s) => (
            <li key={s.itemId} data-testid={`stored-${s.itemId}`}>
              <span>{name(s.itemId)}</span>
              <span>
                <FormattedMessage id="common.quantity" values={{ qty: s.qty }} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        {storage.expansionCapReached || !storage.nextExpansion ? (
          <p className="hint" data-testid="expansion-capped">
            <FormattedMessage id="storage.expansion-capped" />
          </p>
        ) : (
          <>
            <p className="hint" data-testid="expansion-cost">
              <FormattedMessage
                id="storage.expansion-offer"
                values={{
                  gain: storage.nextExpansion.capacityGain,
                  cost: formatCoin(locale, storage.nextExpansion.cost),
                }}
              />
            </p>
            {errorCode ? (
              <p role="alert" className="error">
                {intl.formatMessage({ id: `error.${errorCode}` })}
              </p>
            ) : null}
            <button
              className="primary"
              data-testid="expand-storage"
              onClick={async () => setErrorCode(await expandStorageAction(storage.settlementId))}
            >
              <FormattedMessage id="storage.expand" />
            </button>
          </>
        )}
      </section>
    </main>
  );
}

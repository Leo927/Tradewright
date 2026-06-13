import { FormattedMessage } from 'react-intl';
import { useAppState, navigate, refreshTransactions } from '../state/store.js';
import { useNames } from '../i18n/names.js';
import { formatCoin } from '../i18n/format.js';

/** Paged audit history (FR-052). Structured Transaction records — kind codes,
 *  item ids, amounts — render via catalogs in the active locale at view time, so
 *  a locale switch re-renders the history (FR-076). */
export function TransactionsScreen() {
  const { transactions, locale } = useAppState();
  const { itemList } = useNames();
  const page = transactions;
  const from = page ? page.offset + 1 : 0;
  const to = page ? Math.min(page.offset + page.limit, page.total) : 0;
  const canOlder = page ? page.offset + page.limit < page.total : false;
  const canNewer = page ? page.offset > 0 : false;

  return (
    <main className="screen" data-screen="transactions">
      <header className="screen-header">
        <button onClick={() => navigate('home')}>
          <FormattedMessage id="common.back" />
        </button>
        <h1>
          <FormattedMessage id="nav.transactions" />
        </h1>
      </header>

      {!page || page.entries.length === 0 ? (
        <p className="hint">
          <FormattedMessage id="transactions.empty" />
        </p>
      ) : (
        <>
          <ul className="plain-list" data-testid="txn-list">
            {page.entries.map((t) => (
              <li key={t.id} data-testid={`txn-${t.id}`}>
                <span>
                  <FormattedMessage id={`txn.kind.${t.kind}`} />
                  {t.items && t.items.length > 0 ? <> · {itemList(t.items)}</> : null}
                </span>
                <span className={t.coinDelta < 0 ? 'coin-neg' : 'coin-pos'}>
                  {t.coinDelta !== 0 ? formatCoin(locale, t.coinDelta) : '—'}
                </span>
              </li>
            ))}
          </ul>
          <div className="pager">
            <button
              disabled={!canNewer}
              onClick={() => void refreshTransactions(Math.max(0, page.offset - page.limit))}
            >
              <FormattedMessage id="transactions.newer" />
            </button>
            <span className="hint" data-i18n-exempt>
              <FormattedMessage
                id="transactions.page"
                values={{ from, to, total: page.total }}
              />
            </span>
            <button
              data-testid="txn-older"
              disabled={!canOlder}
              onClick={() => void refreshTransactions(page.offset + page.limit)}
            >
              <FormattedMessage id="transactions.older" />
            </button>
          </div>
        </>
      )}
    </main>
  );
}

import { FormattedMessage, useIntl } from 'react-intl';
import type { EventSummaryView, SummaryEntry } from '@tradewright/contract';
import { useAppState, collectSummaryAction } from '../state/store.js';
import { useNames } from '../i18n/names.js';
import { formatCoin, formatDuration } from '../i18n/format.js';

function Row({
  entry,
  summary,
  index,
}: {
  entry: SummaryEntry;
  summary: EventSummaryView;
  index: number;
}) {
  const { locale } = useAppState();
  const intl = useIntl();
  const { name, itemList } = useNames();
  const testid = `summary-row-${index}`;

  switch (entry.kind) {
    case 'actions':
      return (
        <li data-testid={testid}>
          <FormattedMessage
            id="summary.actions-row"
            values={{ count: entry.count, activity: name(entry.activityId) }}
          />
          <br />
          <small className="hint">
            <FormattedMessage
              id="summary.actions-detail"
              values={{ items: itemList(entry.produced), xp: entry.xpGained }}
            />
          </small>
        </li>
      );
    case 'level-up':
      return (
        <li data-testid={testid}>
          <FormattedMessage
            id="summary.level-up"
            values={{ skill: name(entry.skillId), level: entry.level }}
          />
        </li>
      );
    case 'halt': {
      const agoSeconds = (summary.toTick - entry.atTick) * summary.tickSeconds;
      return (
        <li data-testid={testid} data-summary-kind="halt">
          <FormattedMessage
            id="summary.halt"
            values={{
              activity: name(entry.activityId),
              reason: intl.formatMessage({ id: `halt.${entry.reason}` }),
            }}
          />{' '}
          <small className="hint">
            <FormattedMessage
              id="summary.halt-when"
              values={{ duration: formatDuration(locale, agoSeconds) }}
            />
          </small>
        </li>
      );
    }
    case 'order':
      return (
        <li data-testid={testid} data-summary-kind="order">
          <FormattedMessage
            id="summary.order"
            values={{
              outcome: entry.outcome === 'partially-filled' ? 'partial' : entry.outcome,
              qty: entry.qty,
              item: name(entry.itemId),
            }}
          />
          {entry.outcome !== 'expired' ? (
            <small className="hint">
              {' '}
              <FormattedMessage
                id="summary.order-proceeds"
                values={{
                  proceeds: formatCoin(locale, entry.proceeds),
                  tax: formatCoin(locale, entry.taxPaid),
                }}
              />
            </small>
          ) : null}
        </li>
      );
    case 'caravan':
      return (
        <li data-testid={testid} data-summary-kind="caravan">
          <FormattedMessage
            id="summary.caravan"
            values={{
              settlement: name(entry.toSettlementId),
              items: itemList(entry.delivered),
            }}
          />
          {entry.riskOutcome.kind === 'loss' ? (
            <small className="hint">
              {' '}
              <FormattedMessage
                id="summary.caravan-loss"
                values={{ items: itemList(entry.riskOutcome.lostItems) }}
              />
            </small>
          ) : null}
        </li>
      );
    case 'travel':
      return (
        <li data-testid={testid} data-summary-kind="travel">
          <FormattedMessage
            id="summary.travel"
            values={{ settlement: name(entry.settlementId) }}
          />
        </li>
      );
  }
}

export function ReturnSummaryModal() {
  const { summary, locale } = useAppState();
  if (!summary) return null;
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true">
      <div className="sheet summary-sheet" data-testid="return-summary">
        <h2>
          <FormattedMessage id="summary.title" />
        </h2>
        <p className="hint">
          <FormattedMessage
            id="summary.elapsed"
            values={{ duration: formatDuration(locale, summary.elapsedSeconds) }}
          />
        </p>
        {summary.capped ? (
          <p role="status" data-testid="summary-capped">
            <FormattedMessage id="summary.capped" values={{ hours: summary.capHours ?? 0 }} />
          </p>
        ) : null}
        <ul className="plain-list summary-list">
          {summary.entries.map((entry, i) => (
            <Row key={i} entry={entry} summary={summary} index={i} />
          ))}
        </ul>
        {summary.netCoinDelta !== 0 ? (
          <p>
            <FormattedMessage
              id="summary.net-coin"
              values={{ coin: formatCoin(locale, summary.netCoinDelta) }}
            />
          </p>
        ) : null}
        <button className="primary" data-testid="summary-collect" onClick={collectSummaryAction}>
          <FormattedMessage id="summary.collect" />
        </button>
      </div>
    </div>
  );
}

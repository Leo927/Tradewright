import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { RouteView } from '@tradewright/contract';
import { useAppState, navigate, travelToAction, openCaravanComposer } from '../state/store.js';
import { useNames } from '../i18n/names.js';
import { formatCoin, formatDuration } from '../i18n/format.js';

function RouteCard({ route }: { route: RouteView }) {
  const { locale, character } = useAppState();
  const { name } = useNames();
  const intl = useIntl();
  const [confirming, setConfirming] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const hasActiveWork = !!character?.assignment && character.assignment.haltReason === null;

  async function travel(confirmHalt: boolean) {
    const code = await travelToAction(route.routeId, confirmHalt);
    if (code === 'CONFIRM_REQUIRED') {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setErrorCode(code);
  }

  return (
    <li className="card" data-testid={`route-${route.routeId}`}>
      <h2>{name(route.toSettlementId)}</h2>
      <p className="hint" data-testid={`route-walk-${route.routeId}`}>
        <FormattedMessage
          id="map.walk"
          values={{ duration: formatDuration(locale, route.travelMinutes * 60) }}
        />
        {' · '}
        <span data-testid={`route-caravan-${route.routeId}`}>
          <FormattedMessage
            id="map.caravan-time"
            values={{ duration: formatDuration(locale, route.caravanMinutes * 60) }}
          />
        </span>
      </p>
      <p className="hint" data-testid={`route-risk-${route.routeId}`}>
        <FormattedMessage
          id="map.risk"
          values={{ level: intl.formatMessage({ id: `risk.${route.riskLevel}` }) }}
        />
      </p>
      {errorCode ? (
        <p role="alert" className="error">
          {intl.formatMessage({ id: `error.${errorCode}` })}
        </p>
      ) : null}
      {confirming ? (
        <div className="confirm" role="dialog">
          <p>
            <FormattedMessage id="map.travel-confirm" />
          </p>
          <button className="primary" data-testid="travel-confirm" onClick={() => void travel(true)}>
            <FormattedMessage id="common.confirm" />
          </button>
          <button onClick={() => setConfirming(false)}>
            <FormattedMessage id="common.cancel" />
          </button>
        </div>
      ) : (
        <div className="seg">
          <button
            className="primary"
            data-testid={`travel-${route.routeId}`}
            onClick={() => void travel(false)}
          >
            <FormattedMessage id="map.travel" />
            {hasActiveWork ? ' …' : ''}
          </button>
          <button
            data-testid={`load-caravan-${route.routeId}`}
            onClick={() => openCaravanComposer(route.routeId)}
          >
            <FormattedMessage id="map.load-caravan" />
          </button>
        </div>
      )}
    </li>
  );
}

export function MapScreen() {
  const { character, routes, locale } = useAppState();
  const { name } = useNames();
  if (!character) return null;
  const traveling = character.locationState.kind === 'traveling';

  return (
    <main className="screen" data-screen="map">
      <header className="screen-header">
        <button onClick={() => navigate('home')}>
          <FormattedMessage id="common.back" />
        </button>
        <h1>
          <FormattedMessage id="nav.map" />
        </h1>
        <span data-testid="wallet" className="wallet">
          {formatCoin(locale, character.wallet)}
        </span>
      </header>

      {traveling && character.locationState.kind === 'traveling' ? (
        <section className="card" data-testid="map-traveling">
          <FormattedMessage
            id="map.on-road"
            values={{
              settlement: name(character.locationState.toSettlementId),
              eta: formatDuration(
                locale,
                Math.max(0, character.locationState.arriveAtTick - character.currentTick) *
                  character.tickSeconds,
              ),
            }}
          />
        </section>
      ) : (
        <>
          <p className="hint" data-testid="map-location">
            <FormattedMessage
              id="map.location"
              values={{
                settlement:
                  character.locationState.kind === 'at'
                    ? name(character.locationState.settlementId)
                    : '…',
              }}
            />
          </p>
          <h2 className="section-label">
            <FormattedMessage id="map.routes-label" />
          </h2>
          {routes.length === 0 ? (
            <p className="hint">
              <FormattedMessage id="map.no-routes" />
            </p>
          ) : (
            <ul className="option-list">
              {routes.map((r) => (
                <RouteCard key={r.routeId} route={r} />
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

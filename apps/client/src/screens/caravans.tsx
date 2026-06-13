import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { RouteView } from '@tradewright/contract';
import { useAppState, navigate, dispatchCaravanAction } from '../state/store.js';
import { useNames } from '../i18n/names.js';
import { formatCoin, formatDuration } from '../i18n/format.js';

function Composer({ route }: { route: RouteView }) {
  const { storage, character, locale } = useAppState();
  const { name, itemList } = useNames();
  const intl = useIntl();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [mitigation, setMitigation] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const slots = storage?.slots ?? [];
  const capacity = character?.caravanCapacityWeight ?? 0;
  const manifest = slots
    .map((s) => ({ itemId: s.itemId, qty: Math.min(Math.max(0, Math.round(qty[s.itemId] ?? 0)), s.qty) }))
    .filter((l) => l.qty > 0);
  const weightOf = new Map(slots.map((s) => [s.itemId, s.weight]));
  const load = manifest.reduce((sum, l) => sum + (weightOf.get(l.itemId) ?? 0) * l.qty, 0);
  const over = load > capacity;
  const dispatchCost = Math.round(route.dispatchCost);
  const guardCost = mitigation ? Math.round(route.mitigationCost) : 0;

  return (
    <section className="card" data-testid="composer">
      <h2 className="section-label">
        <FormattedMessage id="caravans.composer-title" values={{ settlement: name(route.toSettlementId) }} />
      </h2>
      <p className="hint">
        <FormattedMessage id="caravans.cargo-label" />
      </p>
      {slots.length === 0 ? (
        <p className="hint">
          <FormattedMessage id="caravans.empty-storage" />
        </p>
      ) : (
        <ul className="plain-list">
          {slots.map((s) => (
            <li key={s.itemId} data-testid={`manifest-${s.itemId}`}>
              <span>{name(s.itemId)}</span>
              <input
                data-testid={`manifest-qty-${s.itemId}`}
                type="number"
                min={0}
                max={s.qty}
                value={qty[s.itemId] ?? 0}
                onChange={(e) => setQty({ ...qty, [s.itemId]: Number(e.target.value) })}
              />
            </li>
          ))}
        </ul>
      )}
      <p className={over ? 'error' : 'hint'} data-testid="weight-gauge">
        <FormattedMessage id="caravans.weight" values={{ used: load, capacity }} />
        {over ? (
          <>
            {' · '}
            <FormattedMessage id="caravans.over-weight" />
          </>
        ) : null}
      </p>
      <label>
        <input
          data-testid="mitigation-toggle"
          type="checkbox"
          checked={mitigation}
          onChange={(e) => setMitigation(e.target.checked)}
        />
        <FormattedMessage id="caravans.mitigation" values={{ cost: formatCoin(locale, Math.round(route.mitigationCost)) }} />
      </label>
      <p className="hint" data-testid="dispatch-cost">
        <FormattedMessage
          id="caravans.cost-disclosure"
          values={{ dispatch: formatCoin(locale, dispatchCost), guard: formatCoin(locale, guardCost) }}
        />
      </p>
      {errorCode ? (
        <p role="alert" className="error">
          {intl.formatMessage({ id: `error.${errorCode}` })}
        </p>
      ) : null}
      <button
        className="primary"
        data-testid="dispatch-caravan"
        disabled={over || manifest.length === 0}
        onClick={async () => {
          const code = await dispatchCaravanAction({ routeId: route.routeId, manifest, mitigation });
          setErrorCode(code);
          if (!code) {
            setQty({});
            setMitigation(false);
          }
        }}
      >
        <FormattedMessage id="caravans.dispatch" />
        {manifest.length > 0 ? ` · ${itemList(manifest)}` : ''}
      </button>
    </section>
  );
}

export function CaravansScreen() {
  const { character, shipments, routes, composerRouteId, locale } = useAppState();
  const { name, itemList } = useNames();
  if (!character) return null;
  const inTransit = shipments.filter((s) => s.status === 'in-transit');
  const free = character.caravanSlotsTotal - character.caravanSlotsBusy;
  const composerRoute = composerRouteId ? routes.find((r) => r.routeId === composerRouteId) ?? null : null;

  return (
    <main className="screen" data-screen="caravans">
      <header className="screen-header">
        <button onClick={() => navigate('map')}>
          <FormattedMessage id="common.back" />
        </button>
        <h1>
          <FormattedMessage id="nav.caravans" />
        </h1>
        <span data-testid="wallet" className="wallet">
          {formatCoin(locale, character.wallet)}
        </span>
      </header>

      <p className="hint" data-testid="caravan-slots">
        <FormattedMessage
          id="caravans.slots"
          values={{ free, total: character.caravanSlotsTotal }}
        />
      </p>

      <section className="card">
        <h2 className="section-label">
          <FormattedMessage id="caravans.in-transit" />
        </h2>
        {inTransit.length === 0 ? (
          <p className="hint">
            <FormattedMessage id="caravans.none" />
          </p>
        ) : (
          <ul className="plain-list" data-testid="shipment-list">
            {inTransit.map((s) => (
              <li key={s.shipmentId} data-testid={`shipment-${s.shipmentId}`}>
                <span>
                  <FormattedMessage
                    id="caravans.shipment-line"
                    values={{ items: itemList(s.manifest), settlement: name(s.toSettlementId) }}
                  />
                </span>
                <span className="hint" data-testid={`shipment-eta-${s.shipmentId}`}>
                  <FormattedMessage
                    id="caravans.eta"
                    values={{
                      eta: formatDuration(
                        locale,
                        Math.max(0, s.arriveAtTick - character.currentTick) * character.tickSeconds,
                      ),
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {composerRoute ? <Composer route={composerRoute} /> : null}
    </main>
  );
}

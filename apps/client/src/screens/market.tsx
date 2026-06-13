import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { MarketItemView } from '@tradewright/contract';
import { messagesFor, BASE_LOCALE } from '../i18n/catalogs.js';
import {
  useAppState,
  navigate,
  selectMarketSettlement,
  placeOrderAction,
  cancelOrderAction,
} from '../state/store.js';
import { useNames } from '../i18n/names.js';
import { formatCoin } from '../i18n/format.js';

/** Settlement ids derived from the base text catalog — the GUI never reads
 *  mechanics content (Gate 3 boundary). */
const SETTLEMENT_IDS = Object.keys(messagesFor(BASE_LOCALE))
  .filter((k) => /^settlement\.[^.]+\.name$/.test(k))
  .map((k) => k.replace(/\.name$/, ''))
  .sort();

function OrderForm({ itemId, settlementId, canSell }: { itemId: string; settlementId: string; canSell: boolean }) {
  const { locale, market } = useAppState();
  const intl = useIntl();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(1);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const notional = Math.max(0, Math.round(qty)) * Math.max(0, Math.round(price));
  const fee = Math.round(notional * (market?.listingFeeRate ?? 0));
  const tax = Math.round(notional * (market?.salesTaxRate ?? 0));

  return (
    <div className="order-form">
      <div className="seg">
        <button
          data-testid="order-side-buy"
          aria-pressed={side === 'buy'}
          onClick={() => setSide('buy')}
        >
          <FormattedMessage id="market.side-buy" />
        </button>
        <button
          data-testid="order-side-sell"
          aria-pressed={side === 'sell'}
          disabled={!canSell}
          onClick={() => setSide('sell')}
        >
          <FormattedMessage id="market.side-sell" />
        </button>
      </div>
      {!canSell ? (
        <p className="hint">
          <FormattedMessage id="market.sell-remote-note" />
        </p>
      ) : null}
      <label>
        <FormattedMessage id="market.qty-label" />
        <input
          data-testid="order-qty"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />
      </label>
      <label>
        <FormattedMessage id="market.price-label" />
        <input
          data-testid="order-price"
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
      </label>
      <p className="hint" data-testid="order-fee">
        <FormattedMessage
          id="market.fee-disclosure"
          values={{ fee: formatCoin(locale, fee), tax: formatCoin(locale, tax) }}
        />
      </p>
      {errorCode ? (
        <p role="alert" className="error">
          {intl.formatMessage({ id: `error.${errorCode}` })}
        </p>
      ) : null}
      <button
        className="primary"
        data-testid="place-order"
        onClick={async () => {
          const code = await placeOrderAction({
            settlementId,
            side,
            itemId,
            qty: Math.round(qty),
            unitPrice: Math.round(price),
            durationHours: 24,
          });
          setErrorCode(code);
        }}
      >
        <FormattedMessage id="market.place-order" />
      </button>
    </div>
  );
}

function ItemDetail({ item, settlementId, canSell }: { item: MarketItemView; settlementId: string; canSell: boolean }) {
  const { locale } = useAppState();
  const { name } = useNames();
  const asks = item.depth.filter((d) => d.side === 'sell');
  const bids = item.depth.filter((d) => d.side === 'buy');
  const empty = item.depth.length === 0;
  return (
    <section className="card" data-testid={`detail-${item.itemId}`}>
      <h2>{name(item.itemId)}</h2>
      {empty ? (
        <p className="hint" data-testid="empty-book">
          <FormattedMessage id="market.empty-book" />
        </p>
      ) : (
        <>
          <h3 className="section-label">
            <FormattedMessage id="market.asks" />
          </h3>
          <ul className="plain-list">
            {asks.map((d) => (
              <li key={`a${d.unitPrice}`}>
                <FormattedMessage
                  id="market.depth-line"
                  values={{ qty: d.qty, price: formatCoin(locale, d.unitPrice) }}
                />
              </li>
            ))}
          </ul>
          <h3 className="section-label">
            <FormattedMessage id="market.bids" />
          </h3>
          <ul className="plain-list">
            {bids.map((d) => (
              <li key={`b${d.unitPrice}`}>
                <FormattedMessage
                  id="market.depth-line"
                  values={{ qty: d.qty, price: formatCoin(locale, d.unitPrice) }}
                />
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className="section-label">
        <FormattedMessage id="market.recent" />
      </h3>
      {item.recentTrades.length === 0 ? (
        <p className="hint">
          <FormattedMessage id="market.no-trades" />
        </p>
      ) : (
        <ul className="plain-list" data-testid="recent-trades">
          {item.recentTrades.map((t, i) => (
            <li key={i}>
              <FormattedMessage
                id="market.trade-line"
                values={{ qty: t.qty, price: formatCoin(locale, t.unitPrice) }}
              />
            </li>
          ))}
        </ul>
      )}
      <OrderForm itemId={item.itemId} settlementId={settlementId} canSell={canSell} />
    </section>
  );
}

export function MarketScreen() {
  const { market, marketSettlementId, myOrders, character, locale } = useAppState();
  const { name } = useNames();
  const intl = useIntl();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  if (!character) return null;
  const here =
    character.locationState.kind === 'at' ? character.locationState.settlementId : null;
  const settlementId = marketSettlementId ?? here;
  const canSell = settlementId === here;
  const detail = market?.items.find((i) => i.itemId === selectedItem) ?? null;

  return (
    <main className="screen" data-screen="market">
      <header className="screen-header">
        <button onClick={() => navigate('home')}>
          <FormattedMessage id="common.back" />
        </button>
        <h1>
          <FormattedMessage id="nav.market" />
        </h1>
        <span data-testid="wallet" className="wallet">
          {formatCoin(locale, character.wallet)}
        </span>
      </header>

      <section className="card">
        <h2 className="section-label">
          <FormattedMessage id="market.settlement-label" />
        </h2>
        <div className="seg seg-wrap">
          {SETTLEMENT_IDS.map((id) => (
            <button
              key={id}
              data-testid={`market-settlement-${id}`}
              aria-pressed={settlementId === id}
              onClick={() => {
                setSelectedItem(null);
                selectMarketSettlement(id);
              }}
            >
              {name(id)}
            </button>
          ))}
        </div>
      </section>

      <ul className="option-list">
        {(market?.items ?? []).map((item) => (
          <li key={item.itemId}>
            <button
              data-testid={`market-item-${item.itemId}`}
              aria-pressed={selectedItem === item.itemId}
              onClick={() => setSelectedItem(item.itemId)}
            >
              <span>{name(item.itemId)}</span>
              <span className="hint">
                <FormattedMessage
                  id="market.best"
                  values={{
                    bid: item.bestBid === null ? intl.formatMessage({ id: 'market.none' }) : formatCoin(locale, item.bestBid),
                    ask: item.bestAsk === null ? intl.formatMessage({ id: 'market.none' }) : formatCoin(locale, item.bestAsk),
                  }}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {detail && settlementId ? (
        <ItemDetail item={detail} settlementId={settlementId} canSell={canSell} />
      ) : null}

      <section className="card">
        <h2 className="section-label">
          <FormattedMessage id="market.my-orders" />
        </h2>
        {myOrders.length === 0 ? (
          <p className="hint">
            <FormattedMessage id="market.no-orders" />
          </p>
        ) : (
          <ul className="plain-list" data-testid="my-orders">
            {myOrders.map((o) => (
              <li key={o.orderId} data-testid={`my-order-${o.orderId}`}>
                <span>
                  <FormattedMessage
                    id="market.order-line"
                    values={{ side: o.side, qty: o.qtyRemaining, item: name(o.itemId), price: formatCoin(locale, o.unitPrice) }}
                  />{' '}
                  · <FormattedMessage id={`order.status.${o.status}`} />
                </span>
                {o.status === 'open' || o.status === 'partially-filled' ? (
                  <button
                    data-testid={`cancel-order-${o.orderId}`}
                    onClick={() => void cancelOrderAction(o.orderId)}
                  >
                    <FormattedMessage id="common.cancel" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

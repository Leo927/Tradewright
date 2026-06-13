# Design: Trading Post & Ledger (v1)

**Screens**: `market` (`apps/client/src/screens/market.tsx`),
`transactions` (`apps/client/src/screens/transactions.tsx`)
**Story**: US4 (P4) — Trade at the Local Market (FR-031–036, FR-050–054)

## Primary task vs deferred depth (Principle VIII)

- **Primary task** (market): see what an item trades for and place one order.
- **Deferred depth**: the order book depth and recent-trade history live one tap
  deeper, on the item detail. The fee + tax breakdown shows before confirm.
- **Primary task** (ledger): scan recent coin/item movements; paging is the
  deferred depth.

## Layout — market (390×844)

```
┌──────────────────────────────┐
│ ‹ Back   Market    [wallet]   │
│ Settlement: ⟨Brackwater ▾⟩    │  linked market: browse any book (FR-035)
│ ┌ Silverfin   bid 2 · ask 3 ┐ │  item list: best bid/ask, tap for detail
│ ┌ Coney Leather  — · —      ┐ │  empty book renders as "—", not an error
│ …                            │
└──────────────────────────────┘
   Item detail (one tap deeper):
   ┌ Silverfin ───────────────┐
   │ Asks: 3×20  4×8           │  depth, sells high→low / buys high→low
   │ Bids: 2×20                │
   │ Recent: 5×6, 2×6          │  price history (FR-035)
   │ ── place order ──         │
   │ (Buy|Sell) qty[ ] price[ ]│  ≤ 6 inputs (SC-004)
   │ Fee 1 · est. tax 2        │  full disclosure before confirm
   │ [Place order]             │
   └───────────────────────────┘
   My orders:  Silverfin sell 5 @20 · open   [Cancel]
```

## Behavior

- **Linked market** (FR-035): the settlement selector lets any settlement's book
  be browsed from anywhere. Matching still happens only on the home book
  (engine, FR-031). **Sell** is offered only at the settlement where the goods
  sit (the player's current location in V1); **buy** may be placed on any book
  (remote buy, FR-032). The form disables the sell side when browsing a remote
  settlement.
- **Empty book** is a normal state: no liquidity shows as `—` for bid/ask and an
  explicit empty-depth note, with order placement still available (never an
  error — spec edge case).
- **Fee/tax disclosure**: the listing fee (charged now) and the estimated sales
  tax (charged on a sell fill) are shown before confirm (FR-051).
- **Optimistic placement**: the form dispatches `PlaceOrder` and refreshes; a
  rejection (insufficient funds/goods, invalid order) renders the error-code
  message inline. My-orders shows status and a cancel action returning escrow.
- All coin/price values render through the T041 coin formatter (FR-073).

## Layout — transactions (ledger)

```
┌──────────────────────────────┐
│ ‹ Back   Ledger               │
│ trade-sell  +100  Silverfin×5 │  kind code → label, item ids → names,
│ sales-tax    −5               │  amounts via coin formatter, in the active
│ listing-fee  −1               │  locale at view time (FR-076)
│ …                  [Older]    │  paging is the deferred depth
└──────────────────────────────┘
```

- Renders structured `Transaction` records (kind code, item ids, amounts) via
  catalogs in the active locale at view time — a locale switch re-renders the
  history (FR-076). Paged via `GetTransactions { offset, limit }`.

## Test hooks

`data-screen="market"` / `="transactions"`; `market-settlement-{id}`,
`market-item-{itemId}`, `order-side-{buy|sell}`, `order-qty`, `order-price`,
`order-fee`, `place-order`, `my-order-{orderId}`, `cancel-order-{orderId}`,
`empty-book`; `txn-{id}`.

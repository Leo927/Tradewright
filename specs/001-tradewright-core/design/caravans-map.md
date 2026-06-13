# Design: Map, Routes & Caravans (v1)

**Screens**: `map` (`apps/client/src/screens/map.tsx`),
`caravans` (`apps/client/src/screens/caravans.tsx`)
**Story**: US5 (P5) — Haul Goods Between Settlements (FR-040–045, FR-002, FR-041)

## Primary task vs deferred depth (Principle VIII)

- **Primary task** (map): see where you can go from here and how — for each
  route from the current settlement, the destination, the personal-travel time,
  and the caravan time/risk/cost at a glance; one tap starts personal travel or
  opens the caravan composer for that route.
- **Deferred depth** (map): the full risk/cost breakdown (loss fraction,
  mitigation option and its cost) sits in the route row's expanded detail and in
  the caravan composer, not on the first glance.
- **Primary task** (caravans): see in-transit shipments with their arrival
  countdown; compose and dispatch a new caravan.
- **Deferred depth** (caravans): the weight gauge, per-line manifest editing,
  and the full cost disclosure live inside the composer, opened from a route.

The primary action is never buried: personal travel and "load a caravan" are the
top, always-actionable controls on the map; shipment tracking is always visible
on the caravans screen.

## Layout — map (390×844)

```
┌──────────────────────────────┐
│ ‹ Back   Map        [wallet]  │
│ You are at: ⟨Brackwater⟩       │  current location (or "on the road")
│ ┌ → Emberfall ───────────────┐│  one row per route from here
│ │ Walk 25 min · Caravan 3 h  ││  personal vs caravan duration (locale helper)
│ │ Risk: moderate             ││  risk level word + chance one tap deeper
│ │ [Travel]   [Load caravan]  ││  two primary actions per route
│ └────────────────────────────┘│
│ ┌ → Greywatch ───────────────┐│
│ │ Walk 35 min · Caravan 4 h  ││
│ │ Risk: high                 ││
│ │ [Travel]   [Load caravan]  ││
│ └────────────────────────────┘│
└──────────────────────────────┘
   While traveling, the route list is replaced by an in-transit notice with the
   personal-travel arrival countdown; the UI is never blocked (FR-062).
```

## Layout — caravans (390×844)

```
┌──────────────────────────────┐
│ ‹ Back   Caravans   [wallet]  │
│ Slots: 1 of 1 free            │  concurrent-slot availability (FR-041)
│ In transit:                   │
│ ┌ → Emberfall ───────────────┐│  one row per in-transit shipment
│ │ Pinewood ×20 · arrives 2 h ││  manifest summary + arrival countdown
│ └────────────────────────────┘│
│                               │
│ Composer (opened from a route):│
│ ┌ Load → Emberfall ──────────┐│
│ │ ☑ Pinewood   [ 20 ]        ││  per-item qty from current storage
│ │ ☑ Tin Bar    [ 5  ]        ││
│ │ Weight 50 / 50  ▓▓▓▓▓▓▓▓▓▓ ││  weight gauge vs capacity (FR-040)
│ │ ☐ Hire a guard (−25 coin)  ││  mitigation toggle (FR-042)
│ │ Dispatch 30 · guard 25     ││  full cost disclosure before confirm
│ │ Caravan 3 h · risk moderate││
│ │ [Dispatch caravan]         ││
│ └────────────────────────────┘│
```

## Behavior

- **Route source** (FR-040): `GetRoutes` returns only routes touching the
  current settlement; each row's `fromSettlementId` is the current settlement and
  `toSettlementId` the other endpoint. While the character is traveling, the map
  shows the in-transit notice instead and no route is actionable (you cannot
  dispatch or travel while on the road).
- **Personal travel** (FR-002/044): `[Travel]` dispatches `TravelTo`. If an
  activity is running, a confirm step warns it will be halted (`travel`); on
  confirm it re-sends with `confirmHaltAssignment`. Travel is local-immediate —
  the UI flips to the traveling state at once; `TravelArrived` re-renders on
  arrival. A caravan and personal travel on the same route run independent
  timers (spec edge case).
- **Caravan composition** (FR-040/041/042): `[Load caravan]` opens the composer
  for that route. Manifest lines are drawn from the **current settlement's**
  storage; the weight gauge sums `weight × qty` against the hauling-derived
  capacity and turns over-limit visibly. The mitigation toggle and every cost
  (dispatch + optional guard) are disclosed before `[Dispatch caravan]`.
- **Dispatch rejections** render the error-code message inline with the
  structured facts the engine returns: `WEIGHT_EXCEEDED` (load too heavy),
  `CARAVAN_SLOTS_BUSY` (all slots busy — shows when the next frees), and
  `INSUFFICIENT_FUNDS`/`INSUFFICIENT_INPUTS`. A second dispatch beyond the slot
  limit explains the slot availability rather than silently failing.
- **Shipment tracking** (FR-045): `GetShipments` feeds the in-transit list;
  arrival uses the shared locale duration helper for the countdown. Delivered
  shipments leave the in-transit list; the delivery (and any road loss) lands in
  the return summary when it resolves during an absence (FR-014).
- All durations render through the T041 locale duration helper and all coin
  values through the coin formatter (FR-073); layouts tolerate ~40% text
  expansion (FR-077).

## Test hooks

`data-screen="map"` / `="caravans"`; `map-location`, `map-traveling`,
`route-{routeId}`, `route-walk-{routeId}`, `route-caravan-{routeId}`,
`route-risk-{routeId}`, `travel-{routeId}`, `travel-confirm`,
`load-caravan-{routeId}`; `caravan-slots`, `composer`, `manifest-{itemId}`,
`manifest-qty-{itemId}`, `weight-gauge`, `mitigation-toggle`, `dispatch-cost`,
`dispatch-caravan`, `shipment-{shipmentId}`, `shipment-eta-{shipmentId}`.

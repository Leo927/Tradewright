# Contract: Game Protocol (GUI ↔ Engine)

**Date**: 2026-06-11 | **Plan**: [../plan.md](../plan.md) | **Package**: `@tradewright/contract`

This is the constitution Principle V seam. The GUI depends on this contract and nothing else;
the engine implements it. V1 binds it in-process (`LocalTransport`), V2 over WebSocket
(`RemoteTransport`). Every payload is JSON-serializable. The contract is **async by design**
(Principle IX): commands acknowledge, results arrive as events.

## Transport interface

```ts
interface GameTransport {
  send(command: Command): Promise<CommandAck>;     // validates + accepts/rejects, returns fast
  query<Q extends Query>(q: Q): Promise<ResultOf<Q>>; // read-only snapshot, never mutates
  subscribe(listener: (e: GameEvent) => void): Unsubscribe; // push: confirmations, world changes
}
```

`CommandAck = { accepted: true, commandId } | { accepted: false, code: ErrorCode, message }`.
Acceptance means "valid and applied (V1) / applied optimistically pending server (V2)" — final
outcomes are events. Rejections are immediate and explain themselves (e.g.
`INSUFFICIENT_INPUTS`, `NOT_AT_SETTLEMENT`, `STORAGE_FULL`, `CARAVAN_SLOTS_BUSY`,
`TIER_LOCKED`, `INSUFFICIENT_FUNDS`).

## Commands (mutations)

| Command | Payload | Key validations | Spec |
|---|---|---|---|
| CreateCharacter | name, startSettlementId | once per account | FR-001 |
| AssignActivity | activityId | location, tier, inputs; replaces with confirm flag | FR-010/011 |
| StopActivity | — | active assignment exists | FR-010 |
| CollectSummary | — | acknowledges pending EventSummary | FR-014 |
| PlaceOrder | side, itemId, qty, unitPrice, durationHrs | presence at settlement; escrow available | FR-032 |
| CancelOrder | orderId | owner; order open | FR-036 |
| DispatchCaravan | routeId, manifest[], mitigation? | weight ≤ capacity; slot free; costs payable | FR-040/041/043 |
| TravelTo | routeId | not already traveling; halts assignment (confirm flag) | FR-044 |
| ExpandStorage | settlementId | progression cost payable | FR-023 |

## Queries (read-only snapshots)

| Query | Returns | Spec |
|---|---|---|
| GetCharacter | character sheet: skills/levels/xp, wallet, location, assignment, caravan slots | FR-002 |
| GetStorage | settlementId → slots, capacity | FR-022/023 |
| GetActivities | activities at current settlement, with lock state + reasons | FR-015 |
| GetMarket | per item at current settlement: best bid/ask, depth, recent trades — **presence-gated** | FR-031/035 |
| GetMyOrders | own orders across settlements with status | FR-032 |
| GetRoutes | routes from current settlement: durations, risk, costs | FR-045 |
| GetShipments | own caravans with progress + ETA | FR-042 |
| GetTransactions | paged audit log | FR-052 |
| GetSummary | pending offline/event summary | FR-014 |

`GetMarket` only answers for the character's current settlement (plus arrival snapshots a
caravan/visit produced) — price discovery elsewhere is gameplay (FR-035).

## Events (push)

| Event | When | Spec |
|---|---|---|
| ActionCompleted | each completed action (batched under catch-up) | FR-012 |
| SkillLeveled | level/tier threshold crossed; lists unlocks | FR-015 |
| ActivityHalted | inputs exhausted / storage full / travel | FR-016 |
| OrderFilled / OrderPartiallyFilled / OrderExpired / OrderCancelled | order lifecycle; includes proceeds & tax | FR-033/034/036 |
| CaravanArrived | timer completes; includes risk outcome detail | FR-042/043 |
| TravelArrived | personal travel completes | FR-044 |
| SummaryReady | offline catch-up finished; summary payload | FR-014 |
| StateInvalidated | V2 reconciliation: optimistic change rejected; carries correction + reason | Principle IX |
| WalletChanged / StorageChanged | coarse-grained refresh hints for GUI subscriptions | — |

## Interaction classification (Principle IX — binding for all screens)

| Class | Interactions | V1 behavior | V2 behavior |
|---|---|---|---|
| local-immediate | navigation, browsing queries, opening detail views | instant | instant (cached snapshot + refresh) |
| optimistic-with-reconciliation | AssignActivity, StopActivity, CancelOrder, TravelTo, CollectSummary | applied instantly | applied instantly; `StateInvalidated` rolls back visibly |
| server-confirmed-with-pending | PlaceOrder fills, DispatchCaravan outcomes, market matching | resolved by local engine within the same tick (feels instant) | placement optimistic; fills/outcomes arrive as events with per-operation pending badges |

No interaction may block the UI on a round-trip. There is no "blocks the UI" class.

## Versioning

The contract package is semver'd. Additive changes (new optional fields, new events) are MINOR;
anything breaking is MAJOR and requires LocalTransport, RemoteTransport, and client updates in
the same change. V2 handshake includes contract version; mismatch prompts a client refresh.

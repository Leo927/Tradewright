# Design: Return Summary (v1)

**Surface**: modal sheet shown on boot when a pending summary exists
**Story**: US2 (P2) — Return After Time Away (FR-013/014/017; SC-002/005)
**Component**: `apps/client/src/screens/return-summary.tsx`

## Primary task vs deferred depth (Principle VIII)

- **Primary task**: understand what happened while away, in one glance, and
  dismiss with one tap.
- **Deferred depth**: the full transaction log (Ledger screen) and storage
  detail hold the complete record; the summary links nowhere — it is a digest,
  acknowledged and gone.

## Layout (modal sheet over the home screen)

```
┌──────────────────────────────┐
│ While you were away          │  title
│ 8 h away                     │  elapsed (shared duration helper, FR-073)
│ ⚠ Progress stopped after 24 h│  cap notice — ONLY when capped (FR-013)
│ ──────────────────────────── │
│ 480× Fell Pines              │  one row per summary entry kind:
│   +480× Pinewood · +2,400 XP │  · actions (aggregated per activity)
│ ★ Timberfelling → Lv 12      │  · level-up
│ ⚠ Fell Pines halted —        │  · halt (reason + when, FR-016)
│   storage full (3 h ago)     │
│ (orders/caravans join here   │  · order rows (US4), caravan/travel rows
│  in US4/US5 — same list)     │    (US5) — same entry list, new kinds
│ Net coin: +38 ¤              │  net coin (only when nonzero)
│ ──────────────────────────── │
│ [        Collect        ]    │  acknowledge → CollectSummary → close
└──────────────────────────────┘
```

## Row treatments per entry kind (FR-014; kinds from the contract)

| Kind | Treatment |
|---|---|
| `actions` | count × activity name; produced items + XP on second line |
| `level-up` | ★ skill name → new level (tier noted at tier thresholds) |
| `halt` | ⚠ activity + reason message + when (relative, from atTick) |
| `order` (US4) | outcome select (filled/partial/expired) + qty × item + proceeds/tax |
| `caravan` (US5) | arrival settlement + delivered items; risk losses on second line |
| `travel` (US5) | arrival settlement |

All rows are composed from structured ids/codes/values via ICU messages at
display time — a locale switch while the modal is open re-renders it (FR-076).

## Behavior

- Shown automatically on boot when `GetSummary` returns a pending summary.
- The world behind it is already caught up (engine ran catch-up before first
  query); the modal is purely informational.
- `Collect` dispatches `CollectSummary` (optimistic) and closes.
- Scrollable when long; the Collect button stays pinned at the bottom.
- Cap notice appears only when the absence exceeded the offline cap; halt rows
  appear only when a halt occurred (with reason + time, quickstart US2).

## Test hooks

`data-testid="return-summary"`, `summary-row-{index}`, `summary-collect`,
`summary-capped`.

# Design: Character Creation, Settlement Home, Activities (v1)

**Screens**: `create-character`, `home` (settlement home), `activities`
**Story**: US1 (P1) — Begin Life as a Settler (FR-001/002, FR-010-012, FR-015/016, FR-050)
**Layouts tolerant of ~40% expanded text (FR-077): every label wraps, no fixed-width
text containers, buttons grow vertically.**

## 1. Character creation (`create-character`)

**Primary task**: name yourself, pick a home settlement, begin.
**Deferred depth**: settlement descriptions are visible per option (one tap on a
card selects; the description is part of the card, not a deeper layer — there is
no deeper layer here).

```
┌──────────────────────────────┐
│        Tradewright           │  app title
│  Name                        │  label + text input (any script, verbatim)
│  [____________________]      │
│  HOME SETTLEMENT             │  section label
│  ┌ Brackwater ────────── ✓ ┐ │  one card per settlement:
│  │ salt-stained harbor…    │ │  name + 1-line description, tap = select
│  └─────────────────────────┘ │
│  … (4 cards, scrollable)     │
│  [ Begin ]                   │  primary; disabled until name + settlement
└──────────────────────────────┘
```

- Name input: `data-player-text` (rendered verbatim, FR-078); no validation
  beyond non-empty trimmed.
- Cards: `data-testid="settlement-{id}"`; selected card marked + `aria-pressed`.
- Begin dispatches `CreateCharacter` (optimistic, ack < 100 ms in V1) →
  navigates to home. Rejection (e.g. CHARACTER_EXISTS) shows the error-code
  message inline.

## 2. Settlement home (`home`)

**Primary task**: see what you're doing now and what it yields; reach the
activity browser in one tap.
**Deferred depth**: storage detail (own screen), skill list detail (level/xp
per skill — collapsed card → expands), market/map (own screens, via nav).

```
┌──────────────────────────────┐
│ Brackwater          ⚙        │  settlement name (current location), settings
│ 1,234 ¤                      │  wallet (coin formatter)
│ ┌ CURRENT WORK ───────────┐  │
│ │ Fell Pines              │  │  activity name
│ │ ▓▓▓▓▓▓░░░░  43s         │  │  progress to next action + countdown
│ │ +1 Pinewood · +5 XP     │  │  per-action yield
│ │ [ Stop ]                │  │
│ └─────────────────────────┘  │
│   (empty state: "Not working"│
│    + [ Find work ] button)   │
│ ┌ SKILLS ─────────────────┐  │
│ │ Timberfelling  Lv 3  ●  │  │  per-skill row; ● = newly-unlocked badge
│ │ …                       │  │  (badge clears when activities opened)
│ └─────────────────────────┘  │
│ ┌ STORAGE  64 / 100 ──────┐  │  capacity summary, tap → storage screen
│ └─────────────────────────┘  │
│ [Home] [Work] [Settings]     │  bottom nav
└──────────────────────────────┘
```

- Halted activity shows the halt reason (error-code message) and time
  (`halted` state card, amber border).
- If the character is mid-travel (US5), home shows the traveling state instead
  of work; out of scope v1.

## 3. Activity browser (`activities`)

**Primary task**: pick an activity to start.
**Deferred depth**: full input/output/XP detail lives in the confirm dialog
(one tap deeper), not the list.

```
┌──────────────────────────────┐
│ ‹ Back   Work                │
│ TIMBERFELLING (Lv 3)         │  grouped by skill, local activities only
│ ┌ Fell Pines        60s ─┐   │  available: name + action time
│ └────────────────────────┘   │
│ ┌ Fell Oaks   🔒 Tier 2 ─┐   │  locked: visible with tier required
│ └────────────────────────┘   │
│ …                            │
└──────────────────────────────┘
   Tap available → confirm sheet:
┌──────────────────────────────┐
│ Fell Pines                   │
│ 60s per action               │
│ Consumes: —                  │
│ Yields: 1× Pinewood          │
│ XP: +5 Timberfelling         │
│ (replacing? "Replaces Fell   │
│  Pines — progress is lost")  │
│ [ Cancel ]  [ Start ]        │
└──────────────────────────────┘
```

- Locked rows: lock reason rendered from structured codes — skill tier
  (`Tier {n}` chip) or missing inputs (item names + counts; settlements
  holding them when elsewhere — US3 extends).
- Replacing an active assignment requires the confirm sheet's explicit start
  (CONFIRM_REQUIRED path); replacement discards partial-action progress and
  the sheet says so.
- Rows: `data-testid="activity-{id}"`; confirm: `data-testid="confirm-start"`.

## Interaction classification (Principle IX)

| Interaction | Class |
|---|---|
| navigation, browsing | local-immediate |
| CreateCharacter, AssignActivity, StopActivity | optimistic-with-reconciliation |
| progress bar ticking | local rendering from engine events |

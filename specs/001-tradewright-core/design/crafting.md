# Design: Refining & Crafting (v1)

**Screen**: `crafting` (`apps/client/src/screens/crafting.tsx`)
**Story**: US3 (P3) — Refine and Craft (FR-015/016/021/022/037)

The Work screen (settlement-skilling design) now owns **gathering** only;
this screen owns every input-consuming activity (refining + crafting). Both
share the activity confirm sheet and assignment flow.

## Primary task vs deferred depth (Principle VIII)

- **Primary task**: pick a recipe you can run now and start it.
- **Deferred depth**: full input/output/ratio/XP detail lives in the confirm
  sheet (one tap deeper). Lock explanations render inline as compact chips;
  the exact shortfall (item + count + where it is stored) appears in the chip
  and in the rejection message on attempt.

## Layout (390×844)

```
┌──────────────────────────────┐
│ ‹ Back   Crafting            │
│ TANNING (Lv 2)               │  grouped by skill, local recipes only
│ ┌ Tan Coney Leather  2m ──┐  │  available: name + action time
│ └─────────────────────────┘  │
│ ┌ Tan Elk Leather 🔒Tier 2┐  │  tier-locked: visible, tier chip
│ └─────────────────────────┘  │
│ ARMORCRAFT (Lv 1)            │
│ ┌ Stitch a Leather Vest   │  │  input-locked: missing-items chip
│ │  Missing: 2× Coney      │  │  (+ holding settlement when stored
│ │  Leather (at Emberfall) │  │   elsewhere — FR-022 explanation)
│ └─────────────────────────┘  │
└──────────────────────────────┘
   Confirm sheet (shared with Work):
   duration · Consumes: 2× Coney Hide · Yields: 1× Coney Leather · XP
```

## Behavior

- Recipes = local activities with inputs (`stationFamily` set). The station
  gate (FR-037) renders as a tier chip when the local station's effective
  tier is below the recipe tier (`STATION_TIER_LOW` reason).
- Missing-input chips name exact items + quantities; when the missing items
  sit in another settlement's storage, that settlement's name is appended
  (`activities.missing-inputs-held` message).
- Assignment, replacement confirmation, halts, and progress display reuse the
  US1 flow unchanged — a refining action consumes inputs and produces outputs
  atomically per action; exhausted inputs halt with `inputs-exhausted`.

## Test hooks

Same as Work: `data-screen="crafting"`, `data-testid="activity-{id}"`,
shared `confirm-start`.

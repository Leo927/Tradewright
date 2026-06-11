# Quickstart: Challenge & Group Combat Content

**Date**: 2026-06-11 | **Plan**: [plan.md](./plan.md)

Validation guide proving the feature works end-to-end. Implementation details live in
[data-model.md](./data-model.md), [contracts/](./contracts/), and tasks.md.

## Prerequisites

- Node.js 22 LTS, npm ≥ 10
- Repo bootstrapped: `npm install` at the root (001 monorepo)
- Spec 002's combat core implemented (schools, abilities, tactics, gear, control modes) —
  this feature's milestones start after 002's
- Playwright browsers: `npx playwright install chromium`

## Commands (same as 001 — CI parity)

```bash
npm test              # Vitest: engine (encounter, group, worldevents, gearmods), content
npm run test:e2e      # Playwright: phone-viewport flows
npm run dev           # client at localhost with in-process engine (V1)
npm run validate:content  # standalone content build + integrity tests
```

## Validation scenarios

### 1. Mettle trial — active control matters (US1, SC-201)

1. `npm run dev`, create/load a character meeting trial 1's tier gate.
2. Open Challenges → Trial Ladder: trial 1 unlocked; later trials show requirements
   (locked) and advisory gear bands.
3. Enter trial 1; pilot it live: when a telegraph rises, the HUD shows the window
   countdown and answer buttons; pick the matching answer.
4. **Expected**: answered mechanics resolve with their stated outcome; ignored ones apply
   the stated penalty; combat log attributes the difference. Victory grants
   trial-exclusive materials and a score bracket that scales the payout; defeat costs
   only durability + recovery (no-ruin).
5. Re-run the same trial with control mode = auto for the whole fight.
6. **Expected**: the AI gives generic answers only; result is a fail or ≥ 25% slower
   clear than the piloted run (SC-201). Unit suite asserts this deterministically:
   `npm test -- encounter/trial-ai-gap`.

### 2. Dungeon party with interdependence (US2, SC-202/203)

V1 runs this via the scripted co-player test harness; V2 runs it live.

1. `npm test -- group/dungeon-run`: a balanced 5-role scripted party clears the launch
   dungeon within the 30-minute session budget; a uniform glass-cannon party wipes in
   ≥ 70% of seeded attempts.
2. Cooperative mechanic check: the boss's flagged mechanic resolves fully only when the
   required number of distinct members answer within the window; partial answers apply
   the authored partial outcome.
3. Disconnect resilience: drop a scripted member mid-fight.
4. **Expected**: auto-AI takeover within one encounter tick, run never voided, the wipe
   path still banks the haul (SC-203, FR-204). Backfill between encounters: replacement
   joins via the board, is loot-eligible only for bosses fought while present.

### 3. Affliction rotation & gear counters (US3, FR-272)

1. `npm test -- worldevents/rotation`: `rotation(worldSeed, isoWeek)` returns the same
   set for the same week on every run; consecutive weeks differ per the authored pools.
2. In the client: Affliction Board shows this week's dungeons, full modifier stacks, the
   per-level gates (prior clear + character tier; gear band advisory), and the ward/
   resist counter-mapping for each modifier.
3. Run the dungeon at level 1 via harness with and without countering gear modifiers.
4. **Expected**: counter gear measurably mitigates the affliction effects; the run's score
   lands in a disclosed bracket scaling payout; the leaderboard records the score
   (recognition only — verify no material reward attaches to placement).

### 4. Open world: party isolation, events, world boss floor (US5, SC-209)

1. `npm test -- worldevents/elite-isolation`: two parties engage the same elite-zone
   roster; each fight is its own instance — no cross-party effects; solo engage produces
   the honesty warning and a solo party of one.
2. `npm test -- worldevents/boss-contribution`: seeded world boss with 55 scripted
   contributors — all 55 contribution records exist (overflow credited), rewards scale
   by contribution, participants below 10% of the median get nothing, those at/above it
   get the floor (FR-242).
3. Event tie-in: while a seeded eruption event is active, `GetRoutes` shows the raised
   risk on affected routes; it reverts on resolution (FR-241).

### 5. Invasion lifecycle (US6, FR-250/251)

1. `npm test -- worldevents/invasion-lifecycle`: drive settlement activity until the
   threat meter (visible via `GetWarboard`) fills; an invasion schedules with the
   authored notice (48 h) and posts to the warboard.
2. Failed-defense path: facilities degrade by the authored amounts only (never player
   property); contribution repair restores quickly and pays contributors; with zero
   contribution, self-restore completes within the authored multi-day window.
3. Successful-defense path: defenders receive defense-exclusive rewards; the settlement
   prosperity boon applies for its stated duration.

### 6. Gear quality, modifiers, drops (FR-270–272)

1. `npm test -- gearmods`: dropped gear rolls modifiers from the disclosed pools at the
   disclosed odds (chi-squared over seeded mass-rolls); crafting with a craft-mod
   material locks the chosen modifier and rolls the rest; quality grade always equals
   the derived function of modifier count; gear score stays within the tier band and
   scales stats per the curve.
2. In the client: inspect a dropped item — gear score, modifiers, derived grade,
   durability, and counter relationships are all visible.

### 7. Content integrity & boundaries (CI gates)

```bash
npm run validate:content   # integrity tests 1–8 in contracts/content-schema.md
npx dependency-cruiser --validate   # no GUI→engine or content-in-code edges
```

**Expected**: all green; specifically the PvE audit (no player-targeting mechanic — SC-208)
and the economy audit (every exclusive material demanded by ≥ 1 recipe — SC-205) pass.

### 8. E2E sweep (phone viewport)

```bash
npm run test:e2e -- --grep "@challenge"
```

Covers: trial ladder browse + pilot + rank screen; group board create/join/fill; affliction
board disclosure; raid signup commit/decline/waitlist; warboard threat + signup; the V1
"online version" labeling on every multiplayer format (FR-262); all on 390×844 portrait.

## Acceptance checklist

- [ ] Scenario 1: piloted trial beats auto AI per SC-201; no-ruin on defeat
- [ ] Scenario 2: balanced party succeeds, uniform party fails, disconnects never void
- [ ] Scenario 3: rotation deterministic, counters work, leaderboard recognition-only
- [ ] Scenario 4: party isolation, overflow credit, contribution floor, route-risk tie-in
- [ ] Scenario 5: threat meter → notice → outcome → repair/self-restore, all as authored
- [ ] Scenario 6: pools/odds honored, grade derived, gear score in band
- [ ] Scenario 7: content integrity + dependency boundaries green in CI
- [ ] Scenario 8: E2E sweep green on phone viewport

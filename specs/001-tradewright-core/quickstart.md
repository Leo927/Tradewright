# Quickstart: Tradewright — Core Game

**Date**: 2026-06-11 (Parts I/III/IV) / 2026-06-12 (Part II) | **Spec**: [spec.md](./spec.md)

Merged 2026-06-11 from the former specs 001/003/004 quickstarts (spec collapse); the
combat validation guide (Part II) was added 2026-06-12 with the combat design pass.

## Part I — Economy Core (former 001)

How to run, test, and validate the feature end-to-end. Commands here are the same ones CI runs
(constitution Principle II) — if it passes locally it must pass in CI.

### Prerequisites

- Node.js 22 LTS, npm 10+
- First E2E run: `npx playwright install --with-deps chromium`

### Commands

| Action | Command | Notes |
|---|---|---|
| Install | `npm install` | workspace root |
| Run V1 (solo) | `npm run dev` | Vite dev server; open phone viewport in devtools |
| Unit tests | `npm test` | Vitest: engine + content + contract + adapters |
| E2E tests | `npm run test:e2e` | Playwright, 390×844 viewport, V1 LocalTransport |
| Boundary check | `npm run check` | typecheck + lint + dependency-cruiser (Gate 3) |
| Content validation | `npm run validate:content` | schema + world-integrity gates |
| Production build | `npm run build` | client PWA bundle |
| Run V2 server (M5) | `npm run dev:server` | Fastify + WebSocket; client mode picker shows Online |
| V2 E2E (M5) | `npm run test:e2e:online` | same flow specs, RemoteTransport against local server |

Test-time control: E2E and unit tests drive the engine's injected clock (research R6/R9) —
"wait 2 hours" is a clock call, never a sleep.

### Validation scenarios (map to spec user stories)

**US1 — Begin Life as a Settler**: `npm run dev` → create character, pick settlement, assign a
tier-1 gathering activity. Expect: progress bar cycles at the activity's stated action time;
storage count and skill XP tick up exactly per action. E2E: `tests/e2e/skilling.spec.ts`.

**US2 — Return After Time Away**: with an activity running, advance the test clock 8 h, reload.
Expect: summary modal reports actions = ⌊8 h ÷ action time⌋, matching items/XP; cap behavior at
> 24 h states the cap; storage-full mid-absence shows halt time and reason. E2E:
`tests/e2e/offline.spec.ts`.

**US3 — Refine and Craft**: with gathered inputs in local storage, assign a refining activity,
then craft a finished good needing outputs of two skills. Expect: inputs consumed at stated
ratios; missing-input assignment is rejected with exact shortfall; cross-settlement materials
are unusable. E2E: `tests/e2e/crafting.spec.ts`.

**US4 — Trade at the Local Market**: at the trading post, place a sell order (goods escrow),
then a buy order that crosses it. Expect: fill at best price, tax deducted and disclosed,
goods/coin land correctly, the listing is browsable from a *different* settlement (linked
market) but lives only on its home book, and a remote buy delivers to the buyer's storage at
the listing's settlement.
NPC drift check: buy out NPC sell depth for an item; its quote rises next market tick. E2E:
`tests/e2e/market.spec.ts`.

**US5 — Haul Goods Between Settlements**: buy low in town A, dispatch a caravan to town B
(weight, duration, risk, costs shown pre-confirm), advance clock past arrival, travel character
to B, sell high. Expect: end-to-end profit = price spread − taxes − fees − dispatch − risk
losses; UI never blocks during transit; second dispatch beyond slot limit explains itself. E2E:
`tests/e2e/caravan.spec.ts`.

**Economic integrity (cross-cutting)**: engine property tests assert conservation (no
duplication/loss) across randomized trade/caravan/halt sequences — see data-model invariant 1,
SC-010.

### Definition of "feature validated"

1. `npm run check`, `npm test`, `npm run validate:content`, `npm run test:e2e` all green locally
   and in CI on the same commit.
2. All five story scenarios above pass as Playwright specs at phone viewport.
3. Offline ≡ online determinism test passes (same inputs, tick-replay vs live, identical state).
4. (M5) The same five flow specs pass against the server via `npm run test:e2e:online`,
   proving the V1/V2 contract swap (constitution Principle V architecture test).

## Part II — Combat Core (added 2026-06-12)

Validation guide proving the combat pillar works end-to-end. Implementation details live
in [data-model.md](./data-model.md) Part II, [contracts/](./contracts/) Part II, and
tasks.md (regenerated per milestone).

### Prerequisites

- Node.js 22 LTS, npm ≥ 10; repo bootstrapped (`npm install`)
- The economy core (M1) implemented — expeditions occupy the Part I activity slot, loot
  lands in Part I storage/markets
- Playwright browsers: `npx playwright install chromium`

### Commands (same as Part I — CI parity)

```bash
npm test              # Vitest: engine (combat resolver, tactics, expeditions), content
npm run test:e2e      # Playwright: phone-viewport flows
npm run dev           # client at localhost with in-process engine (V1)
npm run validate:content  # schema + Part II integrity tests
```

### Validation scenarios

#### 1. Onboarding & auto-battle (US6, FR-113, SC-101/102)

1. `npm run dev` with a fresh character: the hunting grounds are visible on the
   settlement screen from creation.
2. Open them: the school-adoption choice appears (all launch schools, free); pick one.
3. **Expected**: a tier-1 starter weapon/focus is granted exactly once
   (`npm test -- combat/starter-grant` asserts the grant is idempotent forever) and the
   grounds show the roster with tiers, relative difficulty, and drop summaries.
4. Start an expedition against a tier-1 enemy with the default tactics; provide no
   further input. Navigate away and back.
5. **Expected**: ready loadout → running expedition within 4 inputs / 30 s (SC-101);
   fights run themselves indefinitely — kills, XP, mastery, and loot accrue exactly per
   the enemy and ability definitions (`npm test -- combat/auto-battle` verifies rates
   deterministically for every launch enemy, SC-102); a compact status indicator stays
   visible while elsewhere in the app.

#### 2. Schools, abilities, tactics (US7/US8, SC-108)

1. Level the school's mastery to its first ability unlock; slot the ability.
2. **Expected**: it casts per its cooldown/effect/log definition when its tactics rule
   fires; an empty-slot build fights with basic attacks only (FR-165).
3. Configure two different tactics programs over the same build and enemy
   (`npm test -- combat/tactics-rules`).
4. **Expected**: both logs are 100% rule-explainable (highest-priority satisfied rule
   casts, FR-168) and materially different; with nothing configured, the school default
   applies (FR-167).
5. Tactics parity (SC-108): `npm test -- combat/tactics-parity` — for every launch
   enemy, the best manual tap-cast trace is reproducible by tactics rules alone; manual
   play is never strictly required on standard content.
6. Tap-to-cast: while spectating, tap a ready ability — it casts immediately; abilities
   on cooldown show remaining time and cannot be forced (FR-164).

#### 3. Trees, respec, builds matter (US9, SC-107)

1. Spend mastery points down one branch; verify each passive's exact stated effect
   appears in combat math next tick, and a tree-unlocked active becomes slottable.
2. Respec for the coin cost.
3. **Expected**: all points refund, all effects cleanly remove, the fee hits the
   transaction log (sink), invalidated slotted abilities unslot and dependent tactics
   rules are flagged inert with notice — never a mid-combat error (FR-173).
4. `npm test -- combat/build-yield`: a well-chosen school/tree/tactics build improves
   expedition yield ≥ 25% over the default at equal gear, and ≥ 2 materially different
   builds per school land within 10% of each other (SC-107). Point scarcity: one school
   cannot fill both branches (content test, FR-171).

#### 4. Gear, provisions, durability (US10)

1. Equip two gear sets against the same enemy (`npm test -- combat/gear-delta`).
2. **Expected**: the stronger set measurably improves outcomes; stat totals and the
   fitness hint update on equip; a gear perk modifier's stated interaction shows in the
   combat log.
3. Provisions auto-consume at the configured thresholds and restore per definition,
   logged (FR-121).
4. Durability decreases per the wear rate; at zero the item grants no stats or perks
   until repaired for the stated coin/materials, and the mid-fight break is logged with
   its consequences (FR-122, edge case).

#### 5. Offline expeditions & risk without ruin (US11/US12, SC-103/104)

1. Start a provisioned expedition, advance the test clock past provision exhaustion,
   reload.
2. **Expected**: the unified return summary reports defeats, XP/mastery/points, loot,
   consumption, durability, and the early end time — matching the deterministic
   expectation exactly; offline ≡ online for identical builds/tactics
   (`npm test -- combat/offline-parity`, SC-103). Offline catch-up of a 24 h absence
   stays inside the 3 s budget (benchmark in CI, research R1 (combat)).
3. Send an under-built character against a too-strong enemy.
4. **Expected**: automatic retreat at the configured threshold — haul banked in full,
   extra durability wear, minutes-scale recovery gating expeditions only; stored items,
   coin, gear (beyond durability), progression, and tree points are never reduced by any
   combat outcome (`npm test -- combat/no-ruin` property suite, SC-104).

#### 6. Combat feeds the economy (US13, SC-105/106)

`npm run validate:content` plus `npm test -- content/combat-economy`: every hunting
region yields ≥ 1 combat-exclusive material and regions differ; ≥ 20% of crafting recipes
demand combat materials; drop tables pay no coin (sole-faucet rule, FR-053); combat
materials trade, escrow, and ship like any good; at least one profitable tier-1
fighter→market loop exists; repair and respec sinks are live in the transaction log.

#### 7. Content integrity & boundaries (CI gates)

```bash
npm run validate:content   # Part II integrity tests 1–8 in contracts/content-schema.md
npx dependency-cruiser --validate   # no GUI→engine edges (transport adapter excepted) or content-in-code edges
```

#### 8. E2E sweep (phone viewport)

```bash
npm run test:e2e -- --grep "@combat"
```

Covers: onboarding (grounds visible at creation, school adoption, starter kit); start/
monitor/recall an expedition; loadout + tactics editors; tree spend + respec; repair
flow; the unified offline summary; all on 390×844 portrait (SC-109).

### Acceptance checklist

- [ ] Scenario 1: grounds open from creation; starter kit once ever; auto-battle runs
      with zero input at predicted rates
- [ ] Scenario 2: abilities fire per tactics; logs rule-explainable; tactics parity holds
- [ ] Scenario 3: tree effects apply/remove cleanly; builds beat defaults ≥ 25%; no
      single solved build
- [ ] Scenario 4: gear deltas measurable; provisions auto-consume; broken gear honest
- [ ] Scenario 5: offline ≡ online; retreat banks haul; no-ruin invariant 0 violations
- [ ] Scenario 6: combat-economy mandates green; no coin drops
- [ ] Scenario 7: content integrity + dependency boundaries green in CI
- [ ] Scenario 8: E2E sweep green on phone viewport

## Part III — Challenge & Group Layer (former 003)

Validation guide proving the feature works end-to-end. Implementation details live in
[data-model.md](./data-model.md), [contracts/](./contracts/), and tasks.md.

### Prerequisites

- Node.js 22 LTS, npm ≥ 10
- Repo bootstrapped: `npm install` at the root (the economy core monorepo)
- The combat core (former spec 002) implemented (schools, abilities, tactics, gear, control
  modes) — this feature's milestones start after the combat core's
- Playwright browsers: `npx playwright install chromium`

### Commands (same as the economy core — CI parity)

```bash
npm test              # Vitest: engine (encounter, group, worldevents, gearmods), content
npm run test:e2e      # Playwright: phone-viewport flows
npm run dev           # client at localhost with in-process engine (V1)
npm run validate:content  # standalone content build + integrity tests
```

### Validation scenarios

#### 1. Mettle trial — active control matters (US1, SC-201)

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

#### 2. Dungeon party with interdependence (US2, SC-202/203)

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

#### 3. Affliction rotation & gear counters (US3, FR-272)

1. `npm test -- worldevents/rotation`: `rotation(worldSeed, isoWeek)` returns the same
   set for the same week on every run; consecutive weeks differ per the authored pools.
2. In the client: Affliction Board shows this week's dungeons, full modifier stacks, the
   per-level gates (prior clear + character tier; gear band advisory), and the ward/
   resist counter-mapping for each modifier.
3. Run the dungeon at level 1 via harness with and without countering gear modifiers.
4. **Expected**: counter gear measurably mitigates the affliction effects; the run's score
   lands in a disclosed bracket scaling payout; the leaderboard records the score
   (recognition only — verify no material reward attaches to placement).

#### 4. Open world: party isolation, events, world boss floor (US5, SC-209)

1. `npm test -- worldevents/elite-isolation`: two parties engage the same elite-zone
   roster; each fight is its own instance — no cross-party effects; solo engage produces
   the honesty warning and a solo party of one.
2. `npm test -- worldevents/boss-contribution`: seeded world boss with 55 scripted
   contributors — all 55 contribution records exist (overflow credited), rewards scale
   by contribution, participants below 10% of the median get nothing, those at/above it
   get the floor (FR-242).
3. Event tie-in: while a seeded eruption event is active, `GetRoutes` shows the raised
   risk on affected routes; it reverts on resolution (FR-241).

#### 5. Invasion lifecycle (US6, FR-250/251)

1. `npm test -- worldevents/invasion-lifecycle`: drive settlement activity until the
   threat meter (visible via `GetWarboard`) fills; an invasion schedules with the
   authored notice (48 h) and posts to the warboard.
2. Failed-defense path: facilities degrade by the authored amounts only (never player
   property); contribution repair restores quickly and pays contributors; with zero
   contribution, self-restore completes within the authored multi-day window.
3. Successful-defense path: defenders receive defense-exclusive rewards; the settlement
   prosperity boon applies for its stated duration.

#### 6. Gear quality, modifiers, drops (FR-270–272)

1. `npm test -- gearmods`: dropped gear rolls modifiers from the disclosed pools at the
   disclosed odds (chi-squared over seeded mass-rolls); crafting with a craft-mod
   material locks the chosen modifier and rolls the rest; quality grade always equals
   the derived function of modifier count; gear score stays within the tier band and
   scales stats per the curve.
2. In the client: inspect a dropped item — gear score, modifiers, derived grade,
   durability, and counter relationships are all visible.

#### 7. Content integrity & boundaries (CI gates)

```bash
npm run validate:content   # integrity tests 1–8 in contracts/content-schema.md
npx dependency-cruiser --validate   # no GUI→engine edges (transport adapter excepted) or content-in-code edges
```

**Expected**: all green; specifically the PvE audit (no player-targeting mechanic — SC-208)
and the economy audit (every exclusive material demanded by ≥ 1 recipe — SC-205) pass.

#### 8. E2E sweep (phone viewport)

```bash
npm run test:e2e -- --grep "@challenge"
```

Covers: trial ladder browse + pilot + rank screen; group board create/join/fill; affliction
board disclosure; raid signup commit/decline/waitlist; warboard threat + signup; the V1
"online version" labeling on every multiplayer format (FR-262); all on 390×844 portrait.

### Acceptance checklist

- [ ] Scenario 1: piloted trial beats auto AI per SC-201; no-ruin on defeat
- [ ] Scenario 2: balanced party succeeds, uniform party fails, disconnects never void
- [ ] Scenario 3: rotation deterministic, counters work, leaderboard recognition-only
- [ ] Scenario 4: party isolation, overflow credit, contribution floor, route-risk tie-in
- [ ] Scenario 5: threat meter → notice → outcome → repair/self-restore, all as authored
- [ ] Scenario 6: pools/odds honored, grade derived, gear score in band
- [ ] Scenario 7: content integrity + dependency boundaries green in CI
- [ ] Scenario 8: E2E sweep green on phone viewport

## Part IV — Relics & Delves (former 004)

Validation guide proving the feature works end-to-end. Implementation details live in
[data-model.md](./data-model.md), [contracts/](./contracts/), and tasks.md.

### Prerequisites

- Node.js 22 LTS, npm ≥ 10
- Repo bootstrapped: `npm install` at the root (the economy core monorepo)
- The combat core and the challenge layer (encounter system, gear modifiers, groups)
  implemented — this feature's milestones start after M3.0 at minimum (relics) and reuse
  the challenge layer's encounter runtime (delves)
- Playwright browsers: `npx playwright install chromium`

### Commands (same as the economy core and challenge layer — CI parity)

```bash
npm test              # Vitest: engine (relics, delve, + extended trade/gearmods), content
npm run test:e2e      # Playwright: phone-viewport flows
npm run dev           # client at localhost with in-process engine (V1)
npm run validate:content  # standalone content build + integrity tests
```

### Validation scenarios

#### 1. Relic chase: source pays once, build changes (US1, SC-301/304)

1. `npm run dev`; open the Relic Compendium with a fresh character.
2. **Expected**: every authored relic visible — name, tier, full signature modifier,
   equip category, disclosed source, awakening overview, duplicate compensation;
   multiplayer-only sources carry the honest "online version" label (FR-307).
3. Complete the V1 mettle-trial relic source at the required rank.
4. **Expected**: `RelicGranted` — the relic arrives dormant (signature active, slots
   sealed, gear score at top of tier band, no roll), the compendium marks it owned.
5. Equip it; run a fight and check the combat log.
6. **Expected**: the signature modifier's stated effect appears in combat math and log
   (US1-AS3); equipping a second relic of the same category is blocked with the guided
   swap, never silently (US1-AS4).
7. Complete the same source again: `npm test -- relics/grant-once` asserts the duplicate
   compensation pays instead of a second copy, deterministically, and that the grant
   record blocks every repeat forever (SC-304).

#### 2. Relic trade: tradable, never duplicated (US1-AS6, FR-303)

1. `npm test -- relics/trade`: list, escrow, and ship a relic between two characters;
   awakening state (unsealed slots + locked modifiers) arrives intact with the item;
   compendium ownership flips on both sides.
2. Attempt delivery of a relic the recipient already owns.
3. **Expected**: blocked with `RELIC_ALREADY_OWNED` *before any payment*; after the owner
   sells their copy, the same purchase succeeds — the market remains a path back.

#### 3. Awakening track (US2, SC-303)

1. With a dormant relic and seeded materials: open the awakening track.
2. **Expected**: every step shows deed requirement, material cost, unseal target, and
   live progress (US2-AS1).
3. Satisfy step 1's deed via play (or the seeded deed-counter fixture), confirm the step.
4. **Expected**: materials consumed from local storage, slot unsealed, step recorded on
   the item; confirming without the deed or materials fails with the specific error.
5. Lock a chosen modifier into the unsealed slot with craft-mod materials; re-lock a
   different one at the disclosed cost.
6. **Expected**: modifier applies per definition; quality grade rises by the derived
   count rule; the signature modifier is never replaceable (`SIGNATURE_MODIFIER_IMMUTABLE`).
7. `npm test -- content/awakening-economy`: every track demands ≥ 1 market-tradable
   material (SC-303).

#### 4. Delve core loop: stake without ruin (US3, SC-305/306)

1. `npm test -- delve/two-stream`: a scripted 3-player party clears two floors — base
   haul (XP, mastery, standard loot) banks instantly per kill; venture ledgers accrue
   per member per floor at the depth multiplier. Withdraw at the landing: every member
   is paid exactly their ledger (personal rolls), depth recorded.
2. Identical-seed party descends a third floor and wipes.
3. **Expected**: base haul fully kept, exactly the unbanked ledgers forfeited, only
   standard durability/recovery costs — no owned item, coin, or progression lost
   (FR-204 binding; the independent test from the spec, verbatim).
4. Landing protocol: `npm test -- delve/landing`: pool value and next floor's
   multiplier/difficulty disclosed before the leader's call; a dissenting member opts out
   during the ready-check, is paid their full ledger, and the rest descend at recomputed
   scaling; mid-floor abandonment forfeits the abandoner's unbanked share only.
5. Disconnect: auto AI holds the character; at a landing with no live leader, leadership
   transfers per the challenge layer's rules, and an all-AI party auto-withdraws — the
   pool pays, never silently forfeited.
6. In the client (solo, V1): enter a delve site; the entry sheet shows party scaling,
   multiplier curve, full stake rules, and session expectation; first landing is
   reachable inside ~10 minutes of entry (SC-305 pacing).

#### 5. Depth ladder & weekly expedition (US4, SC-307)

1. `npm test -- delve/determinism`: same site, same seed, same party inputs → identical
   floor layouts and encounter sequences; distinct seeds → materially different descents
   (SC-307, property-tested over seed/depth ranges).
2. `npm test -- delve/weekly-seed`: `weeklySeed(worldSeed, siteId, isoWeek)` is stable
   within a week, differs across weeks/sites; unlimited attempts — the character's best
   depth of the week posts; leaderboard rows carry no material reward; ties share rank.
3. Reach a relic's delve-depth milestone via harness.
4. **Expected**: the relic grant resolves per Scenario 1's rules (once ever, duplicate
   compensation thereafter).
5. Under-size push: a solo run past the full-party depth band shows the honest
   "assumes a full party" warning, scaling diminishes per the disclosed curve, entry is
   never blocked.

#### 6. Economy interlock (FR-316, SC-303)

`npm run validate:content` plus `npm test -- content/delve-economy`: every delve-exclusive
material is demanded by ≥ 1 recipe; delve materials are among craft-mod sources; the
launch awakening tracks that require delve materials resolve; the reward-cap lever config
is valid and inactive.

#### 7. Content integrity & boundaries (CI gates)

```bash
npm run validate:content   # integrity tests 1–9 in contracts/content-schema.md
npx dependency-cruiser --validate   # no GUI→engine edges (transport adapter excepted) or content-in-code edges
```

**Expected**: all green — notably signature exclusivity (test 1), the V1-obtainable relic
(test 2), curve totality/no-final-floor (test 5), and the originality denylist incl.
"Artifact"/"Catacomb" feature labels (test 8).

#### 8. E2E sweep (phone viewport)

```bash
npm run test:e2e -- --grep "@relic|@delve"
```

Covers: compendium browse + honest labels; earn-equip-swap flow; awakening track confirm +
modifier lock; delve entry sheet disclosure; floor HUD (challenge-layer encounter HUD
reuse) + landing decision sheet + opt-out; withdraw payout and wipe forfeit messaging;
depth records and weekly leaderboard screens; all on 390×844 portrait.

### Acceptance checklist

- [ ] Scenario 1: compendium full disclosure; dormant grant; signature effect visible;
      source pays once
- [ ] Scenario 2: relics trade with state intact; owned-copy delivery blocked pre-payment
- [ ] Scenario 3: awakening consumes/unseals/locks per track; grade derived; signature
      immutable
- [ ] Scenario 4: two streams hold — base banks, ledgers stake; wipe forfeits only
      unbanked; landing protocol incl. opt-out works
- [ ] Scenario 5: seed determinism + divergence; weekly leaderboard recognition-only;
      milestone relic pays
- [ ] Scenario 6: delve materials demanded by recipes, craft-mods, awakening tracks
- [ ] Scenario 7: content integrity + dependency boundaries green in CI
- [ ] Scenario 8: E2E sweep green on phone viewport

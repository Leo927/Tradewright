# Quickstart: Relic Gear & Delve Descents

**Date**: 2026-06-11 | **Plan**: [plan.md](./plan.md)

Validation guide proving the feature works end-to-end. Implementation details live in
[data-model.md](./data-model.md), [contracts/](./contracts/), and tasks.md.

## Prerequisites

- Node.js 22 LTS, npm ≥ 10
- Repo bootstrapped: `npm install` at the root (001 monorepo)
- Specs 002 (combat core) and 003 (encounter system, gear modifiers, groups) implemented —
  this feature's milestones start after M3.0 at minimum (relics) and reuse the 003
  encounter runtime (delves)
- Playwright browsers: `npx playwright install chromium`

## Commands (same as 001/003 — CI parity)

```bash
npm test              # Vitest: engine (relics, delve, + extended trade/gearmods), content
npm run test:e2e      # Playwright: phone-viewport flows
npm run dev           # client at localhost with in-process engine (V1)
npm run validate:content  # standalone content build + integrity tests
```

## Validation scenarios

### 1. Relic chase: source pays once, build changes (US1, SC-301/304)

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

### 2. Relic trade: tradable, never duplicated (US1-AS6, FR-303)

1. `npm test -- relics/trade`: list, escrow, and ship a relic between two characters;
   awakening state (unsealed slots + locked modifiers) arrives intact with the item;
   compendium ownership flips on both sides.
2. Attempt delivery of a relic the recipient already owns.
3. **Expected**: blocked with `RELIC_ALREADY_OWNED` *before any payment*; after the owner
   sells their copy, the same purchase succeeds — the market remains a path back.

### 3. Awakening track (US2, SC-303)

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

### 4. Delve core loop: stake without ruin (US3, SC-305/306)

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
   transfers per 003 rules, and an all-AI party auto-withdraws — the pool pays, never
   silently forfeited.
6. In the client (solo, V1): enter a delve site; the entry sheet shows party scaling,
   multiplier curve, full stake rules, and session expectation; first landing is
   reachable inside ~10 minutes of entry (SC-305 pacing).

### 5. Depth ladder & weekly expedition (US4, SC-307)

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

### 6. Economy interlock (FR-316, SC-303)

`npm run validate:content` plus `npm test -- content/delve-economy`: every delve-exclusive
material is demanded by ≥ 1 recipe; delve materials are among craft-mod sources; the
launch awakening tracks that require delve materials resolve; the reward-cap lever config
is valid and inactive.

### 7. Content integrity & boundaries (CI gates)

```bash
npm run validate:content   # integrity tests 1–9 in contracts/content-schema.md
npx dependency-cruiser --validate   # no GUI→engine or content-in-code edges
```

**Expected**: all green — notably signature exclusivity (test 1), the V1-obtainable relic
(test 2), curve totality/no-final-floor (test 5), and the originality denylist incl.
"Artifact"/"Catacomb" feature labels (test 8).

### 8. E2E sweep (phone viewport)

```bash
npm run test:e2e -- --grep "@relic|@delve"
```

Covers: compendium browse + honest labels; earn-equip-swap flow; awakening track confirm +
modifier lock; delve entry sheet disclosure; floor HUD (003 encounter HUD reuse) + landing
decision sheet + opt-out; withdraw payout and wipe forfeit messaging; depth records and
weekly leaderboard screens; all on 390×844 portrait.

## Acceptance checklist

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

# Research: Relic Gear & Delve Descents

**Date**: 2026-06-11 | **Plan**: [plan.md](./plan.md)

Resolves every open technical question from the plan's Technical Context. No NEEDS
CLARIFICATION markers remain. Inherits 001's research (PWA, monorepo, contract shape, tick
model, seeded RNG, save format) and 003's research (R1 encounter tick, R2 mechanic
vocabulary, R3 two-host instances, R4 windowed answers, R5 group state, R7 deterministic
loot, R9 gear/modifier model) without change. Numbering below is local to this feature.

## R1 — Relic uniqueness: enforced at acquisition edges, not by binding

**Decision**: A relic is an ordinary `GearItemInstance` (003 R9) of a `RelicDef`. There is
no bound-item mechanism anywhere. The one-copy-per-character rule (FR-303) is enforced at
the only two places a relic can enter a character's possession:

1. **Source grant**: a per-character, per-relic `RelicGrantRecord` is written the first
   time a source pays out; the engine checks it before granting. A source completion with
   an existing grant record pays the relic's authored duplicate compensation instead —
   whether or not the character still owns the item.
2. **Trade delivery**: market purchase, escrow release, and shipment delivery validate
   "recipient does not currently own a copy" before any payment or transfer commits, and
   reject with `RELIC_ALREADY_OWNED` and a clear explanation. Listing a relic for sale is
   always allowed; the check is on the receiving side.

Current ownership is an indexed lookup over item instances (inventory, storage, equipped,
escrow holdings); the grant record is permanent history and never blocks trade — only the
source's second payout.

**Rationale**: The clarified spec keeps relics inside the all-goods-trade norm (002
FR-123) — binding would create a new item class the game otherwise never needs. Two edge
checks are auditable (SC-304) and leave every other system (storage, escrow, shipping,
pricing) untouched.

**Alternatives considered**: bound items (rejected by spec clarification); blocking the
*listing* of a relic the buyer owns (impossible — sellers list to a market, not a buyer);
allowing duplicates and blocking only dual-equip (violates FR-303's one-copy rule and
makes the compendium's owned state ambiguous).

## R2 — Awakening state: item state on the instance, deed progress per character

**Decision**: The relic's `GearItemInstance` carries its awakening state: which slots are
unsealed and which modifiers are locked (the signature modifier is fixed instance data,
never a slot). This state travels with the item through trade, escrow, and shipping
(FR-304). Deed progress toward an *incomplete* awakening step is a separate per-character
runtime record (`AwakeningProgress {characterId, relicDefId, stepIndex, deedCounters}`)
that does not transfer: a buyer of a half-awakened relic gets the unsealed slots and locked
modifiers, and starts the next step's deeds from zero.

Completing a step is a single atomic command: deed requirement satisfied + materials in
local storage → materials consumed, slot unsealed, step recorded on the item. Locking and
re-locking modifiers into unsealed slots reuses the 003 craft-mod mechanism (FR-271)
verbatim — same materials, same disclosed costs, same engine path.

**Rationale**: Splitting durable item state from personal effort matches the spec's own
line ("unsealed slots and locked modifiers are permanent item state … deed progress … is
per character", FR-304) and keeps the trade path simple: the item is self-describing, no
cross-character state migrates. Reusing craft-mod locking means awakening adds zero new
modifier mechanics — only the unseal gate is new.

**Alternatives considered**: deed progress on the item (lets buyers inherit a stranger's
kill counters — incoherent and exploitable); a separate "relic state" entity keyed by item
id (needless indirection — the instance already serializes per 003 R9); awakening as
crafting recipes (recipes produce items; awakening mutates one — wrong primitive).

## R3 — Signature modifiers: flagged entries in the existing modifier vocabulary

**Decision**: `SignatureModifierDef` is a `GearModifierDef` (003 R9) with
`signatureOf: relicId` set. Schema and integrity tests enforce: a signature modifier
appears in no `ModifierPoolDef`, no craft-mod recipe, and exactly one relic; it is part of
the relic's authored definition, not a slot. Quality grade derives from filled modifier
count exactly as for all gear (003 FR-270), and the signature modifier counts toward it —
a dormant relic therefore already holds grade(1), and full awakening reaches the same
maximum grade as fully modified crafted gear. Signature effects use the same `EffectExpr`
vocabulary as all modifiers; build-defining behavior (transforming abilities, stances,
provisions, tactics interactions) is expression within that vocabulary, audited per relic
by SC-301, not a new effect system.

**Rationale**: One modifier system with a flag keeps the entire 003 inspection, counter,
and grade machinery working on relics for free; pool/recipe exclusion enforced by content
tests makes "exists on no other item" (FR-301) a CI property rather than an authoring
promise.

**Alternatives considered**: a parallel signature-effect system (duplicates EffectExpr,
splits the audit surface); signature as a locked modifier in slot 0 (FR-305 forbids it
occupying a player-fillable slot — modeling it as fixed instance data is the direct
encoding); not counting the signature toward grade (would make a fully awakened relic cap
below crafted gear's grade scale, contradicting US2's "raising the quality grade to the
maximum").

## R4 — Procedural descents: pure assembly function over authored pools

**Decision**: Floor generation is a pure function
`assembleFloor(siteDef, seed, depth, partySize) → FloorPlan`, where a `FloorPlan` names an
authored `RoomDef` sequence, an encounter sequence drawn from the site's authored pools,
and the depth modifiers in force. The function draws from a deterministic per-descent RNG
sub-stream (001 seeded-RNG discipline), so identical `(seed, party inputs)` reproduce an
identical descent (FR-310, 002 FR-106) and distinct seeds diverge materially (SC-307 is a
property test over the function). Depth is unbounded (FR-314): the function is total over
all depths — pools remix with depth-indexed weights and the authored difficulty and
multiplier curves (R6) supply the practical limit; no floor is "the last".

Floors are generated lazily — floor *n+1* is assembled when the party descends — so an
unbounded descent never materializes unbounded data. Boss-grade floors occur at authored
intervals via pool weighting keyed to depth.

**Rationale**: Pure-function generation is the same move as 003's rotation schedule (003
R8): no stored layout state, trivially testable for any seed/depth in CI, and the
authoring seam stays intact — rooms, encounters, and depth modifiers are authored content
(001 FR-024); only their assembly is systemic, exactly the spec's out-of-scope line.

**Alternatives considered**: pre-generating N floors at entry (arbitrary cap contradicts
unbounded descents; wasted work on early withdrawals); roguelike grammar/graph generation
of room *content* (out of scope — assembly only); storing generated layouts in the save
(redundant — the function regenerates them from seed + depth).

## R5 — Descent runtime: a meta-instance over 003 encounter instances

**Decision**: A `DescentInstance` is a new runtime entity in a `delve/` engine module that
owns the run: seed, party, depth, banked base haul, staked venture pool, and a state
machine `descending → at-landing → descending … → ended(withdrawn | wiped | abandoned)`.
Each floor's combat runs as a standard 003 `EncounterInstance` (1 s encounter tick,
mechanic vocabulary, auto-AI takeover, no-ruin wipe handling); the descent advances on
floor end. Landings are the descent's own protocol: a ready-check in which the leader
selects withdraw or descend with the pool value and next floor's multiplier/difficulty
disclosed (FR-312), and any member may instead **opt out** — exiting with their personal
pool share paid in full while the remainder descend at recomputed party-size scaling. The
auto AI never selects descend: a landing with no live leader auto-withdraws after the
leadership grace (003 FR-224 transfer first; if no live member remains, auto-withdraw).
Mid-floor abandonment forfeits the abandoner's unbanked share. Delves are live sessions:
idle accrual suspends inside and resumes after (003 R1, FR-205).

**Rationale**: Reusing the encounter runtime keeps every 003 invariant (windows ≥ 4 s,
PvE-only vocabulary, deterministic resolution, no-ruin on wipe) without re-implementation;
the descent layer adds only what is genuinely new — floors, landings, and the stake. The
two-host rule (003 R3) carries over: V1 hosts solo descents in-process, V2 hosts party
descents in server rooms, same reducer.

**Alternatives considered**: modeling a whole descent as one long encounter (landings are
not combat; ready-check/opt-out have no mechanic encoding, and unbounded phases break the
EncounterDef shape); a separate delve combat engine (duplicates the 003 runtime — rejected
outright); leader-only exit with majority votes (spec clarification chose individual
opt-out at the ready-check).

## R6 — Venture pool: per-member share accounting, banked vs staked streams

**Decision**: Reward flow is two streams with different custody (FR-313). **Base haul**
(XP, mastery, standard loot from kills) resolves through the normal 003 reward path the
moment it drops — banked, owned, never part of the stake. The **venture bonus pool** is
descent-local state: per cleared floor, the engine accrues each member a *personal share*
(delve-exclusive materials and gear-roll entitlements from the floor's authored bonus
table, scaled by the depth multiplier), drawn from per-member RNG sub-streams (003 R7) so
shares are independent and replayable. The pool is therefore a list of per-member ledgers,
not a common pot to divide: withdraw pays every member their ledger via personal rolls;
individual opt-out pays exactly that member's ledger; a wipe forfeits exactly the unbanked
ledgers; backfilled members accrue only from floors they were present for (003 presence
list, FR-312). Pool contents are entitlements until paid — never owned property — which is
what makes the forfeit no-ruin-clean (FR-204 binding, SC-306).

**Rationale**: Per-member ledgers make every spec rule a one-line operation (opt-out,
backfill proration, wipe forfeiture, "a member's stake is never risked by another's
choice") and keep loot independence (003 R7). Entitlement-not-property is the structural
encoding of the spec's extraction redesign: nothing owned is ever at risk by construction,
not by policy.

**Alternatives considered**: a common pot split at payout (opt-out and backfill proration
become contested division rules; one member's roll perturbs another's); banking the pool
item-by-item with a repossession on wipe (repossessing owned items is precisely the
extraction mechanic the spec permanently excludes); coin-denominated pool paid as currency
(loses the materials/gear identity the delve economy needs, FR-316).

## R7 — Weekly expedition: deterministic seed function + recognition leaderboard

**Decision**: The weekly shared seed is a pure function
`weeklySeed(worldSeed, siteId, isoWeek)` — same shape as 003's affliction rotation (003
R8). All parties entering a site's expedition mode that week get descents assembled from
that seed; the regular random-seed mode runs alongside. Attempts are unlimited; the
engine keeps a per-character best depth per site per week and posts it to a per-site
leaderboard that is recognition-only (titles/flair — no material rewards), stored as
runtime `LeaderboardEntry` rows like 003's affliction boards. Ties share rank. Week
boundaries align with the affliction rotation week. Personal-best depth per site
(all-time, any mode) is a separate per-character record (FR-314).

**Rationale**: A pure seed function needs no schedule state, survives restarts, and is
testable for any week; reusing 003's leaderboard policy and storage keeps "recognition
only" a single consistent rule across the game.

**Alternatives considered**: a stored weekly seed drawn at rotation time (mutable schedule
state for no player-visible gain); limiting weekly attempts (spec clarification chose
unlimited — best-of posts); material leaderboard rewards (contradicts 003's settled
leaderboard policy and FR-315).

## R8 — Depth scaling: authored curve expressions, evaluated by the engine

**Decision**: Enemy strength, the bonus multiplier, and party-size scaling are authored
**curve definitions** in content (parameterized expressions: e.g. compounding rate per
floor, breakpoints, caps), evaluated by pure engine functions of `(depth, partySize)`.
Party-size scaling holds within disclosed bounds up to an authored depth band; beyond it,
scaling diminishes on its own authored curve and the client shows the honest
"assumes a full party" warning (FR-311) — entry is never blocked. All curves are
player-visible data surfaced at the site entrance (FR-312's disclosure) and in the landing
sheet (next floor's multiplier and difficulty). The reward-side supply lever (003 reserve
policy) is an authored, disclosed cap config on the exclusive-material/bonus portion only
— present in content from day one, inactive at launch.

**Rationale**: Curves-as-content is the constitution's authoring seam applied to tuning
(every count/curve/limit is content-tunable per the spec's assumptions); pure evaluation
keeps determinism and lets SC-305/306 audits sweep depth ranges in unit tests.

**Alternatives considered**: hard-coded scaling formulas (violates Principle IV and the
content-tunable assumption); per-floor authored difficulty tables (finite tables contradict
unbounded depth — expressions are total over depth).

## R9 — Compendium: content-derived catalog + per-character ownership overlay

**Decision**: The relic compendium is a query (`GetRelicCompendium`) joining authored
`RelicDef`s (all of them, always — owned or not) with the character's ownership and grant
state. Per relic it returns: name, tier, signature modifier in full, equip-limit category,
disclosed source, awakening track overview, duplicate compensation, and ownership/awakening
status — with multiplayer-only sources carrying the V1 honest label (003 FR-262 pattern,
`ONLINE_VERSION_ONLY` labeling reused). It is local-immediate (Principle IX): content is
on-device, ownership is local state in V1 and a cached snapshot in V2.

**Rationale**: Full disclosure is the 003 content rule ("nothing in these files is
secret") applied to relics; deriving the catalog from content means authoring a relic *is*
publishing it — the compendium can never drift from the data.

**Alternatives considered**: discovery-gated compendium entries (contradicts US1's
"sees every relic in the game" and the disclosure rule); a hand-authored compendium
document (drifts from RelicDefs; violates single source of truth).

## R10 — Equip limit: category rule in the 002 equip path

**Decision**: Each `RelicDef` declares its equip-limit category
(`weapon-focus | armor-trinket`); the limit (default one equipped per category,
content-tunable, FR-302) is validated in the 002 gear-equip command path, exactly where
slot compatibility already lives. A violating equip — direct, loadout import, or swap —
returns `RELIC_LIMIT_EXCEEDED` with the conflicting item identified, and the client offers
the guided one-tap swap (US1-AS4, edge case). A signature modifier whose school the
character respecs away from goes **inert** and is flagged in the loadout, per 002's
inert-rule pattern — never an error.

**Rationale**: The equip path is the single choke point through which every equip route
already flows, so loadout imports get the rule for free; an authored category on the def
keeps the limit content-tunable without code.

**Alternatives considered**: validating in the client (V2 trust violation; bypassable);
a separate relic-loadout subsystem (relics are gear — FR-303's whole stance; new subsystem
contradicts it).

## R11 — Dependency on spec 002 (still unplanned): consume spec-fixed shapes only

**Decision**: Carry 003 R11 forward unchanged, with 004's additional touchpoints. This
plan binds only to shapes fixed normatively by 002's spec (gear/equip FR-120–123, no-ruin
FR-130–132, control modes FR-180–184) and by 003's plan (item instances, modifier system,
encounter runtime, group/leadership rules). Touchpoints to re-verify when 002 is planned:
(a) the gear-equip command path R10 extends, (b) the item-instance representation R1/R2
extend (shared with 002 durability per 003 R9), (c) the inert-modifier flagging mechanism
R10 reuses. If 002's plan moves any of these, the change is localized to the named seams.

**Rationale**: Same de-risking as 003 — plannable now, mechanical re-verification later.

**Alternatives considered**: blocking on 002's plan (serializes work the specs already
fixed); duplicating 002 decisions here (scope violation).

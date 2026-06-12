# Research: Tradewright — Core Game

**Date**: 2026-06-11 | **Spec**: [spec.md](./spec.md)

Merged 2026-06-11 from the former specs 001/003/004 research documents (spec collapse; numbering per part preserved).

> **Note**: The combat core (former spec 002) never had a research phase; combat-engine
> research is an open work item for the combat milestone.

Resolves every open technical question from the plan's Technical Context. No NEEDS
CLARIFICATION markers remain.

## Part I — Economy Core (former 001)

### R1 — Platform: PWA web app (not native)

**Decision**: Phone-first Progressive Web App built with React 18 + Vite + TypeScript strict.

**Rationale**: UI-only game (lists, numbers, progress bars) needs no native rendering; PWA gives
one codebase, instant updates, no store gatekeeping, and Playwright can test the real product
directly. Installable to home screen for app-like feel.

**Alternatives considered**: React Native / Flutter (heavier toolchain, splits E2E story, no
benefit for a pure-UI game); native iOS/Android (two codebases, store friction); Capacitor wrap
of the PWA remains available later without rework if store presence is ever wanted.

### R2 — Monorepo: npm workspaces, four boundaries as packages

**Decision**: npm workspaces with `packages/contract`, `packages/engine`, `packages/content`,
`apps/client`, `apps/server` (V2). dependency-cruiser enforces the import direction in CI.

**Rationale**: Constitution Principles III/IV/V demand physical boundaries; separate packages
make violations impossible to merge (CI fails on a reversed dependency edge). npm workspaces
needs no extra tooling; Turborepo/Nx can be added later if build times demand it.

**Alternatives considered**: single src/ tree with lint rules only (boundaries erode under
pressure); separate repos (kills atomic contract changes; overkill pre-V2).

### R3 — GUI↔engine contract: async command/query/event protocol

**Decision**: One TypeScript interface in `@tradewright/contract`:
`send(command) → Promise<Ack>`, `query(q) → Promise<Result>`, `subscribe(handler)` for events.
All payloads JSON-serializable DTOs. Documented in [contracts/game-protocol.md](./contracts/game-protocol.md).

**Rationale**: Principle V requires serializable, transport-agnostic messages; Principle IX
requires fire-without-blocking commands with confirmations as events. This shape runs in-process
(V1) and over WebSocket (V2) unchanged — the "keep both alive" requirement falls out of the
contract design rather than being extra work.

**Alternatives considered**: direct method calls into engine objects (not serializable, V2
becomes a rewrite); REST request/response per interaction (forces request-blocked UX, violates
Principle IX); GraphQL (query flexibility not needed; events awkward).

### R4 — NPC market simulation: stock-pressure price drift

**Decision**: Per settlement × item, NPC traders maintain a virtual stock level with
content-authored production/consumption rates and an equilibrium point. NPC quote prices follow
`price = basePrice × pressure(stock/equilibrium)` where pressure is a bounded curve (clamped,
e.g., 0.25×–4×). NPC traders place/refresh a band of buy and sell orders around their quote on
the real order book each market tick. Player trades change stock (buying depletes → price rises;
selling adds → price falls), so prices drift with actual supply/demand. NPC profiles (rates,
equilibria, price bounds, order band width) are authored content per settlement.

**Rationale**: User requirement is "NPC-simulated market prices that drift with supply/demand" —
a random walk fails the requirement (no causality), and full agent-based economics is untestable
and untunable. Stock-pressure is the idle/tycoon genre standard: deterministic, author-tunable,
and it makes arbitrage genuinely playable (buy pressure in town A raises A's price toward B's).
Because NPCs trade on the same order book players use, V2 can keep them as liquidity bots with
zero engine changes.

**Alternatives considered**: random-walk prices (no supply/demand causality — rejected against
explicit requirement); pure player-driven from day one (V1 would be a dead market — rejected);
double-auction agent simulation (interesting, untunable, overkill).

### R5 — Offline progression: deterministic coarse-tick fast-forward

**Decision**: The engine advances via fixed ticks (60 s game ticks; market/NPC updates on a
slower cadence, e.g., every 5 ticks). Online, ticks fire on schedule; on app open after absence,
the engine replays elapsed ticks (capped at 24 h = 1 440 ticks) in a tight loop and emits one
summary. Within a tick, activity actions are computed in closed form (actions = elapsed ÷
duration); ticks exist so that cross-system events (storage fills → activity halts; caravan
arrives; order expires; NPC price moves) interleave in the right order.

**Rationale**: SC-005 demands offline ≡ online to the unit — a single code path (the tick) is the
only reliable way. 1 440 ticks of arithmetic completes well under the 3 s budget (SC-002).
Closed-form-only (no ticks) cannot order the halt/arrival/expiry interactions correctly.

**Alternatives considered**: pure closed-form math per system (fast but event-ordering bugs are
guaranteed); 1 s ticks (86 400 replays — needless 60× cost for an idle game where nothing
sub-minute matters offline).

### R6 — Determinism: injected clock + seeded RNG in state

**Decision**: The engine never reads `Date.now()` or `Math.random()`. A `Clock` is injected by
the host (real time in production, controlled time in tests); a seeded PRNG (xoshiro/PCG class)
lives inside the save state and advances with consumption (caravan risk rolls, NPC jitter).

**Rationale**: Determinism is load-bearing three times over: offline catch-up equals online play
(SC-005), idle timing is unit-testable without waiting (Principle I), and V1/V2 behavioral parity
is provable. Seed-in-state also prevents save-scumming risk rolls in V1.

**Alternatives considered**: real clocks + tolerance-based tests (flaky, violates the Playwright
determinism rule in the constitution); RNG outside state (reload-reroll exploit).

### R7 — V1 persistence: IndexedDB with versioned, migratable saves

**Decision**: Save = one versioned JSON document (schema-validated with Zod on load) in
IndexedDB via the `idb` wrapper. Autosave on meaningful mutations, debounced; explicit save on
tab hide. Each save carries `formatVersion`; loaders migrate old versions forward.

**Rationale**: Saves outlive code releases — versioning from day one avoids the classic idle-game
corrupt-save disaster. IndexedDB has the capacity localStorage lacks; Zod validation catches
corruption early. The serialized world state doubles as the V2 DB row shape, easing migration.

**Alternatives considered**: localStorage (5 MB ceiling, synchronous jank); OPFS/SQLite-wasm
(power without need at V1 data sizes).

### R8 — V1 time integrity: best-effort, honest about limits (FR-017 deviation)

**Decision**: V1 stores `lastSeenWallClock` and `lastMonotonicMark` in the save. On load: negative
elapsed time clamps to zero (clock set backwards grants nothing); forward jumps are accepted up
to the 24 h offline cap (which bounds the cheat value of clock-forwarding); when online,
a network time probe (HTTP Date header) sanity-checks local time and flags drift. Full FR-017
enforcement is V2's server clock.

**Rationale**: A device-only game cannot cryptographically trust device time; the offline cap
already bounds the exploit to "what honest absence would earn anyway." In solo mode the only
victim of cheating is the cheater. V2's authoritative server closes it completely. This is the
plan's single spec deviation and is recorded in plan.md's Constitution Check.

**Alternatives considered**: mandatory online time check (breaks offline play — unacceptable for
an idle game); trusting device clock blindly (negative-elapsed corruption, trivial cheating).

### R9 — Testing stack: Vitest + Playwright, phone viewport, time control

**Decision**: Vitest for `engine`/`content`/`contract`/adapters (fast, TS-native, workspace
aware). Playwright for client E2E at 390×844 (iPhone-class) viewport as the default project;
flows drive the real V1 build with `LocalTransport`. E2E controls game time via a test-only
clock hook exposed by the host (never shipped in production builds), so "wait 2 hours" is
instant and deterministic — no sleeps, satisfying the constitution's flakiness rules. V2 adds a
server-mode Playwright project running the same flow specs against a spun-up server.

**Rationale**: Constitution Principles I/II fix the frameworks (unit + Playwright, CI + local
parity); the injected clock (R6) is what makes an idle game E2E-testable at all. Reusing the same
flow specs against both transports turns "keep both versions alive" into a checkbox in CI.

**Alternatives considered**: Jest (slower, worse ESM/TS ergonomics than Vitest); Cypress
(weaker multi-tab/network control, Playwright mandated by constitution anyway).

### R10 — CI: single GitHub Actions workflow mirroring local commands

**Decision**: `.github/workflows/ci.yml` with jobs: **check** (typecheck + ESLint +
dependency-cruiser boundary check), **unit** (`npm test` — engine/content/contract suites),
**e2e** (`npm run test:e2e` after `npx playwright install --with-deps chromium`), **build**
(client production build + content validation). Every job invokes the exact script a developer
runs locally. Required on every PR and push to master.

**Rationale**: Principle II verbatim. Boundary check in CI is constitution Gate 3's mechanical
enforcement.

**Alternatives considered**: separate workflows per package (more YAML, no benefit at this size);
merge-queue/nightly-only E2E (violates Principle II's every-PR gate).

### R11 — V2 server shape (architecture-level; detail deferred to M2)

**Decision**: Node 22 + Fastify, WebSocket (`ws`) carrying the same contract messages,
PostgreSQL for world + account state, the same `@tradewright/engine` running authoritatively
(world tick on the server, per-settlement market processing). Client's `RemoteTransport`
implements optimistic apply + server reconciliation per Principle IX. Accounts: email/password +
session tokens at M2 (standard, replaceable).

**Rationale**: Same language end-to-end keeps the single-engine guarantee (the entire point of
the architecture). Fastify/ws/Postgres are boring, proven choices. Only the architecture is
fixed now — capacity design (sharding by settlement, interest management) is researched in M2
when SC-008 load validation happens; nothing in V1 constrains it because the contract is
transport-agnostic.

**Alternatives considered**: different server language (breaks engine sharing — rejected
outright); Firebase/managed BaaS (order-book matching and ticked simulation don't fit;
vendor lock); Colyseus (room model fits sessions, but brings its own protocol — our contract
already is the protocol).

### R12 — Inspiration compliance: structure-only porting

**Decision**: Recipe-tree shapes, refining input:output ratio patterns, XP curve shapes, and
tier-gating structure follow New World's publicly documented trade-skill conventions; idle
pacing (actions/hour bands, check-in cadence) follows Ironwood/Melvor conventions. A content
authoring guideline in `packages/content/README.md` requires: every name, item, settlement,
and text string original; no copied numeric tables — curves are re-derived from our own pacing
targets (SC-006, SC-007 budgets).

**Rationale**: Spec FR-024 and the user's explicit "port the structure and math, never the IP."
Game mechanics are not copyrightable; expression (names, text, art, exact data tables) is.
Original numbers tuned to our own success criteria are both safer and better-balanced for an
idle game with different session patterns than an MMO.

**Audit addendum (2026-06-11)**: New World: Aeternum ended content development in October
2025, was delisted on 2026-01-15, and its servers shut down on 2027-01-31. Two consequences:
(1) the "publicly documented" systems this research cites will become unverifiable — the key
references (trade-skill structures; trading-post history including the 2021-11-18 market
globalization; the November 2021 deflation crisis; the entry-cap history) must be archived
into `docs/reference/` while sources still exist; (2) New World is a *closed case study* —
its post-launch reversals (market globalization, entry-cap oscillation, crafted gear-score
RNG removal in 2023) are design evidence to mine, not just a feature catalog. The denylist
in the content-schema contract extends beyond item/place names to the inspiration's
feature/system names (e.g., "Soul Trial", "Mutator", "Outpost Rush", "Azoth", "Aeternum")
after the audit found the former spec 003's original draft reusing "soul trials" as a format
name.

## Part II — Challenge & Group Layer (former 003)

Inherits the economy core's research (R1–R8 in Part I: PWA, monorepo, contract shape, NPC
markets, tick model, seeded RNG, save format, time integrity) without change.

### R1 — Live encounters: 1 s encounter tick nested in the 60 s world tick

**Decision**: Encounter instances run on their own fixed 1 s tick, driven by the same
injected clock and seeded RNG as the world simulation. While a character is inside an
instance, their world-side idle accrual is suspended (FR-205): the world tick simply sees
the character as `in-instance` and skips activity processing; on exit, idle time resumes
from the exit timestamp (no double-dip, no retroactive catch-up for instance time).
Encounter instances never fast-forward — they exist only in live sessions, so the offline
catch-up path (R5, Part I — economy) is untouched.

**Rationale**: Telegraph windows are seconds-scale (FR-201); the 60 s world tick cannot
express them, and speeding the world tick up globally would bloat offline catch-up 60×.
Two fixed cadences with one clock keeps both deterministic and unit-testable. "Live
sessions only" (FR-205) removes the hardest problem — instances never need offline replay.

**Alternatives considered**: variable-rate single tick (breaks the economy core's
closed-form offline catch-up); event-driven continuous time inside encounters (harder to
reproduce and test than a fixed tick; tick granularity of 1 s is invisible under ≥ 4 s
windows); running encounters on the 60 s tick (cannot express response windows — rejected
against FR-201).

### R2 — Mechanic vocabulary: declarative encounter scripts, interpreted by the engine

**Decision**: Encounters are authored as declarative scripts in content JSON: a list of
**phases** (entry conditions: boss-health %, timer), each with scheduled **mechanics**.
A mechanic is one of a closed vocabulary of kinds — `telegraph` (windowed attack with
authored answer set), `add-wave`, `enrage`, `aura`, `surge` (invasion wave pressure) —
with every parameter (window seconds, answers, per-answer outcomes, cooperative
requirement N-of-party, partial-answer consequences) as data. Answers reference the
combat-core action surface: slotted abilities, stances, provisions, plus format verbs
(brace, station duty, repair supply). The engine is a pure interpreter; adding a boss
never touches code.

**Rationale**: Principle IV demands it, and the spec already speaks this language
(FR-201–202: "defined in authored content"). A closed kind-vocabulary keeps the
interpreter testable and makes the PvE-only audit (SC-208) a schema property: no mechanic
kind can target a player as a damage recipient of another player's action.

**Alternatives considered**: scripting language/Lua-style hooks (unbounded, untestable,
violates the authoring seam — authors would be writing code); hard-coded boss classes
(every boss a code change — rejected outright against Principle IV).

### R3 — Instance hosting: same engine module, two hosts

**Decision**: `encounter/` exposes an instance runtime with a pure reducer shape:
`(instanceState, contentDef, tick | playerInput) → instanceState + events`. V1 hosts one
instance in-process inside `LocalGameHost` (mettle trials — single participant). V2 hosts
instances as server rooms: the room owns the authoritative state, fans events out to
member sockets, and accepts member inputs. Group-format instances (dungeon, raid, world
boss, invasion) are V2-only at runtime but fully unit-tested in V1 CI by driving the same
reducer with scripted multi-player input streams.

**Rationale**: Principle V's architecture test, applied literally. The reducer shape means
"multiplayer" is a hosting concern, not an engine concern — exactly how the economy core
kept markets identical across NPC/real players.

**Alternatives considered**: separate V2-only encounter service (duplicates logic, breaks
parity testing); client-hosted P2P group instances (anti-cheat and authority nightmare;
V2 server already exists in the economy core plan).

### R4 — Active-mode answers under latency: optimistic with windowed reconciliation

**Decision**: Interaction classification (Principle IX) for the new surfaces:

| Interaction | Class |
|---|---|
| Browsing journals, boards, ladders, rosters | local-immediate |
| Creating/joining listings, signups, slotting a station | optimistic-with-reconciliation |
| Telegraph answers, ability taps, stance switches in active mode | optimistic-with-reconciliation (windowed) |
| Loot rolls, scores, run completion, invasion outcomes | server-confirmed-with-pending-state |

For windowed answers: the client renders the countdown locally, applies the chosen answer
optimistically at tap time, and stamps the input with its client-window offset. The server
accepts any answer that arrives within the window plus a stated grace (default 1 s,
content-tunable); a rejected/late answer rolls back visibly with the reason ("answer
arrived after the window"). Windows are ≥ 4 s by authoring rule (schema-enforced minimum),
so normal mobile latency never decides outcomes — keeping "decision speed, not dexterity"
true even over the network.

**Rationale**: Principle IX forbids blocking; a boss fight where every tap waits on a
round-trip is the named failure mode. Window + grace converts latency tolerance into an
authored, disclosed game rule rather than a network accident.

**Alternatives considered**: client-authoritative answers (trivially cheatable in V2);
lockstep/server-tick-confirmed input (blocks the UI, violates Principle IX); shrinking
windows for "skill" (violates FR-201's no-dexterity rule).

### R5 — Groups, boards, backfill, leadership: engine-owned social state behind the contract

**Decision**: Parties, group-board listings, raid signups/waitlists, backfill offers, and
leadership are runtime entities in the `group/` engine module, mutated only by contract
commands. Leadership transfer is a deterministic rule (longest-present member after a
60 s grace; original leader reclaims on reconnect — FR-224), evaluated on the world tick,
not a UI behavior. In V1 these entities exist and are unit-tested, but the client labels
group formats "online version" (FR-262) and offers no live matchmaking.

**Rationale**: FR-220/224/231 are game rules with audit consequences (loot eligibility per
boss presence); rules live in the engine per Principle V. Keeping the entities real in V1
means V2 activation is hosting + UI enablement, not new logic.

**Alternatives considered**: board/parties as server-app-only features outside the engine
(splits rules across the seam; loot eligibility would live in two places); external
matchmaking tools (explicitly rejected by FR-220/SC-204).

### R6 — Mass participation (~50): one authoritative instance, contribution-bucketed

**Decision**: World bosses, eruption events, and invasions are single authoritative
instances (one room) with a participant set sized to the format cap (50 at launch).
Per-participant inputs are aggregated per encounter tick; the UI presents the fight
through aggregate surfaces (boss bar, wave pressure, station lanes) rather than 50 unit
frames. Participants beyond the cap attach in **overflow mode**: their contributions
accrue to their Contribution Record at full credit (FR-242) but they receive the
aggregate view only. Elite zones are the opposite scale: each engagement is its own
small instance keyed to exactly one party (FR-240), spawned on engage, discarded on end.

**Rationale**: 50 participants ticking at 1 s with discrete UI inputs is small data —
the hard problem is presentation and credit, not throughput (the economy core's V2
already targets 10 k concurrent players). Overflow-as-credit-only honors "never silently
uncredited" without unbounded room membership.

**Alternatives considered**: sharding bosses into parallel copies (splits the social
moment the format exists for); open-world shared mob state for elite zones (the spec
explicitly chose party isolation after clarification).

### R7 — Loot, scores, contribution: deterministic engine math, authored tables

**Decision**: Personal loot rolls draw from the instance's seeded RNG stream, one
sub-stream per member per boss (order-independent, replayable). Score brackets are
authored per format/level (time + penalty criteria → bracket → payout multiplier) and
computed by the engine at run end. The Contribution Record is an engine accumulator:
`w_damage·damage + w_sustain·(healing+mitigation) + w_objective·objectiveActions`, with
weights authored per format and normalized so the median build archetype earns
comparably (FR-264); the reward floor compares a participant's record to the disclosed
percentage of the median contributor (FR-242). All weights, tables, odds, and brackets
are content data, disclosed in-game.

**Rationale**: FR-106 extends naturally: identical run inputs → identical loot and
scores, which is also what makes SC-201/202/209 auditable in CI. Per-member sub-streams
prevent one player's roll from perturbing another's (loot disputes by RNG entanglement).

**Alternatives considered**: server-random loot (untestable, breaks V1/V2 parity);
damage-only contribution (rejected in spec clarification — sustain/control builds must
earn comparably).

### R8 — Weekly affliction rotation: deterministic schedule function

**Decision**: The active rotation is a pure function
`rotation(worldSeed, isoWeek) → {dungeonIds, afflictionSetIds, levels}` over authored
rotation pools. V2 evaluates it server-side; clients query it. Week boundaries use the
server clock (V2) — afflictions are multiplayer content, so V1 only displays the system in
its "online version" labeling. Qualification state (recorded clears per player per level)
is runtime state checked at entry (FR-223); ward/resist counter-mappings for the active
sets are published with the rotation (FR-272).

**Rationale**: A pure schedule function needs no cron state, survives restarts, is
trivially testable for any week, and lets content authors tune pools without touching the
scheduler. Publishing counters with the rotation is what creates the readable market
demand loop the spec wants.

**Alternatives considered**: manually curated weekly pushes (operational burden, single
point of failure); fully random weekly draw with stored state (adds mutable schedule
state for no player-visible benefit).

### R9 — Gear score, quality grade, modifiers: extension of the economy & combat core item model

**Decision**: Gear item instances (FR-120) gain: `gearScore` (number within the
tier's authored band; scales stat magnitude by a stated curve), `modifiers[]` (instances
of authored ModifierDefs), and a **derived** `qualityGrade` = f(modifier count) — never
stored, always computed (FR-270). Modifier acquisition (FR-271): dropped gear rolls
modifiers from slot-specific authored pools with disclosed odds (instance RNG); crafted
gear locks chosen modifiers by consuming craft-mod materials (recipes reference
challenge-exclusive materials), remaining slots rolled; a disclosed pool subset is
flagged drop-exclusive per format. Ward/resist modifiers carry a `counters` reference to
affliction modifier ids (FR-272). Item instances therefore become non-fungible where the
economy core's were fungible: storage/escrow/shipping gain an item-instance representation
for gear while stackable goods keep the economy core quantity model.

**Rationale**: Derived grade can never desynchronize from modifier count; pools-as-data
keep the authoring seam; the fungible/non-fungible split is the minimal change to the
economy core's model that supports rolled gear (and the combat core already needs
per-instance durability, so the instance representation is shared, not new).

**Alternatives considered**: stored grade field (redundant, can drift); fully fungible
gear (cannot represent rolls/durability — already impossible under the combat core);
modifier crafting via RNG-only (rejected in spec clarification — crafters must be able to
lock).

### R10 — Invasion threat: authored-rate accumulator over settlement activity

**Decision**: Each settlement carries a threat meter — an engine accumulator fed on the
world tick by authored weights over observable settlement activity (prosperity index,
trade volume, regional hunting kills). At the authored threshold, the engine schedules an
invasion at `now + noticeHours` (48 h default, content-tunable), posts it to the
warboard, and resets the meter. Defense outcome derives from aggregate roster performance
(R6 instance); failure applies authored, temporary facility degradations with two repair
paths: contribution (fast, rewarded via R7 records) and self-restore over an authored
multi-day window (FR-251).

**Rationale**: All rates and thresholds are content data (Principle IV) and the meter is
visible (spec clarification), so invasions read as consequences of player activity, not
random punishment. Reusing Contribution Records for repair keeps one credit system.

**Alternatives considered**: random invasion timers (rejected in spec clarification);
threat as hidden server state (violates the visibility decision and Explorable UX).

### R11 — Dependency on the combat core (unplanned): consume spec-fixed shapes only

**Decision**: The challenge layer's design binds only to structures the combat core's spec
fixes normatively: control modes and auto-AI takeover (FR-180–184), ability/tactics shape
(FR-160–169), gear slots/durability (FR-120–123), no-ruin (FR-130–132), drop-table economy
discipline (FR-140). Where the combat core's plan will make finer-grained decisions (exact
tactics condition encoding, combat stat formulae), the challenge layer treats them as
opaque: encounter answers reference abilities/stances by id and consume the combat core's
combat resolution as a function. Touchpoints to re-verify when the combat core is planned:
(a) the combat tick rate the combat core chooses for expeditions vs R1's 1 s encounter
tick, (b) the item-instance representation (R9 assumes it is shared with combat-core
durability), (c) the auto-AI interface (the challenge layer needs "AI plays generic
answer" hooks, FR-203).

**Rationale**: Keeps the challenge layer plannable now without pre-empting the combat
core's plan; the three named touchpoints make the re-verification mechanical instead of a
full re-read.

**Alternatives considered**: blocking challenge-layer planning on the combat core's plan
(serializes work the specs already de-risked); planning the combat core inside this plan
(scope violation — separate feature, separate lifecycle).

## Part III — Relics & Delves (former 004)

Inherits the economy core's research (Part I: PWA, monorepo, contract shape, tick model,
seeded RNG, save format) and the challenge layer's research (Part II: R1 encounter tick,
R2 mechanic vocabulary, R3 two-host instances, R4 windowed answers, R5 group state, R7
deterministic loot, R9 gear/modifier model) without change. Numbering below is local to
this part.

### R1 — Relic uniqueness: enforced at acquisition edges, not by binding

**Decision**: A relic is an ordinary `GearItemInstance` (R9, Part II — challenge) of a
`RelicDef`. There is no bound-item mechanism anywhere. The one-copy-per-character rule
(FR-303) is enforced at the only two places a relic can enter a character's possession:

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

**Rationale**: The clarified spec keeps relics inside the all-goods-trade norm (FR-123) —
binding would create a new item class the game otherwise never needs. Two edge
checks are auditable (SC-304) and leave every other system (storage, escrow, shipping,
pricing) untouched.

**Alternatives considered**: bound items (rejected by spec clarification); blocking the
*listing* of a relic the buyer owns (impossible — sellers list to a market, not a buyer);
allowing duplicates and blocking only dual-equip (violates FR-303's one-copy rule and
makes the compendium's owned state ambiguous).

### R2 — Awakening state: item state on the instance, deed progress per character

**Decision**: The relic's `GearItemInstance` carries its awakening state: which slots are
unsealed and which modifiers are locked (the signature modifier is fixed instance data,
never a slot). This state travels with the item through trade, escrow, and shipping
(FR-304). Deed progress toward an *incomplete* awakening step is a separate per-character
runtime record (`AwakeningProgress {characterId, relicDefId, stepIndex, deedCounters}`)
that does not transfer: a buyer of a half-awakened relic gets the unsealed slots and locked
modifiers, and starts the next step's deeds from zero.

Completing a step is a single atomic command: deed requirement satisfied + materials in
local storage → materials consumed, slot unsealed, step recorded on the item. Locking and
re-locking modifiers into unsealed slots reuses the challenge-layer craft-mod mechanism
(FR-271) verbatim — same materials, same disclosed costs, same engine path.

**Rationale**: Splitting durable item state from personal effort matches the spec's own
line ("unsealed slots and locked modifiers are permanent item state … deed progress … is
per character", FR-304) and keeps the trade path simple: the item is self-describing, no
cross-character state migrates. Reusing craft-mod locking means awakening adds zero new
modifier mechanics — only the unseal gate is new.

**Alternatives considered**: deed progress on the item (lets buyers inherit a stranger's
kill counters — incoherent and exploitable); a separate "relic state" entity keyed by item
id (needless indirection — the instance already serializes per R9, Part II — challenge);
awakening as crafting recipes (recipes produce items; awakening mutates one — wrong
primitive).

### R3 — Signature modifiers: flagged entries in the existing modifier vocabulary

**Decision**: `SignatureModifierDef` is a `GearModifierDef` (R9, Part II — challenge) with
`signatureOf: relicId` set. Schema and integrity tests enforce: a signature modifier
appears in no `ModifierPoolDef`, no craft-mod recipe, and exactly one relic; it is part of
the relic's authored definition, not a slot. Quality grade derives from filled modifier
count exactly as for all gear (FR-270), and the signature modifier counts toward it —
a dormant relic therefore already holds grade(1), and full awakening reaches the same
maximum grade as fully modified crafted gear. Signature effects use the same `EffectExpr`
vocabulary as all modifiers; build-defining behavior (transforming abilities, stances,
provisions, tactics interactions) is expression within that vocabulary, audited per relic
by SC-301, not a new effect system.

**Rationale**: One modifier system with a flag keeps the entire challenge-layer inspection,
counter, and grade machinery working on relics for free; pool/recipe exclusion enforced by
content tests makes "exists on no other item" (FR-301) a CI property rather than an
authoring promise.

**Alternatives considered**: a parallel signature-effect system (duplicates EffectExpr,
splits the audit surface); signature as a locked modifier in slot 0 (FR-305 forbids it
occupying a player-fillable slot — modeling it as fixed instance data is the direct
encoding); not counting the signature toward grade (would make a fully awakened relic cap
below crafted gear's grade scale, contradicting US2's "raising the quality grade to the
maximum").

### R4 — Procedural descents: pure assembly function over authored pools

**Decision**: Floor generation is a pure function
`assembleFloor(siteDef, seed, depth, partySize) → FloorPlan`, where a `FloorPlan` names an
authored `RoomDef` sequence, an encounter sequence drawn from the site's authored pools,
and the depth modifiers in force. The function draws from a deterministic per-descent RNG
sub-stream (the economy core's seeded-RNG discipline), so identical `(seed, party inputs)`
reproduce an identical descent (FR-310, FR-106) and distinct seeds diverge materially
(SC-307 is a property test over the function). Depth is unbounded (FR-314): the function
is total over all depths — pools remix with depth-indexed weights and the authored
difficulty and multiplier curves (R6) supply the practical limit; no floor is "the last".

Floors are generated lazily — floor *n+1* is assembled when the party descends — so an
unbounded descent never materializes unbounded data. Boss-grade floors occur at authored
intervals via pool weighting keyed to depth.

**Rationale**: Pure-function generation is the same move as the challenge layer's rotation
schedule (R8, Part II — challenge): no stored layout state, trivially testable for any
seed/depth in CI, and the authoring seam stays intact — rooms, encounters, and depth
modifiers are authored content (FR-024); only their assembly is systemic, exactly the
spec's out-of-scope line.

**Alternatives considered**: pre-generating N floors at entry (arbitrary cap contradicts
unbounded descents; wasted work on early withdrawals); roguelike grammar/graph generation
of room *content* (out of scope — assembly only); storing generated layouts in the save
(redundant — the function regenerates them from seed + depth).

### R5 — Descent runtime: a meta-instance over challenge-layer encounter instances

**Decision**: A `DescentInstance` is a new runtime entity in a `delve/` engine module that
owns the run: seed, party, depth, banked base haul, staked venture pool, and a state
machine `descending → at-landing → descending … → ended(withdrawn | wiped | abandoned)`.
Each floor's combat runs as a standard challenge-layer `EncounterInstance` (1 s encounter
tick, mechanic vocabulary, auto-AI takeover, no-ruin wipe handling); the descent advances
on floor end. Landings are the descent's own protocol: a ready-check in which the leader
selects withdraw or descend with the pool value and next floor's multiplier/difficulty
disclosed (FR-312), and any member may instead **opt out** — exiting with their personal
pool share paid in full while the remainder descend at recomputed party-size scaling. The
auto AI never selects descend: a landing with no live leader auto-withdraws after the
leadership grace (FR-224 transfer first; if no live member remains, auto-withdraw).
Mid-floor abandonment forfeits the abandoner's unbanked share. Delves are live sessions:
idle accrual suspends inside and resumes after (R1 — Part II, challenge; FR-205).

**Rationale**: Reusing the encounter runtime keeps every challenge-layer invariant
(windows ≥ 4 s, PvE-only vocabulary, deterministic resolution, no-ruin on wipe) without
re-implementation; the descent layer adds only what is genuinely new — floors, landings,
and the stake. The two-host rule (R3, Part II — challenge) carries over: V1 hosts solo
descents in-process, V2 hosts party descents in server rooms, same reducer.

**Alternatives considered**: modeling a whole descent as one long encounter (landings are
not combat; ready-check/opt-out have no mechanic encoding, and unbounded phases break the
EncounterDef shape); a separate delve combat engine (duplicates the challenge-layer
runtime — rejected outright); leader-only exit with majority votes (spec clarification
chose individual opt-out at the ready-check).

### R6 — Venture pool: per-member share accounting, banked vs staked streams

**Decision**: Reward flow is two streams with different custody (FR-313). **Base haul**
(XP, mastery, standard loot from kills) resolves through the normal challenge-layer reward
path the moment it drops — banked, owned, never part of the stake. The **venture bonus
pool** is descent-local state: per cleared floor, the engine accrues each member a
*personal share* (delve-exclusive materials and gear-roll entitlements from the floor's
authored bonus table, scaled by the depth multiplier), drawn from per-member RNG
sub-streams (R7, Part II — challenge) so shares are independent and replayable. The pool
is therefore a list of per-member ledgers, not a common pot to divide: withdraw pays every
member their ledger via personal rolls; individual opt-out pays exactly that member's
ledger; a wipe forfeits exactly the unbanked ledgers; backfilled members accrue only from
floors they were present for (challenge-layer presence list, FR-312). Pool contents are
entitlements until paid — never owned property — which is what makes the forfeit
no-ruin-clean (FR-204 binding, SC-306).

**Rationale**: Per-member ledgers make every spec rule a one-line operation (opt-out,
backfill proration, wipe forfeiture, "a member's stake is never risked by another's
choice") and keep loot independence (R7, Part II — challenge). Entitlement-not-property is
the structural encoding of the spec's extraction redesign: nothing owned is ever at risk
by construction, not by policy.

**Alternatives considered**: a common pot split at payout (opt-out and backfill proration
become contested division rules; one member's roll perturbs another's); banking the pool
item-by-item with a repossession on wipe (repossessing owned items is precisely the
extraction mechanic the spec permanently excludes); coin-denominated pool paid as currency
(loses the materials/gear identity the delve economy needs, FR-316).

### R7 — Weekly expedition: deterministic seed function + recognition leaderboard

**Decision**: The weekly shared seed is a pure function
`weeklySeed(worldSeed, siteId, isoWeek)` — same shape as the challenge layer's affliction
rotation (R8, Part II — challenge). All parties entering a site's expedition mode that
week get descents assembled from that seed; the regular random-seed mode runs alongside.
Attempts are unlimited; the engine keeps a per-character best depth per site per week and
posts it to a per-site leaderboard that is recognition-only (titles/flair — no material
rewards), stored as runtime `LeaderboardEntry` rows like the challenge layer's affliction
boards. Ties share rank. Week boundaries align with the affliction rotation week.
Personal-best depth per site (all-time, any mode) is a separate per-character record
(FR-314).

**Rationale**: A pure seed function needs no schedule state, survives restarts, and is
testable for any week; reusing the challenge layer's leaderboard policy and storage keeps
"recognition only" a single consistent rule across the game.

**Alternatives considered**: a stored weekly seed drawn at rotation time (mutable schedule
state for no player-visible gain); limiting weekly attempts (spec clarification chose
unlimited — best-of posts); material leaderboard rewards (contradicts the challenge
layer's settled leaderboard policy and FR-315).

### R8 — Depth scaling: authored curve expressions, evaluated by the engine

**Decision**: Enemy strength, the bonus multiplier, and party-size scaling are authored
**curve definitions** in content (parameterized expressions: e.g. compounding rate per
floor, breakpoints, caps), evaluated by pure engine functions of `(depth, partySize)`.
Party-size scaling holds within disclosed bounds up to an authored depth band; beyond it,
scaling diminishes on its own authored curve and the client shows the honest
"assumes a full party" warning (FR-311) — entry is never blocked. All curves are
player-visible data surfaced at the site entrance (FR-312's disclosure) and in the landing
sheet (next floor's multiplier and difficulty). The reward-side supply lever
(challenge-layer reserve policy) is an authored, disclosed cap config on the
exclusive-material/bonus portion only — present in content from day one, inactive at
launch.

**Rationale**: Curves-as-content is the constitution's authoring seam applied to tuning
(every count/curve/limit is content-tunable per the spec's assumptions); pure evaluation
keeps determinism and lets SC-305/306 audits sweep depth ranges in unit tests.

**Alternatives considered**: hard-coded scaling formulas (violates Principle IV and the
content-tunable assumption); per-floor authored difficulty tables (finite tables contradict
unbounded depth — expressions are total over depth).

### R9 — Compendium: content-derived catalog + per-character ownership overlay

**Decision**: The relic compendium is a query (`GetRelicCompendium`) joining authored
`RelicDef`s (all of them, always — owned or not) with the character's ownership and grant
state. Per relic it returns: name, tier, signature modifier in full, equip-limit category,
disclosed source, awakening track overview, duplicate compensation, and ownership/awakening
status — with multiplayer-only sources carrying the V1 honest label (FR-262 pattern,
`ONLINE_VERSION_ONLY` labeling reused). It is local-immediate (Principle IX): content is
on-device, ownership is local state in V1 and a cached snapshot in V2.

**Rationale**: Full disclosure is the challenge-layer content rule ("nothing in these
files is secret") applied to relics; deriving the catalog from content means authoring a
relic *is* publishing it — the compendium can never drift from the data.

**Alternatives considered**: discovery-gated compendium entries (contradicts US1's
"sees every relic in the game" and the disclosure rule); a hand-authored compendium
document (drifts from RelicDefs; violates single source of truth).

### R10 — Equip limit: category rule in the combat-core equip path

**Decision**: Each `RelicDef` declares its equip-limit category
(`weapon-focus | armor-trinket`); the limit (default one equipped per category,
content-tunable, FR-302) is validated in the combat-core gear-equip command path, exactly
where slot compatibility already lives. A violating equip — direct, loadout import, or
swap — returns `RELIC_LIMIT_EXCEEDED` with the conflicting item identified, and the client
offers the guided one-tap swap (US1-AS4, edge case). A signature modifier whose school the
character respecs away from goes **inert** and is flagged in the loadout, per the combat
core's inert-rule pattern — never an error.

**Rationale**: The equip path is the single choke point through which every equip route
already flows, so loadout imports get the rule for free; an authored category on the def
keeps the limit content-tunable without code.

**Alternatives considered**: validating in the client (V2 trust violation; bypassable);
a separate relic-loadout subsystem (relics are gear — FR-303's whole stance; new subsystem
contradicts it).

### R11 — Dependency on the combat core (still unplanned): consume spec-fixed shapes only

**Decision**: Carry R11 (Part II, challenge) forward unchanged, with the relic & delve
layer's additional touchpoints. This plan binds only to shapes fixed normatively by the
combat core's spec (gear/equip FR-120–123, no-ruin FR-130–132, control modes FR-180–184)
and by the challenge layer's plan (item instances, modifier system, encounter runtime,
group/leadership rules). Touchpoints to re-verify when the combat core is planned:
(a) the gear-equip command path R10 extends, (b) the item-instance representation R1/R2
extend (shared with combat-core durability per R9, Part II — challenge), (c) the
inert-modifier flagging mechanism R10 reuses. If the combat core's plan moves any of
these, the change is localized to the named seams.

**Rationale**: Same de-risking as the challenge layer — plannable now, mechanical
re-verification later.

**Alternatives considered**: blocking on the combat core's plan (serializes work the specs
already fixed); duplicating combat-core decisions here (scope violation).

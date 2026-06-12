# Research: Tradewright — Core Game

**Date**: 2026-06-11 (Parts I–III) / 2026-06-12 (Part IV + Part I addenda R13–R15) |
**Spec**: [spec.md](./spec.md)

Merged 2026-06-11 from the former specs 001/003/004 research documents (spec collapse;
numbering per part preserved). Part IV (combat core) was authored 2026-06-12 once the
clarification rounds resolved the stat vocabulary (FR-107), multi-combatant semantics
(FR-108), and combat onboarding (FR-113) — parts are ordered by authoring date, so combat
sits last here while it is Part II in data-model.md and the contracts; cross-references use
the `(economy) / (challenge) / (relic/delve) / (combat)` qualifiers, which are stable.

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

### R11 — V2 server shape (architecture-level; detail deferred to M5, the V2 milestone)

**Decision**: Node 22 + Fastify, WebSocket (`ws`) carrying the same contract messages,
PostgreSQL for world + account state, the same `@tradewright/engine` running authoritatively
(world tick on the server, per-settlement market processing). Client's `RemoteTransport`
implements optimistic apply + server reconciliation per Principle IX. Accounts: email/password +
session tokens at M5 (standard, replaceable).

**Rationale**: Same language end-to-end keeps the single-engine guarantee (the entire point of
the architecture). Fastify/ws/Postgres are boring, proven choices. Only the architecture is
fixed now — capacity design (sharding by settlement, interest management) is researched in M5
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

### R13 — Coin faucet: NPC purchases as floor orders + demand sweeps (extends R4)

**Decision**: The FR-054 faucet runs through two engine mechanisms on each settlement's
real order book, both drawing from authored per-settlement coin budgets per market tick
period: (a) **standing floor buy orders** — the NPC principal maintains buy orders at
authored floor prices for a curated, regionally-varied raw-goods list (refreshed each
market tick up to the period budget); (b) **demand sweeps** — on an authored cadence, the
NPC principal market-buys the cheapest listed sell orders across all goods until the sweep
budget is spent. Both paths settle as ordinary Trades (audit log, price history); coin
entering via either is the game's only faucet, and aggregate faucet/sink flow counters per
settlement per period are emitted as economy telemetry (FR-053). In V1 the R4 simulation
additionally places NPC sell orders; in V2 NPC sell-side liquidity is a config level while
the faucet mechanisms stay on.

**Rationale**: Reusing the order book means the faucet needs no new economic machinery —
floors are visible orders players can read (guaranteed baseline liquidity, the answer to
the inspiration's dead-localized-markets failure), and sweeps reward whoever prices lowest
across all goods. Budgets-as-content make monetary policy tunable without code, and
telemetry makes the 2021-deflation failure case detectable (FR-053).

**Alternatives considered**: vendor-style instant "sell to NPC" button outside the order
book (bypasses the market, hides the faucet from price discovery — rejected against
FR-054's on-book requirement); enemies dropping coin (rejected in clarification —
NW-faithful, FR-053); unlimited floor budgets (unbounded coin printing; budget exhaustion
is the disclosed, tunable limit).

### R14 — V2 offline client: classification-derived queue-or-block (FR-063)

**Decision**: The V2 client's offline behavior derives mechanically from the contract's
Principle IX interaction classification (R3): reads serve the last-known snapshot
read-only with an offline indicator and "as of" timestamp; commands classified
optimistic-with-reconciliation whose subject is the player's own state (activity
assignment, tactics edits, loadout changes) are applied locally, persisted to a FIFO
mutation queue, and replayed on reconnect — each taking effect at server receipt per
authoritative time (FR-017), with rejections rolled back visibly via the existing
`StateInvalidated` path; commands touching shared multiplayer state (orders/trades, party
and board actions, entering live instances) are rejected offline with `OFFLINE_BLOCKED`
and an honest explanation. The queue survives app restarts (persisted beside the snapshot
cache) and is bounded; overflow degrades to blocking with explanation, never silent drop.

**Rationale**: The contract already classifies every interaction; deriving offline policy
from the same classification means no second list to maintain and no per-feature offline
design. Replay-at-receipt keeps the server's time authority intact, and visible rollback
is the Principle IX rule already shipped for online optimism. V1 binds in-process and is
untouched (FR-003).

**Alternatives considered**: full offline blocking (fails FR-063 and Principle IX's
responsiveness bar for own-state actions); CRDT/merge reconciliation (massive machinery
for a game where the server is simply authoritative — rejected); queueing market orders
too (stale-price execution surprises the player with real coin; spec explicitly blocks
shared-state mutations offline).

### R15 — Push notifications: opt-in category scheduler, two delivery backends (FR-064)

**Decision**: One engine-side notification model — authored category definitions (launch
set: caravan arrival, offline cap reached, committed raid/invasion approaching, order
filled/expired) with per-player, per-category opt-in state, off by default. The engine
computes upcoming notifiable moments from known timers (deterministic — caravan ETAs,
cap time, scheduled starts); delivery is a host adapter: V1 schedules device-local
notifications via the PWA service worker + Notification API (honest capability note:
requires installed-PWA + permission on iOS ≥ 16.4; the in-app surfaces remain the
baseline), V2 sends Web Push from the server scheduler. Content is timer-factual only;
no promotional channel exists anywhere in the model, so none can be turned on later
without a schema change (the FR-064 prohibition made structural). All other "notified"
language in the spec remains in-app surfaces.

**Rationale**: Computing moments engine-side from authoritative timers keeps both
versions consistent and testable (the schedule is a pure function of state); the
adapter split is the established two-host pattern (R3/R11). Categories-as-content keeps
the launch set tunable (FR-064).

**Alternatives considered**: server-only push with V1 excluded (FR-064 covers both
versions; V1 device scheduling is feasible and honest); third-party push SaaS (vendor
lock for four timer categories; Web Push is sufficient); engagement/retention
notifications (prohibited outright by FR-064 — excluded from the model, not just the
launch set).

### R16 — Joint economy model: scripted-actor simulation with operational SC-006/007 definitions

**Decision**: The joint economy model (tasks T093) is a deterministic simulation script over
launch content with an explicitly recorded behavior model. Population: a fixed count of
scripted actors per settlement, split into two archetypes — **producers** (gather → refine →
craft locally, picking the highest-expected-margin recipe available to them each decision
tick, selling on the local order book) and **haulers** (scan all routes each decision tick,
dispatch caravans on the highest post-tax, post-risk expected profit, buying low and selling
high). Both archetypes are greedy-rational and act independently — no coordination.
**Healthy world** means: all launch settlements and routes active, NPC faucet budgets running
at authored values (FR-053/054), and the simulation past a recorded warm-up period so every
market carries player-supplied stock and prices have moved off their seeded initial values.
**Equivalent investment** means: equal starting coin, no starting stock or gear, and an equal
per-day decision budget (same decision-tick cadence for both archetypes). **Income** is net
worth gain (coin plus inventory valued at current local sell prices) per simulated day over
the measurement window. Green/red is deterministic: across the recorded seed list, (a) every
24-hour window of the measurement window offers ≥ 1 route with positive post-tax, post-risk
expected profit, and (b) median hauler income is within ±50% of median producer income
(SC-007); SC-006's ≤ 60% self-sufficiency is checked statically against the same content
snapshot. All parameters — actor counts, warm-up length, measurement-window length, seed
list, decision-tick cadence, starting coin — live as named constants in
`packages/content/tests/economy-model.test.ts`; changing one is a reviewed content-tuning
decision, not test noise.

**Rationale**: SC-007 is "verified against a healthy world", but the spec leaves the world
undefined (Economy Budget, "open modeling debt"). Recording the behavior model and parameters
in one place makes T093's criterion deterministic — the same content snapshot either passes
or fails with no judgment call — and makes a red run diagnosable (which archetype starved,
which route died). Greedy-rational actors are the right floor: if parity fails even under
optimal simple play, real players will feel the gap. Simulation (not closed form) is required
because the price-drift feedback (R4/R13) and caravan risk variance are dynamic.

**Alternatives considered**: organic playtest data (not reproducible, not CI-able); a
closed-form spreadsheet model (cannot capture stock-pressure price feedback or risk
variance); adaptive/learning agents (non-deterministic and over-engineered for a tuning
gate); burying the parameters in test setup without naming them (re-opens the ambiguity this
entry exists to close).

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

### R11 — Dependency on the combat core (unplanned at authoring; resolved 2026-06-12): consume spec-fixed shapes only

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

**Resolution (2026-06-12)**: the combat design pass (Part IV) landed; all three
touchpoints verified — (a) tick rate: expeditions resolve on the same 1 s combat tick via
one shared resolver (R1, combat), no rate mismatch exists; (b) item instances:
`GearItemInstance` is owned by the combat core with exactly the shape R9 assumed
(R6, combat); (c) auto-AI interface: the tactics engine is the AI, answering telegraphs
with each mechanic's authored generic answer (R4, combat).

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

### R11 — Dependency on the combat core (unplanned at authoring; resolved 2026-06-12): consume spec-fixed shapes only, addendum

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

**Resolution (2026-06-12)**: the combat design pass (Part IV below) landed; all named
touchpoints verified — see the resolution note on R11 (challenge) above. (a) gear-equip
command path: `EquipGear` (protocol Part II) is the single choke point R10 extends;
(b) item-instance representation: `GearItemInstance` is owned by the combat core exactly
as R1/R2 assumed (R6, combat); (c) inert-modifier flagging: the combat core's tactics/
loadout inert-rule pattern (FR-173) is a loadout-state flag R10 reuses unchanged.

## Part IV — Combat Core (designed 2026-06-12)

Authored after the 2026-06-11/12 clarification rounds resolved the stat vocabulary
(FR-107), the threat model (FR-108), and combat onboarding (FR-113). Inherits the economy
core's research (Part I: tick model, seeded RNG, injected clock, save format, contract
shape) and supplies the shapes Parts II–III consumed as spec-fixed (their R11 touchpoints
are now verified, see the resolution notes above).

### R1 — One combat resolver: shared 1 s combat tick, expeditions nested in the world tick

**Decision**: A single deterministic combat resolver — a pure reducer
`(combatState, defs, tick | input) → combatState + events` — resolves all combat on a
fixed 1 s combat tick: expeditions (auto mode, FR-101) and challenge-layer encounter
instances (which layer phases/mechanics on top, R1/R3 (challenge)) run the same core.
Online, an active expedition advances 60 combat ticks per 60 s world tick; offline,
catch-up replays expedition combat ticks in a tight loop inside the R5 (economy)
fast-forward, bounded by the 24 h cap, provision exhaustion, or retreat. Budget check:
24 h = 86 400 ticks of small-integer arithmetic — well inside the 3 s catch-up budget
(SC-002); a CI benchmark guards it, with closed-form fight-cycle detection (identical
deterministic fights repeat) held in reserve if content scale ever threatens the budget.

**Rationale**: One resolver is what makes offline ≡ online combat (FR-105/SC-103) and
expedition-vs-encounter consistency structural rather than tested-for. 1 s matches the
encounter tick the challenge layer already fixed — resolving its touchpoint (a) — and is
fine-grained enough for cooldowns measured in seconds while remaining cheap to replay.

**Alternatives considered**: closed-form expedition outcomes (cannot interleave provision
thresholds, durability breaks, tactics triggers, and threat retargeting in order —
exactly the event-ordering trap R5 (economy) rejected); a 60 s combat tick (cannot
express cooldowns or tactics thresholds; encounter tick already settled on 1 s); separate
expedition and encounter resolvers (parity between standard and challenge combat becomes
a test burden instead of an identity).

### R2 — Stat pipeline: five attributes, authored derivation curves (FR-107)

**Decision**: Content defines five `AttributeDef`s (original-named analogs of
STR/DEX/INT/FOC/CON). A character's attribute totals come from gear grants (FR-120) plus
authored base values. Derived combat stats are authored curve expressions (the CurveExpr
discipline, R8 (relic/delve)): health = f(CON-analog); ability/basic-attack magnitude =
abilityBase × attributeScaling(designated attributes) × masteryScaling(school mastery);
mitigation = armorCurve(physical | elemental armor rating). Each school designates one or
two scaling attributes in its def. The resolver evaluates curves; it hard-codes none.

**Rationale**: FR-107 fixes the structure and demands names, assignments, and curves be
authored content — this is Principle IV applied to combat math, and it makes SC-107's
"builds matter" audit a content-tuning loop, not an engine change.

**Alternatives considered**: hard-coded formulas (violates FR-107's authored-content
clause); free-form per-ability script formulas (authors writing code — rejected per the
R2 (challenge) discipline); more/fewer attributes (spec fixed five, NW-analog).

### R3 — Targeting: per-enemy threat tables, deterministic (FR-108)

**Decision**: Each enemy in a fight keeps a per-combatant threat accumulator:
`threat += damageDealt + sustainFactor × healingDone + tauntAmplifiers` (factors and
amplifier magnitudes authored — gear perks and abilities reference them as EffectExprs).
At each combat tick the enemy targets the highest-threat combatant; ties break by stable
join order, so resolution is deterministic (FR-106). Solo combat is the single-entry
table. Ally-targeted ability effects (heals, shields, buffs) and ally-health/party-state
tactics triggers complete the role loop: sustain builds generate threat-relevant healing,
tank builds carry taunt amplifiers, and the dungeon role interdependence (FR-221, SC-202)
emerges from builds rather than a class system.

**Rationale**: FR-108 names this model; an accumulator per (enemy, combatant) is trivially
serializable, replayable, and auditable in unit tests. Stable tie-break is the cheapest
guarantee that two identical runs never diverge.

**Alternatives considered**: random target selection (violates FR-106 determinism and
makes tanking impossible); fixed first-target focus (no role emergence — rejected against
FR-108); positional aggro (there is no position — UI-only invariant).

### R4 — Tactics: closed condition vocabulary, strict-priority evaluation; tactics ARE the auto AI

**Decision**: A tactics program is an ordered rule list `{abilityId, trigger}` plus
provision thresholds and the retreat threshold. Triggers come from a closed, engine-defined
condition vocabulary mirroring FR-166: `always`, `self-health-below(pct)`,
`enemy-health-above/below(pct)`, `ally-health-below(pct)`, `party-state(buff/debuff
present/missing on self|ally|enemy)`, `at-expedition-start`. Each combat tick the resolver
casts the highest-priority rule whose trigger holds and whose ability is off cooldown —
strict priority order makes ties impossible (FR-168). Tactics are runtime player state
(not content), editable mid-expedition effective next tick (FR-169); each school ships an
authored default rotation (FR-167). SC-108 (manual play never strictly required on
standard content) is verified by a property suite: for every launch enemy, the best
manual-tap trace found by search is reproduced by some tactics program — the vocabulary
must stay expressive enough to encode any tap sequence's *strategy* (condition-reachable
states), which is why the vocabulary is closed and versioned: extending it is an engine +
schema change with the parity suite re-run. The tactics engine is also the auto AI
everywhere (FR-182/203): in challenge content it additionally answers telegraphs with the
mechanic's authored generic answer — resolving the challenge layer's touchpoint (c).

**Rationale**: A closed vocabulary keeps execution deterministic, serializable, and
parity-testable; "the AI is just your tactics" is both the honest mental model the spec
sells (write tactics, not reflexes) and one less system to build.

**Alternatives considered**: free-form expression language (unbounded, breaks the parity
guarantee and invites authoring code); behavior trees (more power than FR-166's curated
condition set asks for, harder to surface in a phone UI); separate AI for disconnect
takeover (two execution paths to keep in parity — rejected).

### R5 — Expedition runtime: state machine with unified return summary

**Decision**: An `ExpeditionInstance` occupies the character's single activity slot
(FR-104) and owns: enemy selection, a build snapshot (school, slotted abilities, tree
effects, equipped gear instances, provision manifest — frozen at start except tactics,
FR-169), live combat state (per the resolver), the accruing haul, and a state machine
`fighting → ended(retreat | supplies | recalled | offline-cap) → recovering(until)`.
Defeat is automatic retreat at the configured threshold (or overwhelm with no provisions):
the haul banks in full, an extra durability hit applies, and a content-tunable
minutes-scale recovery timer gates only further expeditions (FR-130–132). Expedition
results merge into the established `EventSummary` (FR-014) so a returning player sees one
unified summary (combat edge case in spec). Travel, respec, and build edits require
ending the expedition; tactics edits do not.

**Rationale**: The frozen build snapshot is what makes offline replay well-defined (no
mid-run state the player could not have applied) and respec-mid-run impossible by
construction. Reusing EventSummary honors the one-summary rule without a parallel
reporting channel.

**Alternatives considered**: expeditions as a parallel slot beside idle activities
(violates FR-010/104's one-activity invariant); death/penalty states (excluded by
no-ruin, FR-130); mutable builds mid-run (breaks determinism and the spec's explicit
edge-case rule).

### R6 — Item instances: gear is instanced, provisions stay fungible

**Decision**: The combat core owns the `GearItemInstance` representation:
`{instanceId, itemDefId, gearScore, modifiers[], durability}` — non-fungible, stored/
escrowed/shipped as instances through the economy core's locality rules; `qualityGrade`
stays derived (R9, challenge). Provisions and materials remain fungible stacks under the
economy core's quantity model. Durability decrements on authored wear events (per fight,
extra on retreat); at zero the instance grants no stats, perks, or modifiers until
repaired for coin and/or materials (FR-122, sink). This resolves the challenge and
relic/delve layers' shared assumption (their touchpoint b): the instance representation
they extend is exactly this one.

**Rationale**: Gear needs per-item state (durability, rolled modifiers, awakening) that
fungible stacks cannot carry; everything else staying fungible keeps the market and
storage models the economy core shipped. One instance shape across combat, challenge
rewards, and relics is what lets relics be "ordinary gear instances" (R1, relic/delve).

**Alternatives considered**: all items instanced (order books over instances destroy
price-time matching for commodities); durability as a separate ledger keyed by item id
(indirection with no consumer — the instance already serializes).

### R7 — Loot: shared RewardTable shape, per-kill seeded sub-streams, no coin drops

**Decision**: Enemy drop tables use the same `RewardTable` shape the challenge layer
defined (entries: item or gearDrop with chance/qty — gearDrop rolls gear score within the
content band and modifiers from pools per FR-271), homed in `shared/reward-tables/`. Each
kill draws from a per-expedition RNG sub-stream (R6/R7 discipline) so loot is replayable
offline. **No drop table may pay coin** — enemies drop materials and gear only (FR-053
clarification); the content schema makes a coin entry unrepresentable and an integrity
test enforces the combat-economy mandates (every hunting region yields ≥ 1
combat-exclusive material; regions differ; ≥ 20% of crafting recipes demand combat
materials — FR-140/141, SC-105).

**Rationale**: One reward-table shape across hunting drops, challenge rewards, and venture
tables keeps the loot path single; unrepresentable-coin is the strongest possible
enforcement of the sole-faucet rule (R13, economy).

**Alternatives considered**: separate drop-table schema (drift risk between two loot
shapes for zero benefit); small coin drops "for feel" (rejected in clarification —
breaks the single-faucet accounting FR-053 builds telemetry on).

### R8 — Schools, abilities, trees: one EffectExpr vocabulary across the game

**Decision**: `SchoolDef` (mastery curve, designated scaling attributes, weapon/focus
item tag, basic attack, default tactics, two `TreeBranchDef`s), `AbilityDef` (cooldown,
effects, magnitude scaling, unlock source), and `TreeNodeDef` (prereqs, point cost,
passive EffectExpr or ability unlock) are authored content. Ability, perk, gear-modifier,
and encounter-mechanic effects all share **one** closed `EffectExpr` vocabulary (damage,
heal, HoT/DoT, buff, debuff, shield, stat/ability modification, threat amplification,
ally-targeted variants per FR-108) — the same vocabulary the challenge layer's
MechanicDef outcomes and the relic layer's signature modifiers already reference. Tree
points come from mastery level-ups with total points scarce relative to node cost
(content test, FR-171); respec refunds all points for coin, with invalid slotted
abilities unslotted and dependent tactics rules flagged inert (FR-173) — the inert-rule
pattern the relic layer reuses (touchpoint c of R11, relic/delve).

**Rationale**: One effect vocabulary is the single biggest simplification available: the
PvE-only audit (SC-208), the modifier counter system (FR-272), signature modifiers
(FR-301), and combat math all interpret the same expressions, so each new effect kind is
specified, audited, and tested once.

**Alternatives considered**: per-system effect vocabularies (three dialects of the same
ideas, three audit surfaces); abilities as code plugins (violates Principle IV outright).

### R9 — Combat onboarding: open from creation, one-time starter kit (FR-113)

**Decision**: Hunting grounds render on the settlement screen from character creation,
never gated on trade-skill progress. First open triggers the school-adoption flow: the
player picks any launch school (free) and the engine grants a one-time tier-1
weapon/focus for it — an ordinary craftable/tradable item whose only special property is
the single grant, recorded per character (`starter-grant` transaction kind, which Part I's
audit log already reserves). Later schools need no adoption step: equipping another
school's weapon/focus switches the active school (US7-AS5), masteries persist per school.
Guided onboarding keeps steering new settlers toward gathering first but locks nothing.

**Rationale**: Grant-once via the transaction log reuses existing audit machinery (the
record doubles as the idempotency check); deriving "active school" from the equipped
weapon/focus avoids a redundant selection state that could contradict the loadout.

**Alternatives considered**: locking combat behind a trade-skill level (explicitly
rejected by FR-113); free starter kit per school (a coin-free gear faucet — one kit ever,
the rest through the economy); an explicit school-selection state separate from the
equipped weapon (two sources of truth for one fact).

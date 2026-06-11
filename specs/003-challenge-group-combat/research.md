# Research: Challenge & Group Combat Content

**Date**: 2026-06-11 | **Plan**: [plan.md](./plan.md)

Resolves every open technical question from the plan's Technical Context. No NEEDS
CLARIFICATION markers remain. Inherits 001's research (R1–R8 there: PWA, monorepo, contract
shape, NPC markets, tick model, seeded RNG, save format, time integrity) without change.

## R1 — Live encounters: 1 s encounter tick nested in the 60 s world tick

**Decision**: Encounter instances run on their own fixed 1 s tick, driven by the same
injected clock and seeded RNG as the world simulation. While a character is inside an
instance, their world-side idle accrual is suspended (FR-205): the world tick simply sees
the character as `in-instance` and skips activity processing; on exit, idle time resumes
from the exit timestamp (no double-dip, no retroactive catch-up for instance time).
Encounter instances never fast-forward — they exist only in live sessions, so the offline
catch-up path (001 R5) is untouched.

**Rationale**: Telegraph windows are seconds-scale (FR-201); the 60 s world tick cannot
express them, and speeding the world tick up globally would bloat offline catch-up 60×.
Two fixed cadences with one clock keeps both deterministic and unit-testable. "Live
sessions only" (FR-205) removes the hardest problem — instances never need offline replay.

**Alternatives considered**: variable-rate single tick (breaks 001's closed-form offline
catch-up); event-driven continuous time inside encounters (harder to reproduce and test
than a fixed tick; tick granularity of 1 s is invisible under ≥ 4 s windows); running
encounters on the 60 s tick (cannot express response windows — rejected against FR-201).

## R2 — Mechanic vocabulary: declarative encounter scripts, interpreted by the engine

**Decision**: Encounters are authored as declarative scripts in content JSON: a list of
**phases** (entry conditions: boss-health %, timer), each with scheduled **mechanics**.
A mechanic is one of a closed vocabulary of kinds — `telegraph` (windowed attack with
authored answer set), `add-wave`, `enrage`, `aura`, `surge` (invasion wave pressure) —
with every parameter (window seconds, answers, per-answer outcomes, cooperative
requirement N-of-party, partial-answer consequences) as data. Answers reference the 002
action surface: slotted abilities, stances, provisions, plus format verbs (brace, station
duty, repair supply). The engine is a pure interpreter; adding a boss never touches code.

**Rationale**: Principle IV demands it, and the spec already speaks this language
(FR-201–202: "defined in authored content"). A closed kind-vocabulary keeps the
interpreter testable and makes the PvE-only audit (SC-208) a schema property: no mechanic
kind can target a player as a damage recipient of another player's action.

**Alternatives considered**: scripting language/Lua-style hooks (unbounded, untestable,
violates the authoring seam — authors would be writing code); hard-coded boss classes
(every boss a code change — rejected outright against Principle IV).

## R3 — Instance hosting: same engine module, two hosts

**Decision**: `encounter/` exposes an instance runtime with a pure reducer shape:
`(instanceState, contentDef, tick | playerInput) → instanceState + events`. V1 hosts one
instance in-process inside `LocalGameHost` (mettle trials — single participant). V2 hosts
instances as server rooms: the room owns the authoritative state, fans events out to
member sockets, and accepts member inputs. Group-format instances (dungeon, raid, world
boss, invasion) are V2-only at runtime but fully unit-tested in V1 CI by driving the same
reducer with scripted multi-player input streams.

**Rationale**: Principle V's architecture test, applied literally. The reducer shape means
"multiplayer" is a hosting concern, not an engine concern — exactly how 001 kept markets
identical across NPC/real players.

**Alternatives considered**: separate V2-only encounter service (duplicates logic, breaks
parity testing); client-hosted P2P group instances (anti-cheat and authority nightmare;
V2 server already exists in the 001 plan).

## R4 — Active-mode answers under latency: optimistic with windowed reconciliation

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

## R5 — Groups, boards, backfill, leadership: engine-owned social state behind the contract

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

## R6 — Mass participation (~50): one authoritative instance, contribution-bucketed

**Decision**: World bosses, eruption events, and invasions are single authoritative
instances (one room) with a participant set sized to the format cap (50 at launch).
Per-participant inputs are aggregated per encounter tick; the UI presents the fight
through aggregate surfaces (boss bar, wave pressure, station lanes) rather than 50 unit
frames. Participants beyond the cap attach in **overflow mode**: their contributions
accrue to their Contribution Record at full credit (FR-242) but they receive the
aggregate view only. Elite zones are the opposite scale: each engagement is its own
small instance keyed to exactly one party (FR-240), spawned on engage, discarded on end.

**Rationale**: 50 participants ticking at 1 s with discrete UI inputs is small data —
the hard problem is presentation and credit, not throughput (001's V2 already targets
10 k concurrent players). Overflow-as-credit-only honors "never silently uncredited"
without unbounded room membership.

**Alternatives considered**: sharding bosses into parallel copies (splits the social
moment the format exists for); open-world shared mob state for elite zones (the spec
explicitly chose party isolation after clarification).

## R7 — Loot, scores, contribution: deterministic engine math, authored tables

**Decision**: Personal loot rolls draw from the instance's seeded RNG stream, one
sub-stream per member per boss (order-independent, replayable). Score brackets are
authored per format/level (time + penalty criteria → bracket → payout multiplier) and
computed by the engine at run end. The Contribution Record is an engine accumulator:
`w_damage·damage + w_sustain·(healing+mitigation) + w_objective·objectiveActions`, with
weights authored per format and normalized so the median build archetype earns
comparably (FR-264); the reward floor compares a participant's record to the disclosed
percentage of the median contributor (FR-242). All weights, tables, odds, and brackets
are content data, disclosed in-game.

**Rationale**: FR-106 (002) extends naturally: identical run inputs → identical loot and
scores, which is also what makes SC-201/202/209 auditable in CI. Per-member sub-streams
prevent one player's roll from perturbing another's (loot disputes by RNG entanglement).

**Alternatives considered**: server-random loot (untestable, breaks V1/V2 parity);
damage-only contribution (rejected in spec clarification — sustain/control builds must
earn comparably).

## R8 — Weekly affliction rotation: deterministic schedule function

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

## R9 — Gear score, quality grade, modifiers: extension of the 001/002 item model

**Decision**: Gear item instances (002 FR-120) gain: `gearScore` (number within the
tier's authored band; scales stat magnitude by a stated curve), `modifiers[]` (instances
of authored ModifierDefs), and a **derived** `qualityGrade` = f(modifier count) — never
stored, always computed (FR-270). Modifier acquisition (FR-271): dropped gear rolls
modifiers from slot-specific authored pools with disclosed odds (instance RNG); crafted
gear locks chosen modifiers by consuming craft-mod materials (recipes reference
challenge-exclusive materials), remaining slots rolled; a disclosed pool subset is
flagged drop-exclusive per format. Ward/resist modifiers carry a `counters` reference to
affliction modifier ids (FR-272). Item instances therefore become non-fungible where 001's
were fungible: storage/escrow/shipping gain an item-instance representation for gear
while stackable goods keep the 001 quantity model.

**Rationale**: Derived grade can never desynchronize from modifier count; pools-as-data
keep the authoring seam; the fungible/non-fungible split is the minimal change to 001's
economy model that supports rolled gear (and 002 already needs per-instance durability,
so the instance representation is shared, not new).

**Alternatives considered**: stored grade field (redundant, can drift); fully fungible
gear (cannot represent rolls/durability — already impossible under 002); modifier
crafting via RNG-only (rejected in spec clarification — crafters must be able to lock).

## R10 — Invasion threat: authored-rate accumulator over settlement activity

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

## R11 — Dependency on spec 002 (unplanned): consume spec-fixed shapes only

**Decision**: 003's design binds only to structures spec 002 fixes normatively: control
modes and auto-AI takeover (FR-180–184), ability/tactics shape (FR-160–169), gear slots/
durability (FR-120–123), no-ruin (FR-130–132), drop-table economy discipline (FR-140).
Where 002's plan will make finer-grained decisions (exact tactics condition encoding,
combat stat formulae), 003 treats them as opaque: encounter answers reference abilities/
stances by id and consume 002's combat resolution as a function. Touchpoints to re-verify
when 002 is planned: (a) the combat tick rate 002 chooses for expeditions vs R1's 1 s
encounter tick, (b) the item-instance representation (R9 assumes it is shared with 002
durability), (c) the auto-AI interface (003 needs "AI plays generic answer" hooks,
FR-203).

**Rationale**: Keeps 003 plannable now without pre-empting 002's plan; the three named
touchpoints make the re-verification mechanical instead of a full re-read.

**Alternatives considered**: blocking 003 planning on 002's plan (serializes work the
specs already de-risked); planning 002 inside this plan (scope violation — separate
feature, separate lifecycle).

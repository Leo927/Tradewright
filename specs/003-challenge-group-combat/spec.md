# Feature Specification: Challenge & Group Combat Content

**Feature Branch**: `003-challenge-group-combat`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User direction: "There are also dungeons and group combat. I want to keep that too.
It is an integral part of a social game — having to depend on other players to achieve certain
things. The player should be able to actively control difficult combat like a boss fight."
Format-by-format decisions taken 2026-06-11: keep ALL of New World's PvE formats (expeditions/
dungeons, mutated difficulty tiers, raids/trials, invasions, soul trials, elite zones, world
events/breaches, world bosses); keep NO PvP formats; active control = live tactical control
with a simple auto AI for weaker stretches.

## Vision Summary

This spec adds Tradewright's challenge and social combat layer on top of spec 002's combat
core. Where 002 covers the idle, autoable loop (hunting grounds run by the tactics AI), this
spec covers the content you *show up* for: solo boss trials you pilot by hand, five-player
dungeons, rotating hard-mode mutations, large raids, settlement-defense invasions, and a
living open world of elite zones, eruption events, and world bosses.

Two ideas govern everything here:

1. **Active play is decision speed, never dexterity.** Difficult fights use 002's active mode
   (FR-180–184): the player drives abilities, provisions, and stances in real time against
   visible boss mechanics — tapping choices on cooldown timers, not aiming or dodging. The
   simple auto AI can take over any character at any moment (easy stretches, a phone call, a
   disconnected teammate), at AI-level effectiveness.
2. **Interdependence is the point.** Group content exists so players need each other — to fill
   a dungeon party, to muster a raid, to defend a settlement — and its exclusive rewards feed
   the economy so even pure traders care that fighters band together. PvE only: no
   player-vs-player damage exists anywhere in Tradewright.

Group formats are inherently multiplayer and ship with the online version (V2); solo
challenge content (soul trials) works in the solo version (V1) too. All structures are modeled
on New World's PvE formats; every name, place, enemy, and mechanic expression is original.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pilot a Solo Boss Trial (Priority: P1)

A player enters a soul trial — a solo, instanced duel against a boss with named mechanics
(phases, telegraphed heavy attacks, summoned adds, an enrage timer). They control the fight
live: triggering abilities, drinking remedies, switching stances as the boss telegraphs its
moves, with seconds-scale windows to respond. Victory awards trial-exclusive materials and a
completion rank; defeat costs only the standard retreat penalties.

**Why this priority**: It is the purest expression of "actively control difficult combat,"
has no multiplayer dependency (works in V1), and pioneers the boss-mechanic and active-control
systems every other format reuses.

**Independent Test**: Complete one trial with active control and verify mechanics fire per
definition, responses change outcomes, rewards grant on victory, and the same trial left to
the auto AI underperforms a competent live player.

**Acceptance Scenarios**:

1. **Given** an unlocked soul trial, **When** the player reviews it before entering, **Then**
   they see the boss's tier, its mechanic list (as discoverable hints or full detail once
   fought), recommended preparation, and the reward table.
2. **Given** an active trial, **When** the boss telegraphs a heavy attack, **Then** the UI
   presents the telegraph with a visible response window (measured in seconds) and the
   player's available answers (e.g., guard stance, counter ability, burst-through); the chosen
   response resolves with its stated effect.
3. **Given** a mechanic answered well vs ignored, **Then** outcomes differ materially (damage
   avoided/taken, phase shortened/extended) and the combat log attributes the difference.
4. **Given** the player toggles the auto AI mid-trial, **Then** the AI continues with
   configured tactics (it does not answer telegraphs beyond generic rules) and the player can
   retake control at any tick.
5. **Given** defeat in a trial, **Then** standard no-ruin rules apply (002 FR-130–132): haul
   kept, durability + recovery cost, nothing else lost.
6. **Given** a completed trial, **Then** a rank (e.g., time/penalty graded) is recorded and
   repeat runs can improve it.

---

### User Story 2 - Run a Dungeon with a Party (Priority: P2)

Five players form a party and enter an instanced dungeon: a sequence of encounters ending in
boss fights, designed so that one player cannot do everything — sustain, damage, and control
roles emerge from school/build choices. Each player controls their own character live (or
leans on the auto AI); bosses use the mechanic system from trials, with some mechanics
requiring multiple players to answer simultaneously. Completion pays dungeon-exclusive
materials to every member.

**Why this priority**: This is the social heart the user named — depending on other players to
achieve what you cannot alone.

**Independent Test**: Five test players complete a dungeon; verify role interdependence (a
party of five identical glass-cannon builds fails where a balanced party succeeds), shared
mechanics require multi-player answers, and per-member loot delivery.

**Acceptance Scenarios**:

1. **Given** a player at a settlement with a dungeon, **When** they open the group board,
   **Then** they can create a party listing (dungeon, role needs, planned start) or join one,
   and see the party fill in real time.
2. **Given** a full party that enters, **Then** each member fights as their own character with
   their own build and control mode; any member may use the auto AI at any time.
3. **Given** a boss mechanic flagged as cooperative, **When** it triggers, **Then** it
   requires answers from more than one party member within the window (e.g., two players must
   brace the same slam), and partial answers have partial consequences.
4. **Given** a member who disconnects mid-run, **Then** the auto AI takes their character over
   seamlessly until they return; the run is never voided by a disconnect.
5. **Given** a party wipe (all members at retreat threshold), **Then** the run ends under
   no-ruin rules: haul earned so far is kept, standard durability/recovery costs apply per
   member.
6. **Given** dungeon completion, **Then** every member receives their own loot roll
   (personal loot — no intra-party loot disputes) including dungeon-exclusive materials, and
   the completion is recorded for mutation eligibility (Story 3).

---

### User Story 3 - Climb Mutated Difficulty Tiers (Priority: P3)

Each week, a rotating subset of dungeons gains mutations — stacked modifiers (elemental
twists, empowered enemies, added curses) across difficulty levels. Higher mutation levels
demand tighter builds, better gear, and sharper live play, and pay proportionally rarer
rewards plus a scoreboard rank.

**Why this priority**: Mutations turn a finite dungeon set into a repeatable endgame ladder —
retention content that reuses everything from Story 2.

**Independent Test**: Run the same dungeon at base and at a mutation level; verify modifiers
apply per definition, entry requires the stated qualification, score is computed and ranked,
and reward tiers scale.

**Acceptance Scenarios**:

1. **Given** the weekly rotation, **When** a player views the group board, **Then** they see
   which dungeons are mutated this week, each mutation's modifiers in full, and the
   qualification needed per level.
2. **Given** a mutated run, **Then** the stated modifiers demonstrably alter combat (resist/
   vulnerability shifts, new enemy behaviors, curse effects) and the run is scored against
   time and penalty criteria.
3. **Given** a completed mutated run, **Then** rewards scale with mutation level and the
   party's score posts to a per-dungeon weekly leaderboard.

---

### User Story 4 - Muster a Raid (Priority: P4)

Ten or more players (10 standard; up to 20 for the largest encounter tier) schedule and
execute a raid: one or more bosses whose mechanics are built around group composition and
parallel responsibilities — splitting into sub-groups, covering simultaneous mechanics,
managing shared enrage timers. Raids are the apex of preparation: provisioning a raid is
itself an economic event (consumables, repair budgets, food for twenty).

**Why this priority**: The largest interdependence statement, but it needs every prior story's
systems plus healthy population — latest in the chain.

**Independent Test**: A full raid group completes the launch raid; verify sub-group mechanics
require distributed answers, composition gates matter, scheduling tools work, and exclusive
rewards deliver per member.

**Acceptance Scenarios**:

1. **Given** a company or group leader, **When** they schedule a raid, **Then** they can post
   a signup with date/time, role requirements, and minimum readiness (tier/gear hints), and
   invitees can commit, decline, or waitlist.
2. **Given** a raid encounter, **Then** at least one mechanic requires simultaneous answers
   from multiple sub-groups in different "positions" (UI lanes/stations — no spatial movement,
   assignment is a tactical choice), and failure consequences are shared.
3. **Given** raid completion, **Then** every member receives personal loot including
   raid-exclusive materials, and the clear is recorded (first-clear server announcements
   acceptable).
4. **Given** a member disconnect or drop-out mid-raid, **Then** the auto AI holds their
   character (at AI effectiveness) and the raid may continue or call it — no automatic void.

---

### User Story 5 - Live in an Active World: Elite Zones, Events, World Bosses (Priority: P5)

The open world itself offers group-scale combat without instancing or formal parties: elite
zones (regions whose enemies assume multiple hunters — players hunting there are
automatically co-credited), eruption events (timed incursions that pop up regionally and ask
whoever is present to clear waves together), and world bosses (massive enemies on published
spawn windows that regional players gather to bring down, with contribution-based rewards).

**Why this priority**: Ambient togetherness — the world feels alive and social without
scheduling. Lowest mechanical novelty (reuses auto/active combat on shared enemies).

**Independent Test**: Two uncoordinated players fight in the same elite zone and verify shared
credit; an event spawns, both contribute, both receive contribution-scaled rewards; a world
boss dies to N players and rewards all contributors per the stated curve.

**Acceptance Scenarios**:

1. **Given** an elite zone, **When** a solo player engages, **Then** the UI is honest that
   enemies assume a group; nearby players fighting the same enemy share credit and loot rolls
   automatically, no party required.
2. **Given** an eruption event spawning in a region, **Then** players in that settlement
   region are notified, can join with one tap, fight in waves (auto or active), and earn
   contribution-scaled rewards when it resolves — including caravan-route effects while it
   rages (event regions raise route risk, tying the living world back to logistics).
3. **Given** a world boss spawn window, **Then** it is published in advance on the region's
   board; the fight supports many simultaneous contributors; rewards scale with contribution
   with a guaranteed floor for any meaningful participation.

---

### User Story 6 - Defend the Settlement: Invasions (Priority: P6)

Periodically a settlement faces an invasion: waves of enemies threaten its facilities, and up
to a large defense roster of players signs up to repel them — choosing defensive stations
(walls, gates, siege engines as UI lanes), managing wave pressure, and answering surge
mechanics together. Success protects the settlement; failure temporarily degrades its
facilities (crafting station tiers, storage capacity) until repaired by contribution.

**Why this priority**: Connects combat to the settlement/territory layer (and previews Phase
2's stakes) — but it is the most systems-entangled format, so it lands last.

**Independent Test**: Trigger an invasion, fill defense slots, and verify station assignment
matters, wave/surge mechanics resolve, success preserves facilities, and failure applies the
stated temporary degradation with a contribution-based repair path.

**Acceptance Scenarios**:

1. **Given** a scheduled invasion, **Then** the settlement's players see the warboard signup
   with timing, roster limit, and station plan; signups commit to a slot.
2. **Given** the invasion running, **Then** defenders fight waves at their stations (auto or
   active), surge mechanics demand coordinated answers, and the defense's aggregate
   performance determines the outcome.
3. **Given** a failed defense, **Then** the settlement suffers only the stated, temporary,
   repairable consequences (degraded facility tiers; never loss of player property), and
   repair becomes a contribution event that producers and haulers can also serve (supplying
   materials).
4. **Given** a successful defense, **Then** contributors earn defense-exclusive rewards and
   the settlement gains a short prosperity bonus (e.g., reduced taxes), making defense
   everyone's business.

---

### Edge Cases

- Party/raid member offline at scheduled start → slot opens to waitlist; run can start with
  AI-held reserved characters only by explicit leader choice.
- All members lean on auto AI in challenge content → permitted but underpowered by design
  (FR-183); content tuned so high tiers realistically require live answers.
- Disconnect during a cooperative mechanic window → AI gives the generic (suboptimal) answer;
  partial-answer consequences apply, run continues.
- Two settlements' events/invasions overlap for one player → character is one place at a time
  (001 FR-002); commitments conflict visibly at signup.
- Solo player enters group-tuned content alone → allowed where entry rules permit, with
  honest "designed for N players" warning; no artificial lockout below recommended size.
- Low population region/server → group board surfaces cross-settlement listings (travel
  required, per 001 rules); world events scale wave size down to participants present, within
  stated bounds.
- Player in a dungeon when the offline cap would hit → instanced group content runs in live
  sessions only; the cap question does not arise inside it (idle accrual is paused while in a
  live instance).
- Reward farming by re-running → entry limits (daily/weekly) are content-tunable per format;
  limits always disclosed up front.
- V1 (solo version): soul trials fully available; all multiplayer formats visibly labeled as
  online-version content, never silently absent.

## Requirements *(mandatory)*

### Functional Requirements

**Challenge Encounter System (shared by all formats)**

- **FR-201**: Boss-grade encounters MUST be built from a mechanic vocabulary (phases,
  telegraphed attacks with seconds-scale response windows, adds, enrage timers, cooperative
  answers) defined in authored content — never input-dexterity tests (002 FR-184 binding).
- **FR-202**: Every mechanic MUST present its telegraph, window, available answers, and
  consequences through UI elements; after first encounter, mechanics are inspectable in a
  bestiary/journal.
- **FR-203**: Active control in encounters follows 002 FR-181–183: live tactical input,
  auto-AI toggle at any time, AI holds disconnected/absent players, active play may
  outperform AI here.
- **FR-204**: All no-ruin guarantees hold in every format (002 FR-130–132): no death, no loss
  beyond durability/recovery; group wipes end runs without voiding earned haul.
- **FR-205**: Challenge content runs in live sessions only; idle/offline accrual (001 FR-013)
  is suspended while in an instance and resumes after. Instanced content does not run offline.

**Solo Trials**

- **FR-210**: Solo boss trials MUST exist from the solo version (V1) onward, tier-laddered,
  with trial-exclusive reward materials and recorded completion ranks (graded, repeatable).
- **FR-211**: Trial qualification (tier/build/gear) MUST be disclosed; locked trials show
  requirements.

**Parties, Dungeons & Mutations**

- **FR-220**: The game MUST provide party formation (create/join listings on a group board;
  invite by name; role-need labeling) without requiring third-party coordination tools.
- **FR-221**: Dungeons MUST be instanced for a fixed party size (launch: 5), composed of
  encounter sequences with at least one cooperative mechanic per boss, and tuned so balanced
  role coverage outperforms uniform compositions measurably.
- **FR-222**: Loot in all group content MUST be personal (per-member rolls); format-exclusive
  materials MUST feed the economy (recipes demand them) per 002 FR-140 discipline.
- **FR-223**: A weekly mutation rotation MUST apply stacked, fully-disclosed modifiers to a
  subset of dungeons across at least 3 difficulty levels, with qualification gates, scoring,
  and weekly leaderboards.

**Raids**

- **FR-230**: Raid encounters MUST support 10 players (up to 20 for the largest tier), with
  sub-group mechanics requiring distributed simultaneous answers and composition-sensitive
  tuning.
- **FR-231**: Raid scheduling tools MUST exist in-game: posted signups with time, role needs,
  commitments, and waitlists.

**Open-World Group Content**

- **FR-240**: Elite zones MUST grant automatic shared credit and personal loot rolls to
  co-combatants without formal grouping.
- **FR-241**: Eruption events MUST spawn on regional cadences, notify present players, scale
  within stated bounds to participation, pay contribution-scaled rewards, and raise affected
  caravan-route risk while active (logistics tie-in).
- **FR-242**: World bosses MUST spawn on published windows, support mass participation, and
  reward by contribution with a guaranteed floor.

**Invasions**

- **FR-250**: Invasions MUST threaten settlements on visible schedules, use warboard signups
  with station assignment (UI lanes), and resolve from aggregate defense performance.
- **FR-251**: Defense failure consequences MUST be temporary, settlement-level, and repairable
  through contribution (materials, coin, labor) — never destruction of player property;
  success MUST grant settlement-wide benefits so non-fighters have a stake.

**Social & Economy Integration**

- **FR-260**: Each format MUST have at least one exclusive reward material demanded by the
  recipe economy, so group achievement flows into markets and caravans.
- **FR-261**: Group activity MUST respect the PvE-only rule absolutely: no format, mechanic,
  or edge case may apply player-vs-player damage or loss.
- **FR-262**: All formats MUST be visible (with honest "online version" labeling where
  applicable) in V1, and multiplayer formats MUST activate with the online version (V2)
  without client redesign.
- **FR-263**: All group content MUST remain phone-first (001 FR-061) with sessions designed
  for mobile attention spans: dungeons target ≤ 30 minutes, raid encounters ≤ 45 minutes,
  events ≤ 15 minutes.

### Key Entities

- **Encounter / Mechanic**: Authored challenge definitions — phase scripts, telegraphs,
  response windows, answers, cooperative requirements, enrage timers.
- **Soul Trial**: Solo instanced encounter ladder with ranks and exclusive rewards.
- **Dungeon**: 5-player instanced encounter sequence; base + weekly mutated variants.
- **Mutation**: Stacked modifier set (level 1–3+) with qualification, scoring, leaderboard.
- **Raid**: 10–20 player instanced encounter(s) with sub-group mechanics and scheduling.
- **Party / Raid Group / Signup**: Social formation objects — listings, roles, commitments,
  waitlists.
- **Elite Zone / Eruption Event / World Boss**: Open-world group content with shared credit
  and contribution-scaled rewards.
- **Invasion**: Scheduled settlement-defense event — stations, waves, aggregate resolution,
  temporary repairable consequences, settlement-wide stakes.
- **Contribution Record**: Per-player participation measure used by events, bosses, invasions,
  and repair drives.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-201**: A competent live-controlled player clears a tier-appropriate soul trial that the
  auto AI (same build/gear) fails or completes ≥ 25% slower — active control demonstrably
  matters on 100% of launch trials.
- **SC-202**: A five-player party with balanced roles completes the launch dungeon at the
  target session length (≤ 30 min) with ≥ 90% of runs free of technical voiding; a uniform
  no-sustain composition fails the same dungeon ≥ 70% of attempts (interdependence is real).
- **SC-203**: Disconnect resilience: 100% of mid-run disconnects result in AI takeover within
  one combat tick and zero voided runs in audit.
- **SC-204**: Social formation works in-game: ≥ 80% of dungeon parties in test cohorts form
  via the group board without external coordination tools.
- **SC-205**: Economy integration: every format's exclusive materials are demanded by ≥ 1
  recipe; group-content materials account for ≥ 10% of launch recipe inputs overall.
- **SC-206**: No-ruin holds at scale: 0 audited cases of any group outcome destroying player
  property or progression beyond stated durability/recovery costs.
- **SC-207**: Phone sessions: ≥ 90% of completed dungeon runs and 100% of events fit their
  target session lengths on phone-portrait UI.
- **SC-208**: PvE-only invariant: 0 code paths or content definitions capable of applying
  player-to-player damage (verified by audit of the mechanic vocabulary).

## Scope Boundaries

**In scope**: the challenge encounter/mechanic system; soul trials (V1+); parties and group
board; 5-player dungeons; weekly mutations with leaderboards; 10–20 player raids with
scheduling; elite zones; eruption events (with caravan-risk tie-in); world bosses; settlement
invasions with contribution repair; personal loot; format-exclusive economy materials.

**Out of scope (this spec)**:

- All PvP (wars, arenas, outpost-style modes, open-world flagging, capture-the-flag) —
  decided 2026-06-11: Tradewright is PvE-only, permanently; territory contests remain economic
  per 001/Phase 2.
- Guild/company *systems* themselves (Phase 2 spec); this spec only consumes "a group of
  players" however formed.
- Voice/text chat systems (group coordination uses structured UI: pings, ready-checks,
  station assignments; a chat decision belongs to a social spec).
- Cross-server play, seasonal resets, or competitive seasons beyond weekly mutation boards.
- Spectating, replays, or build-sharing portals (future quality-of-life).

## Assumptions

- **Dependency chain**: this spec builds strictly on 002 (control modes, builds, no-ruin) and
  001 (settlements, items, economy, caravans). Multiplayer formats additionally require the
  online version (V2 in the 001 plan); soul trials do not.
- **"Positions" without movement**: where the source formats use spatial positioning, we use
  UI stations/lanes (a tactical assignment choice) — preserving the decision, discarding the
  movement, consistent with the no-action rule.
- **Personal loot** (no group loot disputes) chosen over roll/auction systems for phone-first
  simplicity and social hygiene.
- **Mutation cadence** weekly with 3 levels at launch, content-tunable (structure per New
  World's mutator system; all modifier names/effects original).
- **Raid size** 10 standard / 20 max at launch (mirrors source structure: 10-player raid,
  20-player apex encounters) — content-tunable.
- **Invasion stakes** preview Phase 2: facility degradation/repair mechanics are designed to
  be reused by territory systems later; nothing here decides territory *ownership*.
- **Session lengths** (30/45/15 min) are design budgets, not hard timeouts; content tuning
  enforces them statistically (SC-207).
- **Idle pause in instances**: suspending idle accrual during live instanced sessions is the
  anti-double-dip rule; it also keeps "one character, one place, one activity" coherent.

# Feature Specification: Tradewright — Idle MMO Economy Game (Core Game, Phase 1)

**Feature Branch**: `001-idle-economy-mmo`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "A phone-first, UI-only idle MMO economy game. Ironwood RPG's idle
skilling loop fused with New World's economy systems: localized settlement markets, caravan
logistics, crafting interdependence, and company-owned territories — with all combat and action
gameplay removed. No 3D graphics; the entire game is UI screens and numbers."

## Vision Summary

Tradewright is a phone-first, UI-only idle game built entirely around a player-driven economy.
Players develop trade skills (gathering, refining, crafting) through an idle loop that progresses
in real time and while offline. Every settlement runs its own independent market with its own
order book — there is deliberately no global market — so prices diverge by town and moving goods
between towns via timed caravans is a profitable playstyle in itself. Crafting recipes consume the
outputs of other skills, making players economically interdependent. All world content (skills,
items, recipes, settlements) is original to Tradewright; only the structural patterns of the
inspiration games are ported, never their IP.

This specification covers **Phase 1**: the idle skilling loop, localized settlement economies,
and caravan logistics. **Phase 2** (companies/guilds, settlement ownership, tax setting, facility
upgrades, economic territory contests) is out of scope here and will be specified separately.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Begin Life as a Settler (Priority: P1)

A new player creates an account, names their character, chooses a starting settlement, and is
guided to assign their character to a first gathering activity. Progress accrues visibly in real
time — a progress bar fills per action, output items accumulate in local storage, and skill
experience grows toward the next level.

**Why this priority**: This is the irreducible core of the game — without the assign-and-accrue
loop nothing else has value. It is the MVP that proves the idle engine, the content data model,
and the phone-first UI.

**Independent Test**: A fresh player can register, reach a settlement screen, start a gathering
activity, and after a known interval observe the predicted number of completed actions, items in
storage, and experience gained — with no market or caravan features present.

**Acceptance Scenarios**:

1. **Given** a first-time visitor, **When** they complete account creation and character setup,
   **Then** they arrive in their chosen starting settlement with an empty inventory, a starter
   amount of currency, and all skills at level 1.
2. **Given** a character with no active assignment, **When** the player selects a gathering
   activity available at their settlement and confirms, **Then** the activity begins immediately,
   the screen shows action duration, output per action, and experience per action.
3. **Given** an active gathering assignment, **When** one action duration elapses, **Then** the
   output items are added to the character's storage in that settlement and skill experience
   increases by the stated amount, without any user interaction.
4. **Given** an active assignment, **When** the player assigns a different activity, **Then** the
   game asks for confirmation, the previous activity stops (partial actions yield nothing), and
   the new activity starts.
5. **Given** a skill that reaches a level threshold, **When** the level increases, **Then** any
   newly unlocked activities or recipes are discoverable and clearly marked as newly available.

---

### User Story 2 - Return After Time Away (Priority: P2)

A player closes the game with an activity running. Hours later they return. The game shows a
summary of everything that happened while they were gone: actions completed, items produced,
experience and levels gained, and anything that stopped early (e.g., storage full) — then play
resumes seamlessly.

**Why this priority**: Offline accrual is what makes the game an idle game; the check-in loop is
the dominant play session type. It is second only to the loop itself.

**Independent Test**: Start an activity, advance time (or wait), reopen the game, and verify the
summary matches the deterministic prediction of actions-per-hour × elapsed time, capped at the
offline limit.

**Acceptance Scenarios**:

1. **Given** an active assignment and a closed app, **When** the player returns after N hours
   (N ≤ offline cap), **Then** a summary reports completed actions, items produced, and experience
   gained — matching exactly what continuous online play would have produced.
2. **Given** an absence longer than the offline cap, **When** the player returns, **Then**
   progress accrues only up to the cap and the summary states clearly that the cap was reached
   and when.
3. **Given** an activity whose output filled the settlement storage mid-absence, **When** the
   player returns, **Then** the summary shows when and why production halted, and accrued progress
   up to that point is preserved.
4. **Given** a player who manipulates their device clock, **When** they reopen the game, **Then**
   accrued progress reflects true elapsed time only — clock changes grant no extra progress.

---

### User Story 3 - Refine and Craft (Priority: P3)

A player takes raw materials gathered earlier and refines them into processed goods, then crafts
finished items from processed goods — following recipe trees where higher-tier recipes require
multiple lower-tier inputs from different skills. Recipes are gated by skill level tiers.

**Why this priority**: Crafting interdependence is what gives goods differentiated value and
creates the supply chains that markets and caravans exist to serve.

**Independent Test**: With seeded raw materials in storage, a player can run a refining activity
that consumes inputs and produces outputs at the stated ratio, then craft a finished item whose
recipe consumes outputs of two different skills.

**Acceptance Scenarios**:

1. **Given** sufficient input materials in local storage and the required skill tier, **When** the
   player assigns a refining activity, **Then** each completed action consumes the stated inputs
   and produces the stated outputs and experience.
2. **Given** insufficient input materials, **When** the player attempts to assign the activity,
   **Then** the game explains exactly which inputs are missing and in what quantity, and the
   assignment does not start.
3. **Given** an active refining run, **When** inputs run out mid-run, **Then** the activity halts,
   and the halt is reported (immediately if online, in the return summary if offline).
4. **Given** a recipe above the player's current skill tier, **When** the player views it, **Then**
   it is visible but locked, showing the tier required to unlock it.
5. **Given** a finished-goods recipe requiring outputs from multiple skills, **When** all inputs
   are present locally, **Then** the craft succeeds and consumes inputs from local storage only —
   materials stored in other settlements are not usable.

---

### User Story 4 - Trade at the Local Market (Priority: P4)

A player visits their settlement's trading post and places buy and sell orders on the local order
book. Orders match against other players' standing orders in that settlement only. Prices for the
same good differ between settlements because each order book is independent.

**Why this priority**: The market converts production into profit and makes other players'
activity visible. It depends on Stories 1–3 producing goods worth trading.

**Independent Test**: Two test players in the same settlement can complete a full trade (one lists
a sell order, the other buys it); the same listing is invisible and unmatchable from any other
settlement.

**Acceptance Scenarios**:

1. **Given** a player at a settlement with goods in local storage, **When** they place a sell
   order (item, quantity, unit price), **Then** the goods are escrowed from storage and the order
   appears in that settlement's order book with its listed duration and any listing fee shown
   before confirmation.
2. **Given** a standing sell order, **When** another player in the same settlement buys at that
   price, **Then** the trade executes: the buyer pays coin and receives goods into local storage,
   the seller receives coin minus the settlement's sales tax, and both can see the completed
   trade in their history.
3. **Given** a buy order priced at or above an existing sell order, **When** it is placed, **Then**
   it fills immediately at the best available price, partially filling if quantity exceeds
   availability, with the remainder staying on the book.
4. **Given** an order book in settlement A, **When** a player in settlement B browses B's trading
   post, **Then** A's orders are not visible and cannot be matched — each settlement's market is
   fully independent.
5. **Given** an order that expires unfilled, **When** the duration lapses, **Then** escrowed goods
   or coin return to the owner's local storage/wallet and the owner is notified on next viewing.
6. **Given** any market screen, **When** the player views an item, **Then** they can see current
   best bid/ask and recent trade prices for that item in that settlement.

---

### User Story 5 - Haul Goods Between Settlements (Priority: P5)

A player notices an item is cheap where they are and expensive elsewhere. They load a caravan with
cargo (limited by weight), dispatch it on a route with a real-time travel duration and a stated
risk level, pay route costs, and — after the timer completes — the goods arrive in the destination
settlement's storage, ready to sell at the higher local price. The player's character can also
travel between settlements, separately from caravans.

**Why this priority**: Caravans are the connective tissue between local economies and the payoff
of the no-global-market design. They depend on markets (Story 4) existing in at least two towns.

**Independent Test**: With price differences seeded between two settlements, a player can dispatch
a caravan, observe the timer, receive goods at the destination on completion, and the end-to-end
arbitrage (buy low → ship → sell high) yields the predicted profit after taxes and fees.

**Acceptance Scenarios**:

1. **Given** goods in local storage, **When** the player composes a caravan shipment, **Then** the
   UI shows cargo weight against the caravan's capacity, the route's travel duration, risk level,
   dispatch cost, and destination taxes before the player confirms.
2. **Given** a dispatched caravan, **When** the travel timer is running, **Then** the player can
   continue all other play (idle activities, trading) — hauling never blocks the rest of the game
   — and can check the caravan's progress and arrival time at any moment.
3. **Given** a caravan that arrives (online or offline), **When** the player next views the game,
   **Then** the cargo is in the destination settlement's storage and the arrival appears in the
   summary/notifications.
4. **Given** a route with nonzero risk, **When** a risk event occurs on a shipment, **Then** the
   stated consequence (loss of a portion of cargo) is applied, the player is informed of exactly
   what was lost, and shipments with risk mitigation purchased lose less.
5. **Given** a character in settlement A, **When** the player initiates character travel to
   settlement B, **Then** travel takes the route's stated real time, the character's idle activity
   stops during travel, and on arrival the player can act in B (assign local activities, use B's
   market and storage).
6. **Given** the player's caravans are all in transit, **When** they attempt another dispatch,
   **Then** the game explains the caravan slot limit and when a slot frees up.

---

### Edge Cases

- Offline absence exceeds the offline cap → progress accrues to the cap only; summary says so.
- Settlement storage fills during production → activity halts; halt reason is reported; no output
  is silently discarded.
- Refining inputs exhausted mid-run (online or offline) → activity halts with reason.
- Device clock manipulation (forward or backward) → no effect on accrued progress, timers, or
  caravan arrivals; all timing derives from authoritative time.
- Two buyers attempt to fill the same order simultaneously → exactly one succeeds per unit of
  quantity; no goods or coin are duplicated or lost.
- Market with no liquidity (empty order book) → player can still place the first order; UI shows
  an empty-book state, not an error.
- Order expires while owner is offline → escrow returns; notification on next session.
- Caravan risk event destroys part of a cargo that was the player's entire stock → loss is bounded
  by the shipment; nothing outside the cargo is affected.
- Player attempts to use materials stored in another settlement → clearly messaged as unavailable
  here, with the location where they are stored.
- Player dispatches a caravan, then travels their character on the same route → both timers run
  independently.
- Account plays on two devices simultaneously → a single authoritative game state; no duplication
  of progress, currency, or items.

## Requirements *(mandatory)*

### Functional Requirements

**Account & Character**

- **FR-001**: System MUST let a player create an account, create exactly one named character, and
  choose a starting settlement from the launch set.
- **FR-002**: A character MUST exist in exactly one settlement (or in transit between two) at any
  moment; the character's location determines which activities, storage, and market they can use.
- **FR-003**: Game state MUST be account-bound and consistent across devices; the same account on
  a second device sees the same authoritative state.

**Idle Skilling Loop**

- **FR-010**: A character MUST be assignable to at most one activity at a time (gathering,
  refining, or crafting); assigning a new activity replaces the current one after confirmation.
- **FR-011**: Each activity MUST define: action duration, inputs consumed per action (if any),
  outputs produced per action, experience granted per action, and required skill level.
- **FR-012**: Active assignments MUST progress in real time while the player is online, with each
  completed action applying its inputs/outputs/experience atomically.
- **FR-013**: Active assignments MUST continue to accrue while the player is offline, up to a
  fixed offline cap, producing results identical to continuous online play over the same period.
- **FR-014**: On return from absence, the system MUST present a summary of offline gains and any
  events (halts, caravan arrivals, order fills/expiries) since last session.
- **FR-015**: Each skill MUST have levels driven by an experience curve, with content gated into
  tiers; reaching a tier unlocks that tier's activities and recipes for the skill.
- **FR-016**: Activities MUST halt safely (no lost or duplicated resources) when inputs run out or
  output storage is full, recording the halt time and reason.
- **FR-017**: All progress and timer calculations MUST use authoritative time; client clock
  changes MUST NOT alter outcomes.

**Items, Recipes & Storage**

- **FR-020**: Every item MUST have a tier and a weight; weight governs caravan capacity use.
- **FR-021**: Recipes MUST form interdependent chains: refining recipes consume gathered goods;
  crafting recipes consume refined goods, including combinations from multiple skills, at defined
  input:output ratios.
- **FR-022**: Each settlement MUST provide per-player local storage; items physically reside in
  exactly one settlement's storage (or in a caravan in transit) and are usable only where they
  reside.
- **FR-023**: Storage MUST have a capacity limit visible to the player, with expansion as a
  progression mechanic.
- **FR-024**: All game content (skills, activities, items, recipes, settlements, routes) MUST be
  original to Tradewright — no names, lore, or text reproduced from other games — and MUST be
  defined as authored content data, editable without code changes.

**Settlements & Local Markets**

- **FR-030**: The launch world MUST contain multiple settlements (minimum 4) with deliberately
  asymmetric local resource availability, so that no settlement can produce everything and
  inter-settlement trade is necessary.
- **FR-031**: Each settlement MUST operate its own independent trading post with its own order
  book; there MUST be no global market, no cross-settlement order visibility, and no
  cross-settlement matching.
- **FR-032**: Players MUST be able to place limit buy and sell orders (item, quantity, unit
  price, duration) at their current settlement; sell orders escrow goods, buy orders escrow coin.
- **FR-033**: Orders MUST match within a settlement by price priority, then time priority, with
  partial fills supported; matched trades transfer goods/coin atomically.
- **FR-034**: Each settlement MUST apply its own listing fee and sales tax to market activity,
  with all fees disclosed before order confirmation. (Phase 1: rates are world-defined per
  settlement; Phase 2 will hand rate-setting to owning companies.)
- **FR-035**: Players MUST be able to see, per item per settlement: current best bid/ask, order
  book depth, and recent trade history. Players MUST NOT be shown live prices for settlements
  their character or caravans have no presence in — price discovery elsewhere comes from visiting,
  hauling, or word of mouth.
- **FR-036**: Expired or cancelled orders MUST return escrowed goods/coin in full (fees per
  FR-034 excepted).

**Caravans & Travel**

- **FR-040**: Players MUST be able to dispatch caravans carrying cargo from their current
  settlement to a connected settlement; each route defines real-time duration (on the order of
  hours), risk level, and dispatch cost.
- **FR-041**: Caravan cargo MUST be limited by weight capacity; capacity and concurrent caravan
  slots MUST grow through a hauling progression (a skill leveled by completed shipments).
- **FR-042**: Caravan timers MUST run in real time, independent of the player's online status and
  of the character's activity assignment; arrival deposits cargo into the player's destination
  storage.
- **FR-043**: Routes with risk MUST resolve risk events at most once per shipment, with the
  possible loss fraction stated before dispatch; players MUST be able to purchase mitigation
  (e.g., guards/insurance) that reduces loss, priced per shipment.
- **FR-044**: Characters MUST be able to travel between connected settlements on a real-time
  timer shorter than the caravan duration for the same route; travel suspends the active
  assignment.
- **FR-045**: The world map/route view MUST show, for each route from the current settlement:
  destination, duration (caravan and personal), risk level, and dispatch costs.

**Economy & Currency**

- **FR-050**: The game MUST have a single coin currency, earned primarily by selling goods;
  characters start with a small fixed amount.
- **FR-051**: All taxes and fees MUST be sinks (coin leaves the player economy) in Phase 1.
- **FR-052**: Every economic mutation (trade, fee, tax, caravan loss, production) MUST be recorded
  so a player's coin and item history is auditable in their transaction log.

**Presentation & Platform**

- **FR-060**: The entire game MUST be playable through 2D UI screens — lists, cards, progress
  bars, numbers — with no 3D or action gameplay anywhere.
- **FR-061**: The game MUST be phone-first: every screen and flow fully usable on a typical
  phone-sized portrait display, with one-handed reach for primary actions.
- **FR-062**: Every interaction MUST respond immediately; operations that take time (caravans,
  actions, orders) show their pending state without blocking any other part of the UI.

### Key Entities

- **Account / Character**: The player's identity; one character per account; has a location
  (settlement or in transit), a coin wallet, skill levels, and an optional active assignment.
- **Skill**: A named progression track (gathering, refining, crafting, or hauling family) with an
  experience curve and tier thresholds that gate content.
- **Activity**: A repeatable unit of idle work tied to a skill and a settlement's available
  resources; defines duration, inputs, outputs, experience.
- **Item**: A tradable good with tier and weight; exists in a settlement storage, an order escrow,
  or a caravan.
- **Recipe**: A transformation (refining or crafting) defining input items/quantities → output
  items/quantities and required skill tier.
- **Settlement**: A world location with local resource availability, per-player storage, a
  trading post (order book), tax/fee rates, and routes to connected settlements.
- **Market Order**: A standing buy or sell offer (item, quantity, unit price, duration, owner)
  local to one settlement; escrows goods or coin.
- **Trade**: An executed match between orders; records item, quantity, price, tax, parties, time.
- **Caravan Shipment**: A cargo manifest in transit on a route; has departure/arrival times, risk
  outcome, and mitigation purchased.
- **Route**: A connection between two settlements with caravan duration, personal travel
  duration, risk level, and dispatch cost.
- **Offline/Event Summary**: The accumulated record of everything that resolved since the
  player's last session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time player gets from app open to their first running idle activity in
  under 3 minutes without external help.
- **SC-002**: A returning player sees their complete offline summary within 3 seconds of opening
  the game, and the reported gains exactly match the deterministic expectation for the elapsed
  time in 100% of audited cases.
- **SC-003**: The daily check-in loop (review summary, collect, reassign activity, dispatch or
  receive a caravan) is completable in under 2 minutes.
- **SC-004**: Placing a market order takes no more than 6 inputs (taps/entries) from the trading
  post screen.
- **SC-005**: Offline and online progression are identical: for any activity and any duration up
  to the offline cap, offline yield equals online yield to the unit.
- **SC-006**: Economic interdependence is real: no single settlement's local resources can
  produce more than 60% of launch recipes, so trade is required for full progression.
- **SC-007**: Arbitrage is live gameplay: across any 24-hour window of a healthy world, at least
  one caravan route offers a post-tax, post-risk expected profit, and hauling-focused play earns
  coin at a rate within ±50% of production-focused play at equivalent investment.
- **SC-008**: The shared world supports at least 10,000 concurrently active players trading on
  settlement markets without players experiencing degraded responsiveness.
- **SC-009**: Every screen passes phone-portrait usability: all primary actions reachable and all
  text legible on a 6-inch display, verified for 100% of shipped screens.
- **SC-010**: Zero tolerance for economic integrity defects: duplication or loss of items/coin
  from concurrent trading, timer manipulation, or interrupted sessions occurs in 0 audited cases.

## Scope Boundaries

**In scope (Phase 1)**: everything above — accounts, idle skilling, offline accrual, items/
recipes/storage, settlements with independent markets, caravans, character travel, single
currency, transaction history, phone-first UI.

**Out of scope (this spec)**:

- Phase 2 territory control: companies/guilds, settlement ownership, player-set taxes, facility
  upgrades, war-effort contribution races.
- Combat, action gameplay, or any real-time dexterity mechanics (excluded permanently by design).
- Monetization, purchases, or premium currency.
- Player-to-player direct trading/gifting outside the market (prevents untracked transfers).
- Chat or social systems beyond seeing market activity.
- 3D rendering of any kind (excluded permanently by design).

## Assumptions

- **Shared world**: Tradewright is one shared persistent world — all players trade on the same
  settlement order books. Early development milestones may stand in simulated market participants
  for testing, but the product behavior specified here is multiplayer.
- **Offline cap**: offline accrual is capped at 24 hours; absence beyond the cap wastes time, not
  progress already earned. The cap value is content-tunable.
- **Idle pacing**: standard idle conventions apply — actions in the seconds-to-minute range,
  hundreds to low thousands of actions per hour-equivalent at low tiers, exponential XP curves
  per tier, modeled on Ironwood RPG / Melvor Idle pacing.
- **Skill families at launch**: at least 3 gathering, 2 refining, and 2 crafting skills plus the
  hauling progression, each with at least 4 tiers — enough to demonstrate full interdependence.
  Exact counts are content decisions, not code constraints.
- **Structure porting**: recipe tree shapes, refining input:output ratio patterns, and tier
  progression structure follow New World's publicly documented trade-skill systems; every name,
  item, location, and text string is original.
- **Caravan durations**: routes run roughly 2–6 hours for caravans; personal travel is materially
  shorter (minutes to tens of minutes). Values are content-tunable per route.
- **Risk model**: route risk is a disclosed probability of losing a fraction of cargo, resolved
  once per shipment; mitigation spend reduces the loss fraction. No total-loss routes at launch.
- **Order presence rule**: placing and managing orders requires the character to be at the
  settlement; standing orders continue to work after the character leaves.
- **One character per account** at launch; multi-character support is a future consideration.
- **Authentication**: standard account registration/login appropriate for a persistent online
  game; no specific provider assumed.

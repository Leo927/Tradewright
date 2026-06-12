# Contract: Game Protocol (GUI ↔ Engine)

**Date**: 2026-06-11 | **Plan**: [../plan.md](../plan.md) | **Package**: `@tradewright/contract`

Merged 2026-06-11 from the former game/challenge/relic-delve protocol contracts (spec collapse).

## Part I — Economy Core (former 001)

This is the constitution Principle V seam. The GUI depends on this contract and nothing else;
the engine implements it. V1 binds it in-process (`LocalTransport`), V2 over WebSocket
(`RemoteTransport`). Every payload is JSON-serializable. The contract is **async by design**
(Principle IX): commands acknowledge, results arrive as events.

### Transport interface

```ts
interface GameTransport {
  send(command: Command): Promise<CommandAck>;     // validates + accepts/rejects, returns fast
  query<Q extends Query>(q: Q): Promise<ResultOf<Q>>; // read-only snapshot, never mutates
  subscribe(listener: (e: GameEvent) => void): Unsubscribe; // push: confirmations, world changes
}
```

`CommandAck = { accepted: true, commandId } | { accepted: false, code: ErrorCode, message }`.
Acceptance means "valid and applied (V1) / applied optimistically pending server (V2)" — final
outcomes are events. Rejections are immediate and explain themselves (e.g.
`INSUFFICIENT_INPUTS`, `NOT_AT_SETTLEMENT`, `STORAGE_FULL`, `CARAVAN_SLOTS_BUSY`,
`TIER_LOCKED`, `INSUFFICIENT_FUNDS`).

### Commands (mutations)

| Command | Payload | Key validations | Spec |
|---|---|---|---|
| CreateCharacter | name, startSettlementId | once per account | FR-001 |
| AssignActivity | activityId | location, tier, inputs; replaces with confirm flag | FR-010/011 |
| StopActivity | — | active assignment exists | FR-010 |
| CollectSummary | — | acknowledges pending EventSummary | FR-014 |
| PlaceOrder | side, itemId, qty, unitPrice, durationHrs | presence at settlement; escrow available | FR-032 |
| CancelOrder | orderId | owner; order open | FR-036 |
| DispatchCaravan | routeId, manifest[], mitigation? | weight ≤ capacity; slot free; costs payable | FR-040/041/043 |
| TravelTo | routeId | not already traveling; halts assignment (confirm flag) | FR-044 |
| ExpandStorage | settlementId | progression cost payable | FR-023 |

### Queries (read-only snapshots)

| Query | Returns | Spec |
|---|---|---|
| GetCharacter | character sheet: skills/levels/xp, wallet, location, assignment, caravan slots | FR-002 |
| GetStorage | settlementId → slots, capacity | FR-022/023 |
| GetActivities | activities at current settlement, with lock state + reasons | FR-015 |
| GetMarket | per item at current settlement: best bid/ask, depth, recent trades — **presence-gated** | FR-031/035 |
| GetMyOrders | own orders across settlements with status | FR-032 |
| GetRoutes | routes from current settlement: durations, risk, costs | FR-045 |
| GetShipments | own caravans with progress + ETA | FR-042 |
| GetTransactions | paged audit log | FR-052 |
| GetSummary | pending offline/event summary | FR-014 |

`GetMarket` only answers for the character's current settlement (plus arrival snapshots a
caravan/visit produced) — price discovery elsewhere is gameplay (FR-035).

### Events (push)

| Event | When | Spec |
|---|---|---|
| ActionCompleted | each completed action (batched under catch-up) | FR-012 |
| SkillLeveled | level/tier threshold crossed; lists unlocks | FR-015 |
| ActivityHalted | inputs exhausted / storage full / travel | FR-016 |
| OrderFilled / OrderPartiallyFilled / OrderExpired / OrderCancelled | order lifecycle; includes proceeds & tax | FR-033/034/036 |
| CaravanArrived | timer completes; includes risk outcome detail | FR-042/043 |
| TravelArrived | personal travel completes | FR-044 |
| SummaryReady | offline catch-up finished; summary payload | FR-014 |
| StateInvalidated | V2 reconciliation: optimistic change rejected; carries correction + reason | Principle IX |
| WalletChanged / StorageChanged | coarse-grained refresh hints for GUI subscriptions | — |

### Interaction classification (Principle IX — binding for all screens)

| Class | Interactions | V1 behavior | V2 behavior |
|---|---|---|---|
| local-immediate | navigation, browsing queries, opening detail views | instant | instant (cached snapshot + refresh) |
| optimistic-with-reconciliation | AssignActivity, StopActivity, CancelOrder, TravelTo, CollectSummary | applied instantly | applied instantly; `StateInvalidated` rolls back visibly |
| server-confirmed-with-pending | PlaceOrder fills, DispatchCaravan outcomes, market matching | resolved by local engine within the same tick (feels instant) | placement optimistic; fills/outcomes arrive as events with per-operation pending badges |

No interaction may block the UI on a round-trip. There is no "blocks the UI" class.

### Versioning

The contract package is semver'd. Additive changes (new optional fields, new events) are MINOR;
anything breaking is MAJOR and requires LocalTransport, RemoteTransport, and client updates in
the same change. V2 handshake includes contract version; mismatch prompts a client refresh.

## Part II — Combat Core (former 002) — PROTOCOL PENDING

The combat core's commands, queries, and events (expeditions, loadouts, tactics editing,
tap-to-cast) were never contracted in the former spec set. Drafting this section is the first
work item of the combat milestone. Until then, references from Parts III/IV into combat-core
requirements (e.g. FR-181/182 control-mode behavior, equip gates) bind against the combat
spec directly.

## Part III — Challenge & Group Layer (former 003)

Extends Part I — same `GameTransport` interface, same async command/ack/event discipline,
same serializability rules. Nothing here introduces a new transport concept; this section
adds the challenge commands, queries, events, and their Principle IX classification.
Additive to the contract package (MINOR per the Part I versioning policy).

### Commands (afflictions)

| Command | Payload | Key validations | Spec |
|---|---|---|---|
| EnterTrial | trialId | unlock gates (prior clear + character tier); advisory gear warning ack | FR-210/211 |
| CreateGroupListing | formatId, roleNeeds[], plannedStart | at settlement with format; not already listed | FR-220 |
| JoinGroupListing | listingId, role? | slot open; qualification gates for target format | FR-220/223 |
| LeaveParty / DisbandParty | — | membership; leader-only for disband | FR-220 |
| EnterInstance | partyId \| solo, formatRef | full gates; roster within size; no boss active for backfill joins | FR-221/224 |
| SubmitAnswer | instanceId, mechanicId, answerId, windowOffsetMs | window + grace; answer available to character | FR-201/203 |
| TriggerAbility / SwitchStance / UseProvision | instanceId, ref | active mode; off cooldown / available | FR-203 (FR-181) |
| SetControlMode | instanceId, mode: active \| auto | participant in instance | FR-203 (FR-182) |
| RecruitBackfill | instanceId, listingId | leader; no boss fight active | FR-224 |
| CallRun | instanceId | leader; ends instance, banks haul (no-ruin) | FR-204/224 |
| CreateRaidSignup | raidDefId, scheduledAt, roleReqs, readinessHints | leader/company rights | FR-231 |
| RespondToSignup | signupId, status: commit \| decline \| waitlist | invitee | FR-231 |
| JoinEvent | eventInstanceId | present in region; one-tap | FR-241 |
| EngageEliteEnemy | zoneId, encounterRef | spawns party-isolated instance; solo honesty warning ack | FR-240 |
| SignUpForDefense | invasionId, stationId | roster cap; slot open | FR-250 |
| ContributeRepair | settlementId, materials \| coin \| labor | degradation active | FR-251 |

Error codes added: `QUALIFICATION_MISSING`, `TIER_TOO_LOW`, `ROSTER_FULL`, `BOSS_FIGHT_ACTIVE`,
`ANSWER_WINDOW_CLOSED`, `NOT_LEADER`, `ALREADY_IN_INSTANCE`, `ONLINE_VERSION_ONLY` (V1
response for multiplayer formats — honest labeling, FR-262).

### Queries (read-only snapshots)

| Query | Returns | Spec |
|---|---|---|
| GetTrialLadder | trials with lock state, requirements, recommended gear band, personal bests | FR-210/211 |
| GetEncounterJournal | mechanics seen: telegraphs, windows, answers, outcomes | FR-202 |
| GetGroupBoard | listings (incl. backfill) at settlement + cross-settlement when sparse | FR-220, edge cases |
| GetInstanceState | live HUD snapshot: phase, boss, active mechanics + windows, participants | FR-201/203 |
| GetAfflictionRotation | this week's dungeons, modifier stacks, counter-mappings, per-level gates | FR-223/272 |
| GetLeaderboard | dungeonId, week → ranked scores (recognition only) | FR-223 |
| GetRaidSignups | own/visible signups with commitments and waitlist | FR-231 |
| GetRegionBoard | event spawns, world-boss windows, elite zones, route-risk effects | FR-241/242 |
| GetWarboard | threat meter, scheduled invasion, roster/stations, degradations + repair state | FR-250/251 |
| GetContribution | own ContributionRecord per resolved instance, factors + weights disclosed | FR-264 |
| InspectGearItem | instance: gear score, modifiers, derived grade, durability, counters | FR-270–272 |

### Events (push)

| Event | When | Spec |
|---|---|---|
| InstanceStarted / InstanceEnded | lifecycle; end carries outcome, haul, scores, bracket, loot | FR-204/210/223 |
| PhaseChanged | phase entry | FR-201 |
| TelegraphRaised | mechanic opens; carries window end + available answers | FR-201/202 |
| AnswerResolved | answer (or window expiry) resolves; outcome + log attribution | FR-202, US1-AS3 |
| CooperativeProgress | partial answers received on a cooperative mechanic | FR-221 |
| ControlModeChanged | auto-AI takeover/handback (incl. disconnect takeover) | FR-203, SC-203 |
| RosterChanged | join/backfill/leave; loot-eligibility presence list updated | FR-224 |
| LeadershipTransferred | grace elapsed or reclaim | FR-224 |
| RotationPublished | weekly affliction rotation + counter-mappings | FR-223/272 |
| EventSpawned / EventResolved | eruption events; resolved carries contribution payouts | FR-241 |
| BossWindowPosted / BossResolved | world boss schedule + resolution with floor application | FR-242 |
| ThreatChanged / InvasionScheduled / InvasionResolved | meter ticks, warboard posting, outcome + degradations or boon | FR-250/251 |
| FacilityRestored | repair or self-restore completes | FR-251 |
| StateInvalidated | (Part I) optimistic rejection — carries correction + reason | Principle IX |

### Interaction classification (Principle IX — binding for all screens)

| Class | Interactions | V1 behavior | V2 behavior |
|---|---|---|---|
| local-immediate | journals, ladders, boards, leaderboards, rotation, gear inspection, warboard browsing | instant | instant (cached snapshot + refresh) |
| optimistic-with-reconciliation | listings/join/leave, signup responses, control-mode toggle, station signup | applied instantly | applied instantly; `StateInvalidated` rolls back visibly |
| optimistic-with-reconciliation (windowed) | SubmitAnswer, TriggerAbility, SwitchStance, UseProvision in active mode | resolve locally same encounter tick | applied at tap; server accepts within window + grace (default 1 s, authored); late/rejected answers roll back with reason |
| server-confirmed-with-pending | loot rolls, run completion, scores/brackets, event/boss/invasion resolution, repair completion | resolved by local engine same tick (feels instant) | per-operation pending badge; result events |

The windowed class is the active-mode rule (research R4, challenge): the client owns the
countdown display, the server owns validity; authored windows are ≥ 4 s so network latency
never decides an outcome. No interaction may block the UI on a round-trip; there is no
"blocks the UI" class.

### V1 / V2 behavior

Every multiplayer-only command returns `ONLINE_VERSION_ONLY` in V1 with the honest label
payload (FR-262) — the client renders the format, its rules, and its rewards, with the
online-version badge. Mettle-trial commands work identically in both versions. The contract
itself is identical in both; only the host differs (research R3, challenge).

## Part IV — Relics & Delves (former 004)

Extends Part I and Part III — same `GameTransport`, same async command/ack/event discipline,
same serializability rules. Additive to the contract package (MINOR per the Part I
versioning policy). Floor combat inside descents reuses the Part III encounter
commands/queries/events (`SubmitAnswer`, `GetInstanceState`, `TelegraphRaised`, …)
unchanged; this section adds only what is new.

### Commands

| Command | Payload | Key validations | Spec |
|---|---|---|---|
| EquipRelic | itemInstanceId, slot | combat-core equip gates + equip-limit category check; conflict returns swap offer | FR-302 |
| SwapRelic | unequipInstanceId, equipInstanceId | the guided one-tap conflict resolution | FR-302 |
| ConfirmAwakeningStep | itemInstanceId | owns relic; deed counters met; materials in local storage; atomic consume+unseal | FR-304 |
| LockRelicModifier | itemInstanceId, slot, gearModifierId | slot unsealed + empty-or-relock cost paid; craft-mod materials consumed (FR-271 path); never the signature | FR-305 |
| EnterDelve | siteId, partyId \| solo, mode: random \| weekly-expedition | live session; party 1–3; under-size honesty warning ack beyond band | FR-310/311/315 |
| RespondReadyCheck | descentId, response: ready \| opt-out | at-landing; member of descent; opt-out pays own ledger | FR-312 |
| CallLandingDecision | descentId, decision: withdraw \| descend | leader only; ready-check complete; pool value + next-floor preview already disclosed | FR-312 |
| AbandonDescent | descentId | mid-floor: forfeits own unbanked ledger; at landing: equals opt-out | FR-313, edge cases |

Trade/escrow/shipping commands are unchanged (relics flow through economy-core/combat-core
trade as ordinary gear); their delivery validation gains the recipient-ownership check
(research R1, relic/delve). Error codes added: `RELIC_ALREADY_OWNED` (trade delivery blocked
with explanation, before any payment), `RELIC_LIMIT_EXCEEDED` (carries conflicting item id
for the swap offer), `AWAKENING_DEED_INCOMPLETE`, `AWAKENING_MATERIALS_MISSING`,
`SIGNATURE_MODIFIER_IMMUTABLE`, `NOT_AT_LANDING`, `READY_CHECK_PENDING`,
`ONLINE_VERSION_ONLY` (Part III — reused for multiplayer-source labeling).

### Queries (read-only snapshots)

| Query | Returns | Spec |
|---|---|---|
| GetRelicCompendium | every relic: name, tier, signature modifier in full, equip category, disclosed source (+ V1 honest label), awakening overview, duplicate compensation, own ownership/awakening state | FR-303/307, US1-AS1 |
| GetAwakeningTrack | per owned relic: each step's deed requirement, material cost, unseal target, current deed counters and step | FR-304, US2-AS1 |
| GetDelveSites | sites with region, party scaling + bounds, difficulty/multiplier curves, stake rules, session expectation, weekly seed status | FR-310–312/315 |
| GetDescentState | live: depth, floor state ref (Part III instance), ledgers (own share value), landing state when at-landing | FR-312/313 |
| GetDepthRecords | own per-site personal bests | FR-314 |
| GetDepthLeaderboard | siteId, isoWeek → ranked best depths (recognition only; ties share rank) | FR-315 |

`InspectGearItem` (Part III) now also returns relic awakening state and the signature
modifier's inert flag when the school is respecced away (research R10, relic/delve).

### Events (push)

| Event | When | Spec |
|---|---|---|
| RelicGranted | source pays first copy; carries grant record + compendium ownership update | FR-303, US1-AS2 |
| DuplicateCompensated | source completed while grant record exists | FR-303, US1-AS5 |
| AwakeningStepCompleted | slot unsealed; carries new item state | FR-304 |
| RelicModifierLocked | lock/re-lock resolved; carries derived quality grade | FR-305 |
| DescentStarted / DescentEnded | lifecycle; end carries outcome (withdrawn/wiped/abandoned), paid ledgers, forfeited value, depth, records touched | FR-312–314 |
| FloorCleared | floor end; carries ledger accruals + next-floor preview | FR-313 |
| LandingReached | enters at-landing; carries pool value, next multiplier/difficulty, ready-check open | FR-312 |
| ReadyCheckUpdated | member responses incl. opt-outs (with their ledger payout) | FR-312 |
| MemberExited | opt-out or abandonment resolved; party scaling recomputed | FR-312/313 |
| DepthRecordSet / LeaderboardPosted | personal best / weekly best updates | FR-314/315 |
| StateInvalidated | (Part I) optimistic rejection — correction + reason | Principle IX |

Part III encounter events flow unchanged during floors. Leadership transfer at landings uses
Part III's `LeadershipTransferred`.

### Interaction classification (Principle IX — binding for all screens)

| Class | Interactions | V1 behavior | V2 behavior |
|---|---|---|---|
| local-immediate | compendium, awakening track browsing, site browsing, depth records, leaderboards, gear inspection | instant | instant (cached snapshot + refresh) |
| optimistic-with-reconciliation | EquipRelic/SwapRelic, RespondReadyCheck, market listing of relics | applied instantly | applied instantly; `StateInvalidated` rolls back visibly |
| optimistic-with-reconciliation (windowed) | floor combat inputs | Part III rule unchanged | Part III rule unchanged |
| server-confirmed-with-pending | ConfirmAwakeningStep, LockRelicModifier, relic trade delivery, CallLandingDecision, ledger payouts, DescentEnded resolution | resolved by local engine same tick (feels instant) | per-operation pending badge; result events |

Awakening confirmation and landing decisions are server-confirmed because they consume
materials / settle stakes — but the pending state is scoped to the confirming control;
browsing and other interactions stay responsive. No interaction blocks the UI; there is no
"blocks the UI" class.

### V1 / V2 behavior

Solo descents and mettle-trial relic sources are fully live in V1 (FR-307/318): the same
descent reducer runs in `LocalGameHost`. Multiplayer descents and multiplayer-source
relics return/render `ONLINE_VERSION_ONLY` honest labels (FR-262 pattern) — visible,
never silently absent. The contract is identical in both versions; only the host differs
(research R3, challenge).

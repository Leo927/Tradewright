# Contract: Relic & Delve Protocol (extension of Game Protocol)

**Date**: 2026-06-11 | **Plan**: [../plan.md](../plan.md) | **Package**: `@tradewright/contract` (`relics/`, `delve/`)

Extends [001's game protocol](../../001-idle-economy-mmo/contracts/game-protocol.md) and
[003's challenge protocol](../../003-challenge-group-combat/contracts/challenge-protocol.md) —
same `GameTransport`, same async command/ack/event discipline, same serializability rules.
Additive to the contract package (MINOR per the 001 versioning policy). Floor combat inside
descents reuses the 003 encounter commands/queries/events (`SubmitAnswer`,
`GetInstanceState`, `TelegraphRaised`, …) unchanged; this document adds only what is new.

## Commands

| Command | Payload | Key validations | Spec |
|---|---|---|---|
| EquipRelic | itemInstanceId, slot | 002 equip gates + equip-limit category check; conflict returns swap offer | FR-302 |
| SwapRelic | unequipInstanceId, equipInstanceId | the guided one-tap conflict resolution | FR-302 |
| ConfirmAwakeningStep | itemInstanceId | owns relic; deed counters met; materials in local storage; atomic consume+unseal | FR-304 |
| LockRelicModifier | itemInstanceId, slot, gearModifierId | slot unsealed + empty-or-relock cost paid; craft-mod materials consumed (003 FR-271 path); never the signature | FR-305 |
| EnterDelve | siteId, partyId \| solo, mode: random \| weekly-expedition | live session; party 1–3; under-size honesty warning ack beyond band | FR-310/311/315 |
| RespondReadyCheck | descentId, response: ready \| opt-out | at-landing; member of descent; opt-out pays own ledger | FR-312 |
| CallLandingDecision | descentId, decision: withdraw \| descend | leader only; ready-check complete; pool value + next-floor preview already disclosed | FR-312 |
| AbandonDescent | descentId | mid-floor: forfeits own unbanked ledger; at landing: equals opt-out | FR-313, edge cases |

Trade/escrow/shipping commands are unchanged (relics flow through 001/002 trade as
ordinary gear); their delivery validation gains the recipient-ownership check (research
R1). Error codes added: `RELIC_ALREADY_OWNED` (trade delivery blocked with explanation,
before any payment), `RELIC_LIMIT_EXCEEDED` (carries conflicting item id for the swap
offer), `AWAKENING_DEED_INCOMPLETE`, `AWAKENING_MATERIALS_MISSING`,
`SIGNATURE_MODIFIER_IMMUTABLE`, `NOT_AT_LANDING`, `READY_CHECK_PENDING`,
`ONLINE_VERSION_ONLY` (003 — reused for multiplayer-source labeling).

## Queries (read-only snapshots)

| Query | Returns | Spec |
|---|---|---|
| GetRelicCompendium | every relic: name, tier, signature modifier in full, equip category, disclosed source (+ V1 honest label), awakening overview, duplicate compensation, own ownership/awakening state | FR-303/307, US1-AS1 |
| GetAwakeningTrack | per owned relic: each step's deed requirement, material cost, unseal target, current deed counters and step | FR-304, US2-AS1 |
| GetDelveSites | sites with region, party scaling + bounds, difficulty/multiplier curves, stake rules, session expectation, weekly seed status | FR-310–312/315 |
| GetDescentState | live: depth, floor state ref (003 instance), ledgers (own share value), landing state when at-landing | FR-312/313 |
| GetDepthRecords | own per-site personal bests | FR-314 |
| GetDepthLeaderboard | siteId, isoWeek → ranked best depths (recognition only; ties share rank) | FR-315 |

`InspectGearItem` (003) now also returns relic awakening state and the signature
modifier's inert flag when the school is respecced away (research R10).

## Events (push)

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
| StateInvalidated | (001) optimistic rejection — correction + reason | Principle IX |

003 encounter events flow unchanged during floors. Leadership transfer at landings uses
003's `LeadershipTransferred`.

## Interaction classification (Principle IX — binding for all screens)

| Class | Interactions | V1 behavior | V2 behavior |
|---|---|---|---|
| local-immediate | compendium, awakening track browsing, site browsing, depth records, leaderboards, gear inspection | instant | instant (cached snapshot + refresh) |
| optimistic-with-reconciliation | EquipRelic/SwapRelic, RespondReadyCheck, market listing of relics | applied instantly | applied instantly; `StateInvalidated` rolls back visibly |
| optimistic-with-reconciliation (windowed) | floor combat inputs | 003 rule unchanged | 003 rule unchanged |
| server-confirmed-with-pending | ConfirmAwakeningStep, LockRelicModifier, relic trade delivery, CallLandingDecision, ledger payouts, DescentEnded resolution | resolved by local engine same tick (feels instant) | per-operation pending badge; result events |

Awakening confirmation and landing decisions are server-confirmed because they consume
materials / settle stakes — but the pending state is scoped to the confirming control;
browsing and other interactions stay responsive. No interaction blocks the UI; there is no
"blocks the UI" class.

## V1 / V2 behavior

Solo descents and mettle-trial relic sources are fully live in V1 (FR-307/318): the same
descent reducer runs in `LocalGameHost`. Multiplayer descents and multiplayer-source
relics return/render `ONLINE_VERSION_ONLY` honest labels (003 FR-262 pattern) — visible,
never silently absent. The contract is identical in both versions; only the host differs
(003 research R3).

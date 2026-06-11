# Contract: Challenge Protocol (extension of Game Protocol)

**Date**: 2026-06-11 | **Plan**: [../plan.md](../plan.md) | **Package**: `@tradewright/contract` (`challenge/`)

Extends [001's game protocol](../../001-idle-economy-mmo/contracts/game-protocol.md) — same
`GameTransport` interface, same async command/ack/event discipline, same serializability
rules. Nothing here introduces a new transport concept; this document adds the challenge
commands, queries, events, and their Principle IX classification. Additive to the contract
package (MINOR per the 001 versioning policy).

## Commands (afflictions)

| Command | Payload | Key validations | Spec |
|---|---|---|---|
| EnterTrial | trialId | unlock gates (prior clear + character tier); advisory gear warning ack | FR-210/211 |
| CreateGroupListing | formatId, roleNeeds[], plannedStart | at settlement with format; not already listed | FR-220 |
| JoinGroupListing | listingId, role? | slot open; qualification gates for target format | FR-220/223 |
| LeaveParty / DisbandParty | — | membership; leader-only for disband | FR-220 |
| EnterInstance | partyId \| solo, formatRef | full gates; roster within size; no boss active for backfill joins | FR-221/224 |
| SubmitAnswer | instanceId, mechanicId, answerId, windowOffsetMs | window + grace; answer available to character | FR-201/203 |
| TriggerAbility / SwitchStance / UseProvision | instanceId, ref | active mode; off cooldown / available | FR-203 (002 FR-181) |
| SetControlMode | instanceId, mode: active \| auto | participant in instance | FR-203 (002 FR-182) |
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

## Queries (read-only snapshots)

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

## Events (push)

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
| StateInvalidated | (001) optimistic rejection — carries correction + reason | Principle IX |

## Interaction classification (Principle IX — binding for all screens)

| Class | Interactions | V1 behavior | V2 behavior |
|---|---|---|---|
| local-immediate | journals, ladders, boards, leaderboards, rotation, gear inspection, warboard browsing | instant | instant (cached snapshot + refresh) |
| optimistic-with-reconciliation | listings/join/leave, signup responses, control-mode toggle, station signup | applied instantly | applied instantly; `StateInvalidated` rolls back visibly |
| optimistic-with-reconciliation (windowed) | SubmitAnswer, TriggerAbility, SwitchStance, UseProvision in active mode | resolve locally same encounter tick | applied at tap; server accepts within window + grace (default 1 s, authored); late/rejected answers roll back with reason |
| server-confirmed-with-pending | loot rolls, run completion, scores/brackets, event/boss/invasion resolution, repair completion | resolved by local engine same tick (feels instant) | per-operation pending badge; result events |

The windowed class is the active-mode rule (research R4): the client owns the countdown
display, the server owns validity; authored windows are ≥ 4 s so network latency never
decides an outcome. No interaction may block the UI on a round-trip; there is no
"blocks the UI" class.

## V1 / V2 behavior

Every multiplayer-only command returns `ONLINE_VERSION_ONLY` in V1 with the honest label
payload (FR-262) — the client renders the format, its rules, and its rewards, with the
online-version badge. Mettle-trial commands work identically in both versions. The contract
itself is identical in both; only the host differs (research R3).

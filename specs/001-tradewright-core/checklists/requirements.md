# Specification Quality Checklist: Tradewright — Core Game

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-11
**Feature**: [spec.md](../spec.md)

Merged 2026-06-11 from the former specs 001/002/003/004 requirement checklists (spec collapse).

## Economy Core (former 001)

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

### Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

### Notes

- Zero [NEEDS CLARIFICATION] markers: scope-significant unknowns (shared world vs simulated,
  offline cap, risk model, presence rules for orders) were resolved with documented defaults in
  the spec's Assumptions section. Revisit via `/speckit-clarify` if any default is wrong.
- Phase 2 (territory control) is explicitly out of scope and needs its own spec.
- "Authoritative time" (FR-017) is stated as a behavioral requirement (clock manipulation must
  not grant progress), not an implementation prescription.

## Combat Core (former 002)

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

### Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

### Notes

- Revised 2026-06-11 per user direction: New World-style build depth (active abilities/magic,
  mastery + two-branch perk trees, respec) is IN scope; only action-based execution (aiming,
  dodging, reflex input) is removed. Tactics rules are the automation replacement; optional
  tap-to-cast must never beat what tactics can express (FR-166/SC-108). Re-validated: all
  items still pass.
- Zero [NEEDS CLARIFICATION] markers. Scope-significant defaults documented in Assumptions:
  combat occupies the single activity slot; no-death retreat model; 2 schools/3 ability slots
  at launch; PvP and group combat out of scope. Revisit via `/speckit-clarify` if any default
  is wrong.
- This spec supersedes the economy core's blanket combat exclusion (the economy core's scope
  boundary updated in the same change); the economy core's permanent exclusion of
  action/dexterity gameplay remains binding.
- FR numbering starts at FR-101 to avoid collision with the economy core's FR-001..062 —
  cross-references between the layers are explicit.
- Dependency: this layer extends the economy core's systems (activity slot, offline rules,
  items/markets/caravans, audit log) and cannot be implemented standalone.

## Challenge & Group Layer (former 003)

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

### Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

### Notes

- Format decisions were made interactively with the user on 2026-06-11 (research of New
  World's formats → keep/cut per format): ALL PvE formats kept; ALL PvP formats cut
  (Tradewright is PvE-only); active control = live tactical control with auto-AI fallback.
  No [NEEDS CLARIFICATION] markers were needed as a result.
- The combat core was amended in the same change: control modes (FR-180–184), SC-108 parity
  scope narrowed to standard content, scope boundary now points here.
- FR numbering starts at FR-201 (the economy core uses 001–062, the combat core uses 101–184).
- Dependency: builds on the combat core and the economy core; multiplayer formats require the
  online version (V2); mettle trials (solo boss trials) work in solo V1.

## Relics & Delves (former 004)

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

### Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

### Notes

- All items pass. Zero [NEEDS CLARIFICATION] markers: every open question was resolved with
  an informed default recorded in Assumptions, consistent with the conventions established
  by the former specs 001–003.
- Strongest candidate for `/speckit-clarify`: relic tradability. The spec defaults to
  character-bound relics (mirroring the inspiration; preserves the trophy identity), which
  introduces Tradewright's first bound item class — a deliberate, narrow divergence from the
  all-goods-trade norm. The decision is isolated to FR-303 if reversed.
- Secondary clarify candidates: the relic equip limit (defaulted to one weapon/focus + one
  armor/trinket) and the landing decision protocol (defaulted to leader-calls-after-
  ready-check with AI auto-withdraw).
- The delve stake model is a mandated redesign, not an open question: FR-204 (no-ruin)
  required replacing the inspiration's extraction-style loot loss before this mode could be
  specified.

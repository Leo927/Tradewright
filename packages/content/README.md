# @tradewright/content — authoring guidelines

Authored game content: mechanics under `data/`, display text under `text/`,
Zod schemas under `schemas/`. The engine consumes validated, typed definitions;
the client consumes text catalogs. Neither side embeds content (constitution
Principle IV).

## Rules

1. **All text is original** (FR-024). Structure may follow genre conventions
   (recipe-tree shapes, XP-curve shapes, tier gating); expression may not.
   Every name, description, and string is checked against the inspiration-term
   denylist (`tests/denylist.json`) — in **every** locale (FR-024/071).
2. **No copied numeric tables.** Curves and rates are derived from this game's
   own pacing targets (SC-006/007), never transcribed from inspiration games.
3. **IDs and text keys are immutable once shipped.** Saves reference content
   ids and catalogs reference text keys; renaming a thing changes its text,
   never its id or key.
4. **Mechanics files carry no display text** (content-schema Part V).
   `data/*.json` holds ids, refs, numbers, and enums only. Every
   name/description lives in `text/<locale>/…` keyed `<defId>.<field>`.
5. **`en` is the authoring locale.** Every key originates in `text/en/`; other
   locales translate it. A key absent from `en` is an orphan and fails
   validation.
6. **Messages use ICU MessageFormat** for placeholders and plural/select
   rules. Every locale preserves its base message's placeholder set.
7. **Generated pseudo-locales** (`text/pseudo-expand/`, `text/pseudo-cjk/`)
   come from `npm run gen:pseudo`. Never hand-edit or commit them.
8. **Removing shipped content** that live saves may reference requires a
   migration note and a deprecation path.

`npm run validate:content` (repo root) runs every gate: schema validity,
referential integrity, world integrity, originality denylist, and the text
gates (coverage, placeholder parity, orphans).

# Design: Settings — Language (v1)

**Screen**: `settings` (`apps/client/src/screens/settings.tssx` → `settings.tsx`)
**Story**: US0 (P0) — Play in Your Own Language (FR-070–078, SC-012)
**Status**: v1 — language selection only; notification preferences join in T107
(storage-settings design artifact).

## Primary task vs deferred depth (Principle VIII)

- **Primary task**: see the current language and switch it in one tap.
- **Deferred depth**: notification preferences (T107 extension, separate
  section added later). Nothing else lives here in v1.

## Layout (390×844 portrait)

```
┌──────────────────────────────┐
│ ‹ Back        Settings       │   header: back button + screen title
├──────────────────────────────┤
│ LANGUAGE                     │   section label (ui key settings.language)
│ ┌──────────────────────────┐ │
│ │ English               ✓  │ │   one row per status:shipped locale
│ └──────────────────────────┘ │
│ (device-language note)       │   only when device language unsupported
└──────────────────────────────┘
```

## Content & behavior

- **Locale list**: every `status: shipped` locale from `text/locales.json`,
  listed by **endonym** (the language's name in itself — FR-072). Validation
  locales (`pseudo-*`) never appear in the player-facing list.
- **Current locale** is marked with a check (`aria-pressed="true"` on the row
  button; visible check glyph).
- **Selection** dispatches `SetDisplayLocale` optimistically and re-renders
  the entire GUI from catalogs immediately (local-immediate class — the GUI
  never waits on the ack; SC-012 < 2 s). No restart, no confirmation dialog.
- **Unsupported device language**: when no shipped locale matches the device
  language, a one-line note (ui key `settings.language.device-unsupported`)
  explains the app fell back to its base language. Informational only.
- All labels are `ui.json` keys under the `settings.*` namespace.

## States

| State | Treatment |
|---|---|
| current locale | check mark, `aria-pressed=true` |
| other locales | plain row, tap to switch |
| device language unsupported | note under the list |

## Test hooks

- Screen container: `data-screen="settings"`.
- Locale row: `data-testid="locale-{id}"`.

# Design: Storage & Settings (v1)

**Screens**: `storage` (`apps/client/src/screens/storage.tsx`),
`settings` (`apps/client/src/screens/settings.tsx` — notification extension)
**Story**: Polish (FR-023, FR-037, FR-064) — builds on US0's settings screen
(design/settings-language.md) and US1's storage model.

## Primary task vs deferred depth (Principle VIII)

- **Primary task** (storage): see how full local storage is and what each item
  weighs against capacity. Expanding capacity is the one action.
- **Deferred depth** (storage): the cost curve and the facility-tier cap are
  disclosed at the expansion control, not on the first glance.
- **Primary task** (settings): pick a language (US0). Notification opt-ins are a
  second, clearly separated section below language.
- **Deferred depth** (settings): per-category honesty notes (online-only
  categories, the iOS installed-PWA requirement) sit with each toggle.

## Layout — storage (390×844)

```
┌──────────────────────────────┐
│ ‹ Back   Storage    [wallet]  │
│ Brackwater · 1,240 / 4,000    │  used / capacity (weight units)
│ ▓▓▓▓░░░░░░░░░░░░░░░░░░░░       │  capacity gauge
│ Pinewood        ×120          │  per-item holdings
│ Tin Bar         ×40           │
│ ── Expand storage ──          │
│ +2,000 capacity · 200 ¤       │  next level's gain + escalating cost (FR-023)
│ [Expand]                      │
│ (at max: "Storage here is at  │  facility-tier cap disclosure (FR-037)
│  its limit for this town.")   │
└──────────────────────────────┘
```

- **Expansion** (FR-023): each purchase adds `capacityPerLevel` for an escalating
  cost `costBase × costGrowth^level`, charged as a `storage-expansion` sink in
  the ledger. The cost and capacity gain are disclosed on the button before
  confirm.
- **Facility-tier cap** (FR-037): expansion is capped at the settlement's storage
  facility tier. At the cap the control is replaced by a plain note; the engine
  also rejects with `EXPANSION_CAPPED` as a backstop.
- Reached from the home screen's storage section (`manage-storage`), so the
  bottom nav stays uncrowded.

## Layout — settings (notification extension)

```
┌──────────────────────────────┐
│ ‹ Back   Settings             │
│ Language  ⟨…US0 section…⟩      │
│ ── Notifications ──           │
│ ☐ Caravan arrived             │  all categories OFF by default (FR-064)
│ ☐ Rest is over (offline cap)  │
│ ☐ Market update               │
│ ☑ Commitment approaching      │  online-only category, labeled honestly
│   "Online version only."      │
│ Note: on iPhone, install the  │  honest capability note (research R15)
│ app to receive notifications. │
└──────────────────────────────┘
```

- **Categories** come from `GetNotificationPrefs` (content-defined, FR-064);
  every category starts opted **out**. Toggling sends `SetNotificationPref`
  optimistically and persists across reloads.
- **Honesty** (FR-262 pattern): `onlineVersionOnly` categories
  (committed-start-approaching) are shown but labeled as online-version content;
  no V1 M1 moment fires them. A standing note states the iOS installed-PWA
  requirement for delivery.
- **Delivery** (T107): for opted-in categories the client schedules device
  notifications for the engine's known notifiable moments (caravan arrival, order
  expiry, offline cap), composing text from the category's `ui.json` template
  keys in the locale active at delivery time (FR-076). Delivery is best-effort in
  V1 (research R15).

## Test hooks

`data-screen="storage"`; `storage-capacity`, `stored-{itemId}`, `expand-storage`,
`expansion-cost`, `expansion-capped`; on home: `manage-storage`.
`data-screen="settings"`; `notify-toggle-{categoryId}`,
`notify-online-only-{categoryId}`, `notify-ios-note`.

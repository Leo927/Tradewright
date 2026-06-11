# Quickstart & Validation Guide: Tradewright Phase 1

**Date**: 2026-06-11 | **Plan**: [plan.md](./plan.md)

How to run, test, and validate the feature end-to-end. Commands here are the same ones CI runs
(constitution Principle II) — if it passes locally it must pass in CI.

## Prerequisites

- Node.js 22 LTS, npm 10+
- First E2E run: `npx playwright install --with-deps chromium`

## Commands

| Action | Command | Notes |
|---|---|---|
| Install | `npm install` | workspace root |
| Run V1 (solo) | `npm run dev` | Vite dev server; open phone viewport in devtools |
| Unit tests | `npm test` | Vitest: engine + content + contract + adapters |
| E2E tests | `npm run test:e2e` | Playwright, 390×844 viewport, V1 LocalTransport |
| Boundary check | `npm run check` | typecheck + lint + dependency-cruiser (Gate 3) |
| Content validation | `npm run validate:content` | schema + world-integrity gates |
| Production build | `npm run build` | client PWA bundle |
| Run V2 server (M2) | `npm run dev:server` | Fastify + WebSocket; client mode picker shows Online |
| V2 E2E (M2) | `npm run test:e2e:online` | same flow specs, RemoteTransport against local server |

Test-time control: E2E and unit tests drive the engine's injected clock (research R6/R9) —
"wait 2 hours" is a clock call, never a sleep.

## Validation scenarios (map to spec user stories)

**US1 — Begin Life as a Settler**: `npm run dev` → create character, pick settlement, assign a
tier-1 gathering activity. Expect: progress bar cycles at the activity's stated action time;
storage count and skill XP tick up exactly per action. E2E: `tests/e2e/skilling.spec.ts`.

**US2 — Return After Time Away**: with an activity running, advance the test clock 8 h, reload.
Expect: summary modal reports actions = ⌊8 h ÷ action time⌋, matching items/XP; cap behavior at
> 24 h states the cap; storage-full mid-absence shows halt time and reason. E2E:
`tests/e2e/offline.spec.ts`.

**US3 — Refine and Craft**: with gathered inputs in local storage, assign a refining activity,
then craft a finished good needing outputs of two skills. Expect: inputs consumed at stated
ratios; missing-input assignment is rejected with exact shortfall; cross-settlement materials
are unusable. E2E: `tests/e2e/crafting.spec.ts`.

**US4 — Trade at the Local Market**: at the trading post, place a sell order (goods escrow),
then a buy order that crosses it. Expect: fill at best price, tax deducted and disclosed,
goods/coin land correctly, order book in a *different* settlement never shows the listing.
NPC drift check: buy out NPC sell depth for an item; its quote rises next market tick. E2E:
`tests/e2e/market.spec.ts`.

**US5 — Haul Goods Between Settlements**: buy low in town A, dispatch a caravan to town B
(weight, duration, risk, costs shown pre-confirm), advance clock past arrival, travel character
to B, sell high. Expect: end-to-end profit = price spread − taxes − fees − dispatch − risk
losses; UI never blocks during transit; second dispatch beyond slot limit explains itself. E2E:
`tests/e2e/caravan.spec.ts`.

**Economic integrity (cross-cutting)**: engine property tests assert conservation (no
duplication/loss) across randomized trade/caravan/halt sequences — see data-model invariant 1,
SC-010.

## Definition of "feature validated"

1. `npm run check`, `npm test`, `npm run validate:content`, `npm run test:e2e` all green locally
   and in CI on the same commit.
2. All five story scenarios above pass as Playwright specs at phone viewport.
3. Offline ≡ online determinism test passes (same inputs, tick-replay vs live, identical state).
4. (M2) The same five flow specs pass against the server via `npm run test:e2e:online`,
   proving the V1/V2 contract swap (constitution Principle V architecture test).

import { describe, expect, it } from 'vitest';
import { content } from '../src/index.js';
import { checkAsymmetryBudget } from '../src/gates.js';
import type { ActivityDef, ItemDef } from '../src/index.js';

/**
 * Joint economy model (T110, research R16) — the deterministic green/red gate
 * for SC-006 and SC-007 over the launch content snapshot.
 *
 * Behavior model: two greedy-rational archetypes earning over a healthy world
 * (all settlements/routes active, NPC faucet at authored values). PRODUCERS
 * gather → refine → craft locally and sell finished goods to the NPC market;
 * HAULERS buy a good where the NPC sells it cheapest and sell it where the NPC
 * buys it dearest, across a route. Because launch NPC quotes are a deterministic
 * function of authored content (stock-pressure off seeded equilibrium, R4), the
 * archetypes' best steady-state income is computed in closed form rather than by
 * sampling — same content snapshot ⇒ same verdict, with no seed noise. Every
 * tunable below is a named constant; changing one is a reviewed content decision.
 */

// ── Named model parameters ────────────────────────────────────────────────
const SECONDS_PER_DAY = 86_400;
const STARTING_COIN = 500; // equivalent investment (unused by closed form; recorded)
const PARITY_BAND = 0.5; // SC-007(b): hauler median within ±50% of producer median

const TAX = content.settlements[0]!.salesTaxRate;
const FEE = content.settlements[0]!.listingFeeRate;
const CARAVAN_CAPACITY = content.world.caravan.baseCapacityWeight;

const itemById = new Map<string, ItemDef>(content.items.map((i) => [i.id, i]));
const basePrice = (id: string): number => itemById.get(id)?.basePrice ?? 1;
const weight = (id: string): number => itemById.get(id)?.weight ?? 1;

// ── NPC quote model (mirrors npc/simulation.ts at seeded equilibrium) ──────
function settlementOf(settlementId: string) {
  return content.settlements.find((s) => s.id === settlementId)!;
}
function profileOf(settlementId: string) {
  return content.npcProfiles.find((p) => p.id === settlementOf(settlementId).npcProfileId);
}

/** NPC ask (player buys here) for an item the settlement's NPC stocks. */
function npcAsk(settlementId: string, itemId: string): number | null {
  const entry = profileOf(settlementId)?.entries.find((e) => e.itemId === itemId);
  if (!entry) return null;
  const quote = basePrice(itemId); // stock = equilibrium ⇒ quote = basePrice
  const buy = Math.round(quote * (1 - entry.orderBandWidth));
  return Math.max(buy + 1, Math.round(quote * (1 + entry.orderBandWidth)));
}

/** NPC bid (player sells here) — the better of the band buy and any floor buy. */
function npcBid(settlementId: string, itemId: string): number | null {
  const profile = profileOf(settlementId);
  if (!profile) return null;
  let bid: number | null = null;
  const entry = profile.entries.find((e) => e.itemId === itemId);
  if (entry) bid = Math.max(1, Math.round(basePrice(itemId) * (1 - entry.orderBandWidth)));
  const floor = profile.floorBuyList.find((f) => f.itemId === itemId);
  if (floor) bid = Math.max(bid ?? 0, floor.floorPrice);
  return bid;
}

// ── Producer income: best coin/day from a gather→refine→craft chain ────────
const recipeFor = new Map<string, ActivityDef>();
for (const a of content.activities) {
  for (const o of a.outputs) if (!recipeFor.has(o.itemId)) recipeFor.set(o.itemId, a);
}

/** Total action-seconds to make one unit of an item from raw gathering. */
function chainSeconds(itemId: string, seen = new Set<string>()): number {
  const recipe = recipeFor.get(itemId);
  if (!recipe || seen.has(itemId)) return 0;
  seen.add(itemId);
  const perUnit = recipe.actionSeconds / (recipe.outputs.find((o) => o.itemId === itemId)?.qty ?? 1);
  const inputs = recipe.inputs.reduce(
    (sum, inp) => sum + chainSeconds(inp.itemId, new Set(seen)) * inp.qty,
    0,
  );
  return perUnit + inputs;
}

/** A co-located producer can make item X at settlement S only if X's whole
 *  recipe chain is offered there (markets are per-settlement — FR-031 — so a
 *  producer sells at the local bid, never another town's). Cross-region finished
 *  goods are therefore a hauler's job, by SC-006 asymmetry — the point of trade. */
function producibleAt(itemId: string, settlementId: string, seen = new Set<string>()): boolean {
  const recipe = recipeFor.get(itemId);
  if (!recipe || seen.has(itemId)) return false;
  seen.add(itemId);
  const tags = new Set(settlementOf(settlementId).activityTags);
  if (!recipe.settlementTags.some((t) => tags.has(t))) return false;
  return recipe.inputs.every((inp) => producibleAt(inp.itemId, settlementId, new Set(seen)));
}

function producerIncomePerDay(): number {
  let best = 0;
  for (const s of content.settlements) {
    for (const item of content.items) {
      if (!producibleAt(item.id, s.id)) continue;
      const bid = npcBid(s.id, item.id);
      if (bid === null || bid <= 0) continue;
      const seconds = chainSeconds(item.id);
      if (seconds <= 0) continue;
      const unitsPerDay = SECONDS_PER_DAY / seconds;
      const netPerUnit = bid * (1 - TAX) - bid * FEE; // sale net of tax + listing fee
      best = Math.max(best, netPerUnit * unitsPerDay);
    }
  }
  return best;
}

// ── Hauler income: best route arbitrage coin/day ───────────────────────────
// Faucet-honest: a hauler's revenue is capped by the coin the destination NPC
// actually injects buying the good (its floor budget, FR-054) and by how much
// the caravan can move — never by an imagined unlimited bid. Cross-settlement
// arbitrage only ever comes from floor demand: same-item band quotes are flat
// at base price everywhere, so a band buy (0.9×) never beats another town's ask.
interface RouteProfit {
  routeId: string;
  itemId: string;
  profitPerCaravan: number;
  perDay: number;
}

function periodsPerDay(settlementId: string): number {
  const profile = profileOf(settlementId);
  const periodMinutes = (profile!.sweep.periodTicks * content.world.worldTickSeconds) / 60;
  return (SECONDS_PER_DAY / 60) / periodMinutes;
}

/** Coin/day the settlement's NPC floor injects buying this item (FR-054). */
function dailyFloorSpend(settlementId: string, itemId: string): number {
  const profile = profileOf(settlementId);
  if (!profile) return 0;
  if (!profile.floorBuyList.some((f) => f.itemId === itemId)) return 0;
  const perItem = profile.floorBudgetPerPeriod / profile.floorBuyList.length;
  return perItem * periodsPerDay(settlementId);
}

function bestRouteArbitrage(): RouteProfit | null {
  let best: RouteProfit | null = null;
  for (const route of content.routes) {
    const [a, b] = route.endpoints;
    const caravansPerDayMax = SECONDS_PER_DAY / (route.caravanMinutes * 60);
    for (const [from, to] of [
      [a, b],
      [b, a],
    ]) {
      for (const item of content.items) {
        const ask = npcAsk(from, item.id);
        const floor = profileOf(to)?.floorBuyList.find((f) => f.itemId === item.id);
        if (ask === null || !floor) continue;
        const capUnits = Math.floor(CARAVAN_CAPACITY / weight(item.id));
        if (capUnits <= 0) continue;
        const floorUnitsPerDay = dailyFloorSpend(to, item.id) / floor.floorPrice;
        const transportUnitsPerDay = capUnits * caravansPerDayMax;
        const unitsPerDay = Math.min(floorUnitsPerDay, transportUnitsPerDay);
        if (unitsPerDay <= 0) continue;
        const caravansUsed = Math.ceil(unitsPerDay / capUnits);
        const marginNet = floor.floorPrice * (1 - TAX - FEE) - ask;
        const riskLoss = route.riskChance * route.lossFraction * unitsPerDay * floor.floorPrice * (1 - TAX);
        const perDay = unitsPerDay * marginNet - caravansUsed * route.dispatchCost - riskLoss;
        if (!best || perDay > best.perDay) {
          best = { routeId: route.id, itemId: item.id, profitPerCaravan: perDay / caravansUsed, perDay };
        }
      }
    }
  }
  return best;
}

describe('joint economy model (T110, SC-006/007, research R16)', () => {
  it('SC-006: no settlement’s local resources produce > 60% of launch recipes', () => {
    expect(checkAsymmetryBudget(content)).toEqual([]);
  });

  it('SC-007(a): at least one route is post-tax, post-risk profitable', () => {
    const best = bestRouteArbitrage();
    expect(best).not.toBeNull();
    expect(best!.profitPerCaravan, `best route ${best?.routeId} (${best?.itemId})`).toBeGreaterThan(0);
  });

  it('SC-007(b): hauler income is within ±50% of producer income', () => {
    const producer = producerIncomePerDay();
    const hauler = bestRouteArbitrage()?.perDay ?? 0;
    expect(producer).toBeGreaterThan(0);
    const ratio = hauler / producer;
    expect(ratio, `hauler ${Math.round(hauler)} vs producer ${Math.round(producer)} /day`).toBeGreaterThanOrEqual(
      1 - PARITY_BAND,
    );
    expect(ratio).toBeLessThanOrEqual(1 + PARITY_BAND);
  });
});

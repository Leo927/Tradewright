import type { ContentIndex } from '@tradewright/content';
import type { GameEvent } from '@tradewright/contract';
import type { SaveGame } from '../world/state.js';
import { resolveActivityTick } from '../skills/activities.js';
import { runMarketTick } from '../market/matching.js';
import { runNpcTick } from '../npc/simulation.js';
import { resolveArrivals } from '../caravan/shipments.js';
import { resolveTravelTick } from '../world/travel.js';

export interface TickContext {
  content: ContentIndex;
  emit: (e: GameEvent) => void;
}

export function computeElapsedTicks(elapsedSeconds: number, tickSeconds: number): number {
  return Math.floor(elapsedSeconds / tickSeconds);
}

/** One world tick. Order matters: activity actions resolve before market and
 *  NPC processing, arrivals last — so halts, expiries, and deliveries
 *  interleave identically online and under catch-up replay (research R5). */
export function runTick(save: SaveGame, ctx: TickContext): void {
  save.tick += 1;
  resolveActivityTick(save, ctx);
  runMarketTick(save, ctx);
  if (save.tick % ctx.content.world.marketCadenceTicks === 0) {
    runNpcTick(save, ctx);
  }
  resolveArrivals(save, ctx);
  resolveTravelTick(save, ctx);
}

export interface FastForwardResult {
  ticksRun: number;
  capped: boolean;
}

/** Offline catch-up: replay elapsed ticks, capped at the authored offline cap
 *  — tick length and cap both come from WorldTuning, never hardcoded. */
export function fastForward(
  save: SaveGame,
  elapsedSeconds: number,
  ctx: TickContext,
): FastForwardResult {
  const { worldTickSeconds, offlineCapHours } = ctx.content.world;
  const capTicks = computeElapsedTicks(offlineCapHours * 3600, worldTickSeconds);
  const elapsedTicks = computeElapsedTicks(elapsedSeconds, worldTickSeconds);
  const ticksRun = Math.min(elapsedTicks, capTicks);
  for (let i = 0; i < ticksRun; i++) {
    runTick(save, ctx);
  }
  return { ticksRun, capped: elapsedTicks > capTicks };
}

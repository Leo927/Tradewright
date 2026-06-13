import type { ContentIndex } from '@tradewright/content';
import type { SaveGame, FaucetTelemetryPeriod } from '../world/state.js';

/** Telemetry period length for a settlement — the NPC sweep cadence, the natural
 *  accounting window for faucet/sink flow (FR-053). */
export function telemetryPeriodTicks(content: ContentIndex, settlementId: string): number {
  const settlement = content.settlements.find((s) => s.id === settlementId);
  const profile = content.npcProfiles.find((p) => p.id === settlement?.npcProfileId);
  return profile?.sweep.periodTicks ?? 30;
}

export function currentPeriodStart(content: ContentIndex, settlementId: string, tick: number): number {
  const period = telemetryPeriodTicks(content, settlementId);
  return Math.floor(tick / period) * period;
}

function periodFor(
  save: SaveGame,
  content: ContentIndex,
  settlementId: string,
  tick: number,
): FaucetTelemetryPeriod {
  const periodStartTick = currentPeriodStart(content, settlementId, tick);
  let entry = save.faucetTelemetry.find(
    (e) => e.settlementId === settlementId && e.periodStartTick === periodStartTick,
  );
  if (!entry) {
    entry = { settlementId, periodStartTick, faucetCoin: 0, sinkCoin: 0 };
    save.faucetTelemetry.push(entry);
  }
  return entry;
}

/** Records coin entering (faucet — NPC paying a player) and leaving (sink — fees,
 *  taxes, coin paid to the NPC) the player economy, per settlement per period. */
export function recordFaucetFlow(
  save: SaveGame,
  content: ContentIndex,
  settlementId: string,
  tick: number,
  faucetCoin: number,
  sinkCoin: number,
): void {
  if (faucetCoin === 0 && sinkCoin === 0) return;
  const entry = periodFor(save, content, settlementId, tick);
  entry.faucetCoin += faucetCoin;
  entry.sinkCoin += sinkCoin;
}

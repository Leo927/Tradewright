import type { ContentIndex } from '@tradewright/content';
import type { SaveGame, FaucetTelemetryPeriod } from '../world/state.js';

/** Read-side economy telemetry (FR-053): per-settlement faucet (coin entering
 *  the player economy) and sink (coin leaving it) flow, aggregated from the
 *  per-period counters recorded by the NPC simulation, for tuning. */
export interface SettlementFlowSummary {
  settlementId: string;
  faucetCoin: number;
  sinkCoin: number;
  netCoin: number;
  periods: FaucetTelemetryPeriod[];
}

export function settlementFlow(save: SaveGame, settlementId: string): SettlementFlowSummary {
  const periods = save.faucetTelemetry
    .filter((e) => e.settlementId === settlementId)
    .slice()
    .sort((a, b) => a.periodStartTick - b.periodStartTick);
  const faucetCoin = periods.reduce((sum, e) => sum + e.faucetCoin, 0);
  const sinkCoin = periods.reduce((sum, e) => sum + e.sinkCoin, 0);
  return { settlementId, faucetCoin, sinkCoin, netCoin: faucetCoin - sinkCoin, periods };
}

/** One summary per content settlement (settlements with no recorded flow report
 *  zeros) so a tuning pass sees the whole map at once. */
export function allSettlementFlows(save: SaveGame, content: ContentIndex): SettlementFlowSummary[] {
  return content.settlements.map((s) => settlementFlow(save, s.id));
}

export function flowForPeriod(
  save: SaveGame,
  settlementId: string,
  periodStartTick: number,
): FaucetTelemetryPeriod | null {
  return (
    save.faucetTelemetry.find(
      (e) => e.settlementId === settlementId && e.periodStartTick === periodStartTick,
    ) ?? null
  );
}

import type { SaveGame, NpcMarketState } from '../world/state.js';

/** The reserved NPC principal that owns faucet/liquidity orders on every book. */
export const NPC_OWNER = 'npc';

export function npcStateFor(
  save: SaveGame,
  settlementId: string,
  itemId: string,
): NpcMarketState | undefined {
  return save.npcStates.find((n) => n.settlementId === settlementId && n.itemId === itemId);
}

/** Player trades move the NPC's virtual stock (research R4): buying from the NPC
 *  depletes it (quote rises next tick), selling to it adds (quote falls). */
export function adjustNpcStock(
  save: SaveGame,
  settlementId: string,
  itemId: string,
  delta: number,
): void {
  const state = npcStateFor(save, settlementId, itemId);
  if (state) state.currentStock = Math.max(0, state.currentStock + delta);
}

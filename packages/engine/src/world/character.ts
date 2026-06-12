import type { ContentIndex } from '@tradewright/content';
import { nextId, getStorage, type SaveGame, type PlayerCharacter } from './state.js';
import { applyTransaction, EngineError } from './ledger.js';

export interface CreateCharacterInput {
  name: string;
  startSettlementId: string;
}

export function createCharacter(
  save: SaveGame,
  content: ContentIndex,
  input: CreateCharacterInput,
): PlayerCharacter {
  if (save.character) throw new EngineError('CHARACTER_EXISTS', 'one character per account');
  if (!content.settlements.some((s) => s.id === input.startSettlementId)) {
    throw new EngineError('NOT_FOUND', `unknown settlement ${input.startSettlementId}`);
  }
  const name = input.name.trim();
  if (name.length === 0) throw new EngineError('INVALID_ORDER', 'character name required');

  const character: PlayerCharacter = {
    id: nextId(save, 'char'),
    name,
    locationState: { kind: 'at', settlementId: input.startSettlementId },
    wallet: 0,
    skills: Object.fromEntries(content.skills.map((s) => [s.id, { xp: 0, level: 1 }])),
    assignment: null,
    caravanSlots: 1,
  };
  save.character = character;
  getStorage(save, input.startSettlementId);
  applyTransaction(save, { kind: 'starter-grant', coinDelta: content.world.starterCoin });
  return character;
}

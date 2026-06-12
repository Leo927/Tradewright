import type { ErrorCode, AckDetails } from '@tradewright/contract';
import { nextId, type SaveGame, type Transaction, type TransactionKind } from './state.js';

export class EngineError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: AckDetails,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

export interface TransactionInput {
  kind: TransactionKind;
  coinDelta: number;
  items?: { itemId: string; qty: number }[];
  settlementId?: string;
  refId?: string;
}

/** The single mutation path for coin, and the audit record for item flows:
 *  wallet never goes negative, every mutation appends a Transaction (FR-052). */
export function applyTransaction(save: SaveGame, input: TransactionInput): Transaction {
  const character = save.character;
  if (!character) throw new EngineError('NO_CHARACTER', 'no character exists');
  const balanceAfter = character.wallet + input.coinDelta;
  if (balanceAfter < 0) {
    throw new EngineError('INSUFFICIENT_FUNDS', `wallet ${character.wallet} cannot cover ${input.coinDelta}`, {
      requiredCoin: -input.coinDelta,
      availableCoin: character.wallet,
    });
  }
  const txn: Transaction = {
    id: nextId(save, 'txn'),
    characterId: character.id,
    kind: input.kind,
    coinDelta: input.coinDelta,
    balanceAfter,
    items: input.items ?? null,
    settlementId: input.settlementId ?? null,
    refId: input.refId ?? null,
    atTick: save.tick,
  };
  character.wallet = balanceAfter;
  save.transactions.push(txn);
  return txn;
}

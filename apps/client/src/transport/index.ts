import type { GameTransport } from '@tradewright/contract';

export type { GameTransport };

let active: GameTransport | null = null;

export function setTransport(t: GameTransport): void {
  active = t;
}

export function transport(): GameTransport {
  if (!active) throw new Error('transport not initialized');
  return active;
}

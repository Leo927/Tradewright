/** mulberry32 — tiny, fast, serializable as a single uint32 living in the
 *  save state (research R6: no Math.random anywhere in the engine). */
export type RngState = number;

export function rngNext(state: RngState): { value: number; state: RngState } {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: next };
}

export function rngFloat(state: RngState): { value: number; state: RngState } {
  return rngNext(state);
}

export function rngInt(state: RngState, maxExclusive: number): { value: number; state: RngState } {
  const r = rngNext(state);
  return { value: Math.floor(r.value * maxExclusive), state: r.state };
}

/** Draws from the save's embedded stream, advancing it. */
export function drawFloat(save: { rngState: RngState }): number {
  const r = rngNext(save.rngState);
  save.rngState = r.state;
  return r.value;
}

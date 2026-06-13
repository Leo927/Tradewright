/** All engine time flows through an injected clock (research R6); the engine
 *  itself never reads wall time. */
export interface Clock {
  /** Wall-clock epoch milliseconds, as the host believes them. */
  now(): number;
  /** Monotonic milliseconds where the host can provide them (research R8). */
  monotonic?(): number;
}

export function createManualClock(startMs = 0): Clock & { advance(ms: number): void; set(ms: number): void } {
  let current = startMs;
  let mono = 0;
  return {
    now: () => current,
    monotonic: () => mono,
    advance: (ms) => {
      current += ms;
      mono += ms;
    },
    set: (ms) => {
      current = ms;
      mono += 1;
    },
  };
}

/** V1 time integrity (research R8): negative elapsed clamps to zero — a clock
 *  set backwards grants nothing; forward jumps are accepted up to the offline
 *  cap by the fast-forward path. */
export function elapsedSecondsSince(save: { lastSeenWallClock: number | null }, nowMs: number): number {
  if (save.lastSeenWallClock === null) return 0;
  return Math.max(0, (nowMs - save.lastSeenWallClock) / 1000);
}

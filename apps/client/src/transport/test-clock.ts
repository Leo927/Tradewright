import type { Clock } from '@tradewright/engine';

declare global {
  interface Window {
    __twTestClock?: {
      advance(ms: number): void;
      set(epochMs: number): void;
      now(): number;
    };
  }
}

/** E2E time control (research R9): in dev builds the clock is offset-shiftable
 *  through `window.__twTestClock`; production builds get the bare wall clock —
 *  the hook code is eliminated with the dead `import.meta.env.DEV` branch. */
export function createClientClock(onShift?: () => void): Clock {
  if (import.meta.env.DEV) {
    let offset = 0;
    let pinned: number | null = null;
    const clock: Clock = { now: () => (pinned ?? Date.now()) + offset };
    window.__twTestClock = {
      advance(ms: number) {
        offset += ms;
        onShift?.();
      },
      set(epochMs: number) {
        pinned = epochMs;
        offset = 0;
        onShift?.();
      },
      now: () => clock.now(),
    };
    return clock;
  }
  return { now: () => Date.now() };
}

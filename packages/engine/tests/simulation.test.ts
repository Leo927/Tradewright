import { describe, expect, it } from 'vitest';
import { content } from '@tradewright/content';
import { rngNext, rngInt, rngFloat } from '../src/simulation/rng.js';
import { computeElapsedTicks, fastForward } from '../src/simulation/tick.js';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';

const SEED = 12345;

function newWorld() {
  const save = createSave(content, SEED);
  createCharacter(save, content, { name: 'Test', startSettlementId: 'settlement.thornholt' });
  return save;
}

describe('seeded PRNG (research R6)', () => {
  it('advances deterministically from a seed', () => {
    const a = rngNext(SEED);
    const b = rngNext(SEED);
    expect(a.value).toBe(b.value);
    expect(a.state).toBe(b.state);
  });

  it('restoring a state reproduces the sequence', () => {
    let s1 = SEED;
    const seq1: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = rngNext(s1);
      seq1.push(r.value);
      s1 = r.state;
    }
    const mid = rngNext(rngNext(SEED).state).state;
    const r3 = rngNext(mid);
    expect(r3.value).toBe(seq1[2]);
  });

  it('rngInt and rngFloat stay in range and advance state', () => {
    let state = SEED;
    for (let i = 0; i < 100; i++) {
      const int = rngInt(state, 6);
      expect(int.value).toBeGreaterThanOrEqual(0);
      expect(int.value).toBeLessThan(6);
      const float = rngFloat(int.state);
      expect(float.value).toBeGreaterThanOrEqual(0);
      expect(float.value).toBeLessThan(1);
      expect(float.state).not.toBe(state);
      state = float.state;
    }
  });
});

describe('tick scheduling (research R5)', () => {
  it('schedules ticks at the authored tick length', () => {
    const t = content.world.worldTickSeconds;
    expect(computeElapsedTicks(0, t)).toBe(0);
    expect(computeElapsedTicks(t - 1, t)).toBe(0);
    expect(computeElapsedTicks(t, t)).toBe(1);
    expect(computeElapsedTicks(5 * t + 1, t)).toBe(5);
  });

  it('fast-forward replays exactly the elapsed ticks', () => {
    const save = newWorld();
    const before = save.tick;
    const result = fastForward(save, 8 * 3600, { content, emit: () => {} });
    expect(result.ticksRun).toBe((8 * 3600) / content.world.worldTickSeconds);
    expect(result.capped).toBe(false);
    expect(save.tick).toBe(before + result.ticksRun);
  });

  it('caps fast-forward at the authored offline cap (1440 ticks at launch values)', () => {
    const save = newWorld();
    const result = fastForward(save, 48 * 3600, { content, emit: () => {} });
    const capTicks =
      (content.world.offlineCapHours * 3600) / content.world.worldTickSeconds;
    expect(capTicks).toBe(1440);
    expect(result.ticksRun).toBe(capTicks);
    expect(result.capped).toBe(true);
  });
});

describe('determinism (data-model invariant 4, SC-005)', () => {
  it('identical inputs produce identical state', () => {
    const a = newWorld();
    const b = newWorld();
    fastForward(a, 24 * 3600, { content, emit: () => {} });
    fastForward(b, 24 * 3600, { content, emit: () => {} });
    expect(a).toEqual(b);
  });

  it('engine sources never read wall time or ambient randomness', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = join(import.meta.dirname, '..', 'src');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (path.endsWith('.ts')) files.push(path);
      }
    };
    walk(root);
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/Date\.now\(\)/);
      expect(source, file).not.toMatch(/Math\.random\(\)/);
    }
  });
});

import { describe, expect, it } from 'vitest';
import type { CombatCurves } from '@tradewright/content';
import type { RewardTableDef } from '@tradewright/content';
import type { Combatant, CombatState } from '../../src/combat/types.js';
import {
  resolveCombatTick,
  type CombatantBuild,
  type ResolverContext,
} from '../../src/combat/resolver.js';

const curves: CombatCurves = {
  healthCurve: { base: 100, perUnitRate: 10 },
  attributeScaling: { base: 1, perUnitRate: 0, floor: 1 },
  masteryScaling: { base: 1, perUnitRate: 0, floor: 1 },
  armorMitigation: { base: 0, perUnitRate: 0, floor: 0, cap: 0.75 },
  threatFactors: { sustainFactor: 0.5 },
  recoveryMinutes: { base: 2, perUnitRate: 1 },
  retreatDurabilityPenalty: 5,
};

function combatant(ref: string, isEnemy: boolean, joinOrder: number, over: Partial<Combatant> = {}): Combatant {
  return {
    ref,
    isEnemy,
    health: 100,
    healthMax: 100,
    attributeTotals: {},
    armorPhys: 0,
    armorElem: 0,
    cooldowns: {},
    basicAttackCooldown: 0,
    effects: [],
    joinOrder,
    ...over,
  };
}

function playerBuild(over: Partial<CombatantBuild> = {}): CombatantBuild {
  return {
    ref: 'player',
    magnitudeMultiplier: 1,
    basicAttack: { intervalSeconds: 2, effects: [{ kind: 'damage', damageType: 'phys', target: 'enemy', magnitude: 10 }] },
    abilities: [],
    tactics: { rules: [] },
    actions: [],
    ...over,
  };
}

function inertEnemyBuild(ref = 'enemy', over: Partial<CombatantBuild> = {}): CombatantBuild {
  return { ref, magnitudeMultiplier: 1, basicAttack: null, abilities: [], tactics: null, actions: [], enemyId: ref, ...over };
}

function run(state: CombatState, ctx: ResolverContext, ticks: number) {
  const logs = [];
  const kills = [];
  for (let i = 0; i < ticks; i++) {
    const r = resolveCombatTick(state, ctx);
    logs.push(...r.logs);
    kills.push(...r.kills);
  }
  return { logs, kills };
}

describe('combat resolver — cadence', () => {
  it('basic attacks fire on their interval, not every tick', () => {
    const state: CombatState = { combatants: [combatant('player', false, 0), combatant('enemy', true, 1, { health: 1000, healthMax: 1000 })], threatTables: {}, tickCount: 0, rngState: 7 };
    const ctx: ResolverContext = { curves, builds: { player: playerBuild(), enemy: inertEnemyBuild() }, rewardTables: new Map() };
    run(state, ctx, 5); // interval 2 → attacks at ticks 1,3,5 = 3 hits × 10
    expect(state.combatants[1]!.health).toBe(1000 - 30);
  });

  it('slotted abilities respect their cooldown', () => {
    const state: CombatState = { combatants: [combatant('player', false, 0), combatant('enemy', true, 1, { health: 1000, healthMax: 1000 })], threatTables: {}, tickCount: 0, rngState: 7 };
    const ctx: ResolverContext = {
      curves,
      builds: {
        player: playerBuild({
          basicAttack: null,
          abilities: [{ id: 'ability.smash', cooldownSeconds: 3, effects: [{ kind: 'damage', damageType: 'phys', target: 'enemy', magnitude: 50 }], scales: false }],
          tactics: { rules: [{ abilityId: 'ability.smash', trigger: { kind: 'always' } }] },
        }),
        enemy: inertEnemyBuild(),
      },
      rewardTables: new Map(),
    };
    run(state, ctx, 6); // cd 3 → casts at ticks 1,4 = 2 × 50
    expect(state.combatants[1]!.health).toBe(1000 - 100);
  });
});

describe('combat resolver — threat targeting (FR-106/108)', () => {
  it('an enemy attacks the highest-threat foe; ties break by join order', () => {
    const state: CombatState = {
      combatants: [combatant('p0', false, 0, { health: 200, healthMax: 200 }), combatant('p1', false, 1, { health: 200, healthMax: 200 }), combatant('enemy', true, 2)],
      threatTables: { enemy: { p0: 10, p1: 50 } },
      tickCount: 0,
      rngState: 1,
    };
    const ctx: ResolverContext = {
      curves,
      builds: {
        p0: { ref: 'p0', magnitudeMultiplier: 1, basicAttack: null, abilities: [], tactics: { rules: [] }, actions: [] },
        p1: { ref: 'p1', magnitudeMultiplier: 1, basicAttack: null, abilities: [], tactics: { rules: [] }, actions: [] },
        enemy: { ref: 'enemy', magnitudeMultiplier: 1, basicAttack: null, abilities: [], tactics: null, actions: [{ intervalSeconds: 1, effects: [{ kind: 'damage', damageType: 'phys', target: 'enemy', magnitude: 20 }] }] },
      },
      rewardTables: new Map(),
    };
    run(state, ctx, 1);
    expect(state.combatants.find((c) => c.ref === 'p1')!.health).toBe(180); // higher threat hit
    expect(state.combatants.find((c) => c.ref === 'p0')!.health).toBe(200);

    state.threatTables = { enemy: { p0: 50, p1: 50 } }; // tie → lower join order
    run(state, ctx, 1);
    expect(state.combatants.find((c) => c.ref === 'p0')!.health).toBe(180);
  });

  it('damage accrues threat; healing accrues sustainFactor × healed', () => {
    const state: CombatState = {
      combatants: [combatant('healer', false, 0), combatant('ally', false, 1, { health: 50 }), combatant('enemy', true, 2, { health: 500, healthMax: 500 })],
      threatTables: {},
      tickCount: 0,
      rngState: 1,
    };
    const ctx: ResolverContext = {
      curves,
      builds: {
        healer: { ref: 'healer', magnitudeMultiplier: 1, basicAttack: null, abilities: [{ id: 'ability.mend', cooldownSeconds: 1, effects: [{ kind: 'heal', target: 'ally', magnitude: 20 }], scales: false }], tactics: { rules: [{ abilityId: 'ability.mend', trigger: { kind: 'always' } }] }, actions: [] },
        ally: { ref: 'ally', magnitudeMultiplier: 1, basicAttack: { intervalSeconds: 1, effects: [{ kind: 'damage', damageType: 'phys', target: 'enemy', magnitude: 10 }] }, abilities: [], tactics: { rules: [] }, actions: [] },
        enemy: inertEnemyBuild(),
      },
      rewardTables: new Map(),
    };
    run(state, ctx, 1);
    // ally dealt 10 damage → threat 10; healer healed 20 → threat 0.5×20 = 10
    expect(state.threatTables.enemy!.ally).toBe(10);
    expect(state.threatTables.enemy!.healer).toBe(10);
  });
});

describe('combat resolver — determinism + loot replay (SC-103, research R7)', () => {
  const lootTable: RewardTableDef = {
    id: 'reward.crawler',
    entries: [
      { kind: 'item', itemId: 'item.chitin', chance: 1, qty: { min: 1, max: 3 } },
      { kind: 'item', itemId: 'item.rare-ichor', chance: 0.5, qty: { min: 1, max: 1 } },
      { kind: 'gearDrop', gearDefId: 'gear.charm', chance: 0.5 },
    ],
  };

  function killScenario(seed: number) {
    const state: CombatState = { combatants: [combatant('player', false, 0), combatant('enemy', true, 1, { health: 10, healthMax: 10 })], threatTables: {}, tickCount: 0, rngState: seed };
    const ctx: ResolverContext = {
      curves,
      builds: { player: playerBuild({ basicAttack: { intervalSeconds: 1, effects: [{ kind: 'damage', damageType: 'phys', target: 'enemy', magnitude: 100 }] } }), enemy: inertEnemyBuild('enemy', { dropTableId: 'reward.crawler' }) },
      rewardTables: new Map([['reward.crawler', lootTable]]),
    };
    return run(state, ctx, 1);
  }

  it('identical inputs produce identical state and loot', () => {
    const a = killScenario(42);
    const b = killScenario(42);
    expect(a.kills).toEqual(b.kills);
    expect(a.logs).toEqual(b.logs);
    expect(a.kills).toHaveLength(1);
    expect(a.kills[0]!.loot.find((l) => l.itemId === 'item.chitin')).toBeDefined(); // chance 1
  });

  it('different seeds can yield different hauls', () => {
    const seeds = [1, 2, 3, 4, 5].map((s) => JSON.stringify(killScenario(s).kills[0]));
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });
});

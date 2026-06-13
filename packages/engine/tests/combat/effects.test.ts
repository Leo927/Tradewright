import { describe, expect, it } from 'vitest';
import type { CombatCurves, EffectExpr } from '@tradewright/content';
import type { Combatant, CombatState, TimedEffect } from '../../src/combat/types.js';
import {
  applyDamage,
  applyHeal,
  applyTimedEffect,
  damageVictimRefs,
  resolveTargets,
  scaleMagnitude,
  statMultiplier,
  tickEffects,
} from '../../src/combat/effects.js';

const curves: CombatCurves = {
  healthCurve: { base: 100, perUnitRate: 10 },
  attributeScaling: { base: 1, perUnitRate: 0.04, floor: 1 },
  masteryScaling: { base: 1, perUnitRate: 0.03, floor: 1 },
  armorMitigation: { base: 0, perUnitRate: 0.01, floor: 0, cap: 0.75 },
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

function state(): CombatState {
  return {
    combatants: [combatant('player', false, 0), combatant('ally', false, 1), combatant('enemy', true, 2)],
    threatTables: {},
    tickCount: 0,
    rngState: 1,
  };
}

/** Every effect kind, in every schema-allowed target shape, for SC-208 sweep. */
const allEffects: EffectExpr[] = [
  { kind: 'damage', damageType: 'phys', target: 'enemy', magnitude: 20 },
  { kind: 'damage', damageType: 'elem', target: 'self', magnitude: 5 },
  { kind: 'dot', damageType: 'phys', target: 'enemy', magnitude: 4, durationSeconds: 3 },
  { kind: 'dot', damageType: 'elem', target: 'self', magnitude: 2, durationSeconds: 2 },
  { kind: 'heal', target: 'self', magnitude: 30 },
  { kind: 'heal', target: 'ally', magnitude: 30 },
  { kind: 'heal', target: 'party', magnitude: 30 },
  { kind: 'hot', target: 'party', magnitude: 5, durationSeconds: 4 },
  { kind: 'buff', target: 'self', stat: 'attack-power', magnitude: 0.2, durationSeconds: 5, ref: 'effect.rage' },
  { kind: 'debuff', target: 'enemy', stat: 'armor-phys', magnitude: -0.3, durationSeconds: 5, ref: 'effect.sunder' },
  { kind: 'shield', target: 'self', magnitude: 40, durationSeconds: 5, ref: 'effect.ward' },
  { kind: 'modify-ability', target: 'self', param: 'cooldown', magnitude: -0.1 },
  { kind: 'threat-amp', target: 'self', magnitude: 0.5, durationSeconds: 5, ref: 'effect.taunt' },
  { kind: 'resource', target: 'self', magnitude: 1 },
];

describe('EffectExpr PvE-only audit (SC-208)', () => {
  it('no effect kind can name an ally/party combatant as a damage victim', () => {
    const s = state();
    for (const effect of allEffects) {
      const victims = damageVictimRefs(effect, 'player', s);
      for (const ref of victims) {
        const c = s.combatants.find((x) => x.ref === ref)!;
        // a victim is only ever the source (self-cost) or an enemy — never another player
        expect(c.ref === 'player' || c.isEnemy, `${effect.kind} targeted ${ref} as a victim`).toBe(true);
      }
    }
  });

  it('only damage/dot have victims at all; support effects never do', () => {
    const s = state();
    for (const effect of allEffects) {
      const victims = damageVictimRefs(effect, 'player', s);
      if (effect.kind === 'damage' || effect.kind === 'dot') {
        expect(victims.length).toBeGreaterThan(0);
      } else {
        expect(victims).toEqual([]);
      }
    }
  });
});

describe('target resolution (PvE semantics)', () => {
  it('resolves self/enemy/ally/party against living combatants', () => {
    const s = state();
    expect(resolveTargets({ kind: 'heal', target: 'self', magnitude: 1 }, 'player', s)).toEqual(['player']);
    expect(resolveTargets({ kind: 'damage', damageType: 'phys', target: 'enemy', magnitude: 1 }, 'player', s)).toEqual(['enemy']);
    expect(resolveTargets({ kind: 'heal', target: 'ally', magnitude: 1 }, 'player', s)).toEqual(['ally']);
    expect(resolveTargets({ kind: 'heal', target: 'party', magnitude: 1 }, 'player', s)).toEqual(['player', 'ally']);
  });

  it('skips dead combatants', () => {
    const s = state();
    s.combatants[1]!.health = 0; // ally down
    expect(resolveTargets({ kind: 'heal', target: 'party', magnitude: 1 }, 'player', s)).toEqual(['player']);
  });
});

describe('effect application is deterministic', () => {
  it('mitigates damage by the armor curve and is repeatable', () => {
    const target = combatant('enemy', true, 0, { armorPhys: 40, health: 200, healthMax: 200 });
    const dealt = applyDamage(target, 100, 'phys', curves); // 40 armor → 40% mitigation
    expect(dealt).toBeCloseTo(60, 6);
    expect(target.health).toBeCloseTo(140, 6);
  });

  it('shields absorb before health, oldest first', () => {
    const target = combatant('player', false, 0, { health: 100, healthMax: 100 });
    applyTimedEffect(target, { ref: 'effect.ward', kind: 'shield', sourceRef: 'player', magnitude: 40, remainingSeconds: 5, shieldRemaining: 40 });
    const dealt = applyDamage(target, 30, 'phys', curves);
    expect(dealt).toBe(0); // fully absorbed
    expect(target.effects[0]!.shieldRemaining).toBe(10);
    const dealt2 = applyDamage(target, 30, 'phys', curves); // 10 absorbed, 20 through
    expect(dealt2).toBe(20);
    expect(target.health).toBe(80);
  });

  it('heals are capped at max health', () => {
    const target = combatant('player', false, 0, { health: 90, healthMax: 100 });
    expect(applyHeal(target, 30, 1)).toBe(10);
    expect(target.health).toBe(100);
  });

  it('buff/debuff multipliers compose on a stat', () => {
    const c = combatant('player', false, 0);
    applyTimedEffect(c, { ref: 'a', kind: 'buff', sourceRef: 'player', magnitude: 0.2, remainingSeconds: 5, stat: 'attack-power' });
    applyTimedEffect(c, { ref: 'b', kind: 'buff', sourceRef: 'player', magnitude: 0.1, remainingSeconds: 5, stat: 'attack-power' });
    expect(statMultiplier(c, 'attack-power')).toBeCloseTo(1.2 * 1.1, 6);
    expect(statMultiplier(c, 'heal-power')).toBe(1);
  });

  it('scaleMagnitude honors the ability scaling flag', () => {
    expect(scaleMagnitude(100, 1.5, true)).toBe(150);
    expect(scaleMagnitude(100, 1.5, false)).toBe(100);
  });

  it('ticks HoT/DoT, attributes them to their source, and expires timers', () => {
    const target = combatant('enemy', true, 0, { health: 100, healthMax: 100 });
    applyTimedEffect(target, { ref: 'dot1', kind: 'dot', sourceRef: 'player', magnitude: 10, remainingSeconds: 2, damageType: 'phys' });
    const t1 = tickEffects(target, curves);
    expect(t1).toEqual([{ combatantRef: 'enemy', kind: 'dot', sourceRef: 'player', amount: 10 }]);
    expect(target.health).toBe(90);
    expect(target.effects[0]!.remainingSeconds).toBe(1);
    tickEffects(target, curves); // second tick → expires
    expect(target.health).toBe(80);
    expect(target.effects).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import type { Combatant, TacticsProgram } from '../../src/combat/types.js';
import { selectAbility, triggerHolds, type TacticsContext } from '../../src/combat/tactics.js';

function combatant(ref: string, isEnemy: boolean, over: Partial<Combatant> = {}): Combatant {
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
    joinOrder: isEnemy ? 9 : 0,
    ...over,
  };
}

function ctx(over: Partial<TacticsContext> = {}): TacticsContext {
  return {
    self: combatant('player', false),
    foes: [combatant('enemy', true)],
    allies: [],
    isExpeditionStart: false,
    isReady: () => true,
    ...over,
  };
}

describe('tactics trigger vocabulary (FR-166)', () => {
  it('always fires; at-expedition-start gated on the first tick', () => {
    expect(triggerHolds({ kind: 'always' }, ctx())).toBe(true);
    expect(triggerHolds({ kind: 'at-expedition-start' }, ctx({ isExpeditionStart: false }))).toBe(false);
    expect(triggerHolds({ kind: 'at-expedition-start' }, ctx({ isExpeditionStart: true }))).toBe(true);
  });

  it('self/enemy/ally health thresholds compare against percentages', () => {
    expect(triggerHolds({ kind: 'self-health-below', pct: 50 }, ctx({ self: combatant('player', false, { health: 40 }) }))).toBe(true);
    expect(triggerHolds({ kind: 'self-health-below', pct: 50 }, ctx({ self: combatant('player', false, { health: 60 }) }))).toBe(false);
    expect(triggerHolds({ kind: 'enemy-health-above', pct: 75 }, ctx({ foes: [combatant('enemy', true, { health: 80 })] }))).toBe(true);
    expect(triggerHolds({ kind: 'enemy-health-below', pct: 25 }, ctx({ foes: [combatant('enemy', true, { health: 20 })] }))).toBe(true);
    expect(triggerHolds({ kind: 'ally-health-below', pct: 50 }, ctx({ allies: [combatant('ally', false, { health: 30 })] }))).toBe(true);
    expect(triggerHolds({ kind: 'ally-health-below', pct: 50 }, ctx({ allies: [] }))).toBe(false);
  });

  it('buff-missing / debuff-present read combatant effects', () => {
    const guarded = combatant('player', false, { effects: [{ ref: 'effect.guard', kind: 'buff', sourceRef: 'player', magnitude: 0.1, remainingSeconds: 5, stat: 'armor-phys' }] });
    expect(triggerHolds({ kind: 'buff-missing', ref: 'effect.guard' }, ctx({ self: guarded }))).toBe(false);
    expect(triggerHolds({ kind: 'buff-missing', ref: 'effect.guard' }, ctx())).toBe(true);
    const sundered = combatant('enemy', true, { effects: [{ ref: 'effect.sunder', kind: 'debuff', sourceRef: 'player', magnitude: -0.3, remainingSeconds: 5, stat: 'armor-phys' }] });
    expect(triggerHolds({ kind: 'debuff-present', ref: 'effect.sunder' }, ctx({ foes: [sundered] }))).toBe(true);
    expect(triggerHolds({ kind: 'debuff-present', ref: 'effect.sunder' }, ctx())).toBe(false);
  });
});

describe('tactics selection — strict priority + readiness (FR-168)', () => {
  const program: TacticsProgram = {
    rules: [
      { abilityId: 'ability.finish', trigger: { kind: 'enemy-health-below', pct: 25 } },
      { abilityId: 'ability.heal', trigger: { kind: 'self-health-below', pct: 50 } },
      { abilityId: 'ability.cleave', trigger: { kind: 'always' } },
    ],
  };

  it('casts the highest-priority satisfied rule', () => {
    expect(selectAbility(program, ctx())).toBe('ability.cleave'); // only "always" holds
    expect(selectAbility(program, ctx({ self: combatant('player', false, { health: 40 }) }))).toBe('ability.heal');
    expect(selectAbility(program, ctx({ foes: [combatant('enemy', true, { health: 10 })] }))).toBe('ability.finish');
  });

  it('skips a satisfied rule whose ability is on cooldown, falling to the next', () => {
    const onCd = ctx({ foes: [combatant('enemy', true, { health: 10 })], isReady: (id) => id !== 'ability.finish' });
    expect(selectAbility(program, onCd)).toBe('ability.cleave');
  });

  it('returns null (→ basic attack) when no rule is satisfied and ready', () => {
    const emptyBuild: TacticsProgram = { rules: [{ abilityId: 'ability.finish', trigger: { kind: 'enemy-health-below', pct: 25 } }] };
    expect(selectAbility(emptyBuild, ctx())).toBeNull();
    expect(selectAbility({ rules: [] }, ctx())).toBeNull(); // empty-slot build
  });
});

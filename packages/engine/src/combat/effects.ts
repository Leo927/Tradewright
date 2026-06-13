import type { CombatCurves, EffectExpr, EffectStatRef } from '@tradewright/content';
import type { Combatant, CombatState, TimedEffect } from './types.js';
import { mitigationFraction } from './curves.js';

/**
 * Pure EffectExpr evaluator (research R8 combat). Resolves the closed effect
 * vocabulary over combat state. The PvE-only guarantee (SC-208) is structural:
 * `damageVictimRefs` can only ever return the source or enemies — never an
 * ally/party combatant. The schema forbids damage→ally/party, and this module
 * never widens it.
 */

/** Combatant refs an effect can land on as a DAMAGE VICTIM. Targets are
 *  faction-relative to the caster: a foe is anyone on the opposite side. Empty
 *  for any non-damaging kind; for damage/dot only {caster-self, foes}. This is
 *  the SC-208 surface: a player-cast effect can never name a same-faction
 *  combatant (an ally) as a victim — `'enemy'` resolves only to foes. */
export function damageVictimRefs(effect: EffectExpr, caster: Combatant, state: CombatState): string[] {
  if (effect.kind !== 'damage' && effect.kind !== 'dot') return [];
  if (effect.target === 'self') return [caster.ref];
  return state.combatants.filter((c) => c.isEnemy !== caster.isEnemy && c.health > 0).map((c) => c.ref);
}

/** All refs an effect lands on, per its target (PvE, faction-relative). */
export function resolveTargets(effect: EffectExpr, caster: Combatant, state: CombatState): string[] {
  const target = 'target' in effect ? effect.target : 'self';
  const living = state.combatants.filter((c) => c.health > 0);
  const isFoe = (c: Combatant) => c.isEnemy !== caster.isEnemy;
  switch (target) {
    case 'self':
      return [caster.ref];
    case 'enemy':
      return living.filter(isFoe).map((c) => c.ref);
    case 'ally':
      return living.filter((c) => !isFoe(c) && c.ref !== caster.ref).map((c) => c.ref);
    case 'party':
      return living.filter((c) => !isFoe(c)).map((c) => c.ref);
    default:
      return [];
  }
}

/** Base effect magnitude scaled by the caster's ability multiplier (or flat). */
export function scaleMagnitude(base: number, multiplier: number, scales: boolean): number {
  return scales ? base * multiplier : base;
}

/** Product of active buff/debuff multipliers on a combatant for one stat. A
 *  buff/debuff contributes (1 + magnitude); absent stat → neutral 1. */
export function statMultiplier(combatant: Combatant, stat: EffectStatRef): number {
  let m = 1;
  for (const e of combatant.effects) {
    if ((e.kind === 'buff' || e.kind === 'debuff') && e.stat === stat) m *= 1 + e.magnitude;
  }
  return Math.max(0, m);
}

/** Apply post-mitigation, post-shield damage to a combatant. Mutates health and
 *  shields; returns the health damage actually dealt (for threat). */
export function applyDamage(
  target: Combatant,
  rawAmount: number,
  damageType: 'phys' | 'elem',
  curves: CombatCurves,
): number {
  const baseArmor = damageType === 'phys' ? target.armorPhys : target.armorElem;
  const armorStat = damageType === 'phys' ? 'armor-phys' : 'armor-elem';
  const effectiveArmor = baseArmor * statMultiplier(target, armorStat);
  const mitigation = mitigationFraction(curves, effectiveArmor);
  const takenMult = statMultiplier(target, 'damage-taken');
  let amount = Math.max(0, rawAmount * (1 - mitigation) * takenMult);

  // shields absorb first, oldest-first deterministically
  for (const e of target.effects) {
    if (amount <= 0) break;
    if (e.kind === 'shield' && (e.shieldRemaining ?? 0) > 0) {
      const absorbed = Math.min(e.shieldRemaining!, amount);
      e.shieldRemaining! -= absorbed;
      amount -= absorbed;
    }
  }
  const dealt = Math.min(amount, target.health);
  target.health -= dealt;
  return dealt;
}

/** Apply a heal to a combatant, scaled by the healer's heal-power; capped at
 *  the target's max health. Returns the health actually restored. */
export function applyHeal(target: Combatant, rawAmount: number, healPowerMult: number): number {
  const amount = Math.max(0, rawAmount * healPowerMult);
  const before = target.health;
  target.health = Math.min(target.healthMax, target.health + amount);
  return target.health - before;
}

/** Push a timed effect (buff/debuff/hot/dot/shield/threat-amp) onto a target,
 *  replacing any same-ref effect (no unbounded stacking). */
export function applyTimedEffect(target: Combatant, effect: TimedEffect): void {
  const existing = target.effects.findIndex((e) => e.ref === effect.ref);
  if (existing >= 0) target.effects[existing] = effect;
  else target.effects.push(effect);
}

export interface EffectTick {
  combatantRef: string;
  kind: 'hot' | 'dot';
  sourceRef: string;
  amount: number;
}

/** Advance one combatant's timed effects by one combat second: apply HoT heals
 *  and DoT damage, decrement timers, drop expired/spent effects. Returns the
 *  per-tick heal/damage applications (the resolver attributes threat from them). */
export function tickEffects(target: Combatant, curves: CombatCurves): EffectTick[] {
  const ticks: EffectTick[] = [];
  for (const e of target.effects) {
    if (e.kind === 'hot') {
      const healed = applyHeal(target, e.magnitude, 1);
      if (healed > 0) ticks.push({ combatantRef: target.ref, kind: 'hot', sourceRef: e.sourceRef, amount: healed });
    } else if (e.kind === 'dot') {
      const dealt = applyDamage(target, e.magnitude, e.damageType ?? 'phys', curves);
      if (dealt > 0) ticks.push({ combatantRef: target.ref, kind: 'dot', sourceRef: e.sourceRef, amount: dealt });
    }
    e.remainingSeconds -= 1;
  }
  target.effects = target.effects.filter(
    (e) => e.remainingSeconds > 0 && !(e.kind === 'shield' && (e.shieldRemaining ?? 0) <= 0),
  );
  return ticks;
}

import type { Combatant, TacticsProgram, TacticsTrigger } from './types.js';

/**
 * The tactics engine (research R4 combat) — a pure selector the resolver calls
 * each tick. Strict rule order = priority; the highest-priority rule whose
 * trigger holds AND whose ability is ready (slotted, unlocked, off cooldown)
 * casts (FR-168). Returns null when no rule fires — the resolver then falls
 * back to a basic attack. This same selector is the auto AI everywhere.
 */

export interface TacticsContext {
  self: Combatant;
  /** Living foes, lowest join order first — index 0 is the primary target. */
  foes: Combatant[];
  /** Living same-faction members other than self. */
  allies: Combatant[];
  isExpeditionStart: boolean;
  /** Ready = slotted + unlocked + off cooldown. */
  isReady: (abilityId: string) => boolean;
}

function healthPct(c: Combatant): number {
  return c.healthMax > 0 ? (c.health / c.healthMax) * 100 : 0;
}

function hasEffect(c: Combatant, ref: string): boolean {
  return c.effects.some((e) => e.ref === ref);
}

export function triggerHolds(trigger: TacticsTrigger, ctx: TacticsContext): boolean {
  const primaryFoe = ctx.foes[0];
  switch (trigger.kind) {
    case 'always':
      return true;
    case 'at-expedition-start':
      return ctx.isExpeditionStart;
    case 'self-health-below':
      return healthPct(ctx.self) < trigger.pct;
    case 'enemy-health-above':
      return primaryFoe !== undefined && healthPct(primaryFoe) > trigger.pct;
    case 'enemy-health-below':
      return primaryFoe !== undefined && healthPct(primaryFoe) < trigger.pct;
    case 'ally-health-below':
      return ctx.allies.some((a) => healthPct(a) < trigger.pct);
    case 'buff-missing':
      return !hasEffect(ctx.self, trigger.ref);
    case 'debuff-present':
      return primaryFoe !== undefined && hasEffect(primaryFoe, trigger.ref);
    default:
      return false;
  }
}

/** The first rule (in priority order) whose trigger holds and whose ability is
 *  ready. Null → basic attack this tick. */
export function selectAbility(tactics: TacticsProgram, ctx: TacticsContext): string | null {
  for (const rule of tactics.rules) {
    if (triggerHolds(rule.trigger, ctx) && ctx.isReady(rule.abilityId)) return rule.abilityId;
  }
  return null;
}

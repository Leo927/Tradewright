import type { CombatCurves, EffectExpr } from '@tradewright/content';
import type { CombatLogEntryView } from '@tradewright/contract';
import type { RewardTableDef } from '@tradewright/content';
import { rngNext } from '../simulation/rng.js';
import type { Combatant, CombatState, TimedEffect } from './types.js';
import {
  applyDamage,
  applyHeal,
  applyTimedEffect,
  resolveTargets,
  scaleMagnitude,
  statMultiplier,
  tickEffects,
} from './effects.js';
import { selectAbility, type TacticsContext } from './tactics.js';

/** Fixed 1 s combat tick (research R1). 60 combat ticks per 60 s world tick. */
export const COMBAT_TICK_SECONDS = 1;

export interface ResolvedAbility {
  id: string;
  cooldownSeconds: number;
  effects: EffectExpr[];
  /** magnitudeScaling === 'attribute-mastery'. */
  scales: boolean;
}

/** Per-combatant behavior the resolver drives. Players cast via `tactics` over
 *  `abilities`; enemies fire fixed-interval `actions`. */
export interface CombatantBuild {
  ref: string;
  magnitudeMultiplier: number;
  basicAttack: { intervalSeconds: number; effects: EffectExpr[] } | null;
  abilities: ResolvedAbility[];
  tactics: import('./types.js').TacticsProgram | null;
  actions: { intervalSeconds: number; effects: EffectExpr[] }[];
  /** On death: drop-table + award metadata so the resolver can roll loot. */
  enemyId?: string;
  dropTableId?: string;
}

export interface ResolverContext {
  curves: CombatCurves;
  builds: Record<string, CombatantBuild>;
  rewardTables: Map<string, RewardTableDef>;
}

export interface CombatKill {
  ref: string;
  enemyId: string;
  loot: { itemId: string; qty: number }[];
  gearDefIds: string[];
}

export interface CombatTickResult {
  logs: CombatLogEntryView[];
  kills: CombatKill[];
}

const ACTION_TIMER_PREFIX = '__action_';

function healthPct(c: Combatant): number {
  return c.healthMax > 0 ? (c.health / c.healthMax) * 100 : 0;
}

function threatAmpMultiplier(c: Combatant): number {
  let m = 1;
  for (const e of c.effects) if (e.kind === 'threat-amp') m *= 1 + e.magnitude;
  return m;
}

function addThreat(state: CombatState, enemyRef: string, combatantRef: string, amount: number): void {
  const table = (state.threatTables[enemyRef] ??= {});
  table[combatantRef] = (table[combatantRef] ?? 0) + amount;
}

/** The foe an enemy attacks: highest threat, ties broken by stable join order
 *  (FR-106/108). With no threat yet, the lowest-join-order living foe. */
function selectThreatTarget(state: CombatState, enemy: Combatant): Combatant | undefined {
  const foes = state.combatants
    .filter((c) => c.isEnemy !== enemy.isEnemy && c.health > 0)
    .sort((a, b) => a.joinOrder - b.joinOrder);
  if (foes.length === 0) return undefined;
  const table = state.threatTables[enemy.ref] ?? {};
  let best = foes[0]!;
  let bestThreat = table[best.ref] ?? 0;
  for (const foe of foes) {
    const t = table[foe.ref] ?? 0;
    if (t > bestThreat) {
      best = foe;
      bestThreat = t;
    }
  }
  return best;
}

/** Apply one effect from `caster`, choosing single-target for offense and
 *  area for support; accumulate threat; emit log lines. */
function applyEffect(
  state: CombatState,
  ctx: ResolverContext,
  caster: Combatant,
  effect: EffectExpr,
  multiplier: number,
  scales: boolean,
  abilityId: string | null,
  logs: CombatLogEntryView[],
): void {
  const ampMult = threatAmpMultiplier(caster);
  const log = (kind: CombatLogEntryView['kind'], targetRef: string | null, effectKind: string | null, amount: number | null) =>
    logs.push({ atTick: state.tickCount, kind, sourceRef: caster.ref, targetRef, abilityId, itemId: null, effectKind, amount });

  switch (effect.kind) {
    case 'damage': {
      const target =
        effect.target === 'self'
          ? caster
          : caster.isEnemy
            ? selectThreatTarget(state, caster)
            : firstFoe(state, caster);
      if (!target) return;
      const dealt = applyDamage(target, scaleMagnitude(effect.magnitude, multiplier, scales), effect.damageType, ctx.curves);
      if (target.isEnemy) addThreat(state, target.ref, caster.ref, dealt * ampMult);
      log('damage', target.ref, `damage-${effect.damageType}`, dealt);
      break;
    }
    case 'dot': {
      const target = effect.target === 'self' ? caster : caster.isEnemy ? selectThreatTarget(state, caster) : firstFoe(state, caster);
      if (!target) return;
      applyTimedEffect(target, {
        ref: `dot.${abilityId ?? 'x'}.${caster.ref}`,
        kind: 'dot',
        sourceRef: caster.ref,
        magnitude: scaleMagnitude(effect.magnitude, multiplier, scales),
        remainingSeconds: effect.durationSeconds,
        damageType: effect.damageType,
      });
      log('debuff-applied', target.ref, `dot-${effect.damageType}`, null);
      break;
    }
    case 'heal': {
      const healPower = statMultiplier(caster, 'heal-power');
      for (const ref of resolveTargets(effect, caster, state)) {
        const target = state.combatants.find((c) => c.ref === ref)!;
        const healed = applyHeal(target, scaleMagnitude(effect.magnitude, multiplier, scales), healPower);
        if (healed > 0) for (const e of livingEnemiesOf(state, caster)) addThreat(state, e.ref, caster.ref, ctx.curves.threatFactors.sustainFactor * healed * ampMult);
        log('heal', ref, 'heal', healed);
      }
      break;
    }
    case 'hot': {
      for (const ref of resolveTargets(effect, caster, state)) {
        const target = state.combatants.find((c) => c.ref === ref)!;
        applyTimedEffect(target, { ref: `hot.${abilityId ?? 'x'}.${caster.ref}`, kind: 'hot', sourceRef: caster.ref, magnitude: scaleMagnitude(effect.magnitude, multiplier, scales), remainingSeconds: effect.durationSeconds });
        log('buff-applied', ref, 'hot', null);
      }
      break;
    }
    case 'shield': {
      for (const ref of resolveTargets(effect, caster, state)) {
        const target = state.combatants.find((c) => c.ref === ref)!;
        const amount = scaleMagnitude(effect.magnitude, multiplier, scales);
        applyTimedEffect(target, { ref: effect.ref, kind: 'shield', sourceRef: caster.ref, magnitude: amount, remainingSeconds: effect.durationSeconds, shieldRemaining: amount });
        log('shield-applied', ref, 'shield', amount);
      }
      break;
    }
    case 'buff': {
      for (const ref of resolveTargets(effect, caster, state)) {
        const target = state.combatants.find((c) => c.ref === ref)!;
        applyTimedEffect(target, { ref: effect.ref, kind: 'buff', sourceRef: caster.ref, magnitude: effect.magnitude, remainingSeconds: effect.durationSeconds, stat: effect.stat });
        log('buff-applied', ref, `buff-${effect.stat}`, null);
      }
      break;
    }
    case 'debuff': {
      const target = caster.isEnemy ? selectThreatTarget(state, caster) : firstFoe(state, caster);
      if (!target) return;
      applyTimedEffect(target, { ref: effect.ref, kind: 'debuff', sourceRef: caster.ref, magnitude: effect.magnitude, remainingSeconds: effect.durationSeconds, stat: effect.stat });
      log('debuff-applied', target.ref, `debuff-${effect.stat}`, null);
      break;
    }
    case 'threat-amp': {
      applyTimedEffect(caster, { ref: effect.ref, kind: 'threat-amp', sourceRef: caster.ref, magnitude: effect.magnitude, remainingSeconds: effect.durationSeconds });
      log('buff-applied', caster.ref, 'threat-amp', null);
      break;
    }
    case 'modify-ability':
    case 'resource':
      // self-only utility — applied as a transient (no persistent combat state
      // change needed for the launch ability set); logged for explainability.
      log('buff-applied', caster.ref, effect.kind, null);
      break;
  }
}

function firstFoe(state: CombatState, caster: Combatant): Combatant | undefined {
  return state.combatants
    .filter((c) => c.isEnemy !== caster.isEnemy && c.health > 0)
    .sort((a, b) => a.joinOrder - b.joinOrder)[0];
}

function livingEnemiesOf(state: CombatState, caster: Combatant): Combatant[] {
  return state.combatants.filter((c) => c.isEnemy !== caster.isEnemy && c.health > 0);
}

/** Roll a kill's loot from its drop table using the per-expedition RNG
 *  sub-stream (research R7) — advances `state.rngState`, so offline replay of
 *  the same seed yields the same haul. */
function rollLoot(state: CombatState, table: RewardTableDef | undefined): { loot: { itemId: string; qty: number }[]; gearDefIds: string[] } {
  const loot: { itemId: string; qty: number }[] = [];
  const gearDefIds: string[] = [];
  if (!table) return { loot, gearDefIds };
  for (const entry of table.entries) {
    const roll = rngNext(state.rngState);
    state.rngState = roll.state;
    if (roll.value >= entry.chance) continue;
    if (entry.kind === 'item') {
      const span = entry.qty.max - entry.qty.min + 1;
      const q = rngNext(state.rngState);
      state.rngState = q.state;
      loot.push({ itemId: entry.itemId, qty: entry.qty.min + Math.floor(q.value * span) });
    } else {
      gearDefIds.push(entry.gearDefId);
    }
  }
  return { loot, gearDefIds };
}

/**
 * The shared combat resolver — a pure reducer advancing `state` by one combat
 * second and returning the log lines + kills. Identical (state, ctx) always
 * produce identical results (mutating a structuredClone keeps the reducer
 * referentially honest for callers that need the prior state).
 */
export function resolveCombatTick(state: CombatState, ctx: ResolverContext): CombatTickResult {
  const logs: CombatLogEntryView[] = [];
  const kills: CombatKill[] = [];
  state.tickCount += 1;

  const ordered = [...state.combatants].sort((a, b) => a.joinOrder - b.joinOrder);

  // 1. Timed effects tick (HoT/DoT) and timers decrement.
  for (const c of ordered) {
    if (c.health <= 0) continue;
    const ticks = tickEffects(c, ctx.curves);
    for (const t of ticks) {
      if (t.kind === 'dot' && c.isEnemy) addThreat(state, c.ref, t.sourceRef, t.amount);
      logs.push({ atTick: state.tickCount, kind: t.kind === 'dot' ? 'damage' : 'heal', sourceRef: t.sourceRef, targetRef: c.ref, abilityId: null, itemId: null, effectKind: t.kind, amount: t.amount });
    }
  }

  // 2. Cooldowns decrement once per second.
  for (const c of ordered) {
    c.basicAttackCooldown = Math.max(0, c.basicAttackCooldown - COMBAT_TICK_SECONDS);
    for (const id of Object.keys(c.cooldowns)) c.cooldowns[id] = Math.max(0, (c.cooldowns[id] ?? 0) - COMBAT_TICK_SECONDS);
  }

  // 3. Each living combatant acts (stable join order).
  for (const c of ordered) {
    if (c.health <= 0) continue;
    const build = ctx.builds[c.ref];
    if (!build) continue;

    if (build.tactics) {
      // player-style: tactics ability, else basic attack
      const tacticsCtx: TacticsContext = {
        self: c,
        foes: state.combatants.filter((x) => x.isEnemy !== c.isEnemy && x.health > 0).sort((a, b) => a.joinOrder - b.joinOrder),
        allies: state.combatants.filter((x) => x.isEnemy === c.isEnemy && x.ref !== c.ref && x.health > 0),
        isExpeditionStart: state.tickCount === 1,
        isReady: (abilityId) => {
          const ab = build.abilities.find((a) => a.id === abilityId);
          return ab !== undefined && (c.cooldowns[abilityId] ?? 0) <= 0;
        },
      };
      const chosen = selectAbility(build.tactics, tacticsCtx);
      if (chosen) {
        const ability = build.abilities.find((a) => a.id === chosen)!;
        logs.push({ atTick: state.tickCount, kind: 'ability-cast', sourceRef: c.ref, targetRef: null, abilityId: chosen, itemId: null, effectKind: null, amount: null });
        for (const effect of ability.effects) applyEffect(state, ctx, c, effect, build.magnitudeMultiplier, ability.scales, chosen, logs);
        c.cooldowns[chosen] = ability.cooldownSeconds;
      } else if (build.basicAttack && c.basicAttackCooldown <= 0) {
        logs.push({ atTick: state.tickCount, kind: 'basic-attack', sourceRef: c.ref, targetRef: null, abilityId: null, itemId: null, effectKind: null, amount: null });
        for (const effect of build.basicAttack.effects) applyEffect(state, ctx, c, effect, build.magnitudeMultiplier, true, null, logs);
        c.basicAttackCooldown = build.basicAttack.intervalSeconds;
      }
    } else {
      // enemy-style: fixed-interval actions
      build.actions.forEach((action, i) => {
        const key = `${ACTION_TIMER_PREFIX}${i}`;
        if ((c.cooldowns[key] ?? 0) > 0) return;
        for (const effect of action.effects) applyEffect(state, ctx, c, effect, build.magnitudeMultiplier, true, null, logs);
        c.cooldowns[key] = action.intervalSeconds;
      });
    }
  }

  // 4. Resolve kills (after all actions this tick), rolling loot deterministically.
  for (const c of ordered) {
    if (c.isEnemy && c.health <= 0) {
      const build = ctx.builds[c.ref];
      const table = build?.dropTableId ? ctx.rewardTables.get(build.dropTableId) : undefined;
      const { loot, gearDefIds } = rollLoot(state, table);
      kills.push({ ref: c.ref, enemyId: build?.enemyId ?? c.ref, loot, gearDefIds });
      logs.push({ atTick: state.tickCount, kind: 'enemy-defeated', sourceRef: null, targetRef: c.ref, abilityId: null, itemId: null, effectKind: null, amount: null });
    }
  }

  return { logs, kills };
}

export { healthPct };

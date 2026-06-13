import { z } from 'zod';
import { slug, itemQty } from './common.js';

/** The closed `EffectExpr` vocabulary (data-model Part II, research R8 combat).
 *  Shared game-wide: abilities, perk passives, enemy actions, gear modifiers,
 *  provisions. Unknown fields are errors (`.strict()`); new kinds are engine +
 *  schema changes, never authoring improvisation. */

/** Targets are the SC-208 audit surface. Damage/DoT may only land on `enemy`
 *  or `self` (a self-cost) — **no player-as-victim target is representable**.
 *  Support effects (heal/hot/buff/shield) reach `self | ally | party`. */
const offensiveTarget = z.enum(['enemy', 'self']);
const supportTarget = z.enum(['self', 'ally', 'party']);
const enemyOnly = z.literal('enemy');
const selfOnly = z.literal('self');

const damageType = z.enum(['phys', 'elem']);

/** Closed stat vocabulary buffs/debuffs modify (a multiplier on the named stat). */
const statRef = z.enum(['attack-power', 'armor-phys', 'armor-elem', 'damage-taken', 'heal-power']);

const damageEffect = z
  .object({
    kind: z.literal('damage'),
    damageType,
    target: offensiveTarget,
    magnitude: z.number().positive(),
  })
  .strict();

const healEffect = z
  .object({
    kind: z.literal('heal'),
    target: supportTarget,
    magnitude: z.number().positive(),
  })
  .strict();

const hotEffect = z
  .object({
    kind: z.literal('hot'),
    target: supportTarget,
    magnitude: z.number().positive(),
    durationSeconds: z.number().int().positive(),
  })
  .strict();

const dotEffect = z
  .object({
    kind: z.literal('dot'),
    damageType,
    target: offensiveTarget,
    magnitude: z.number().positive(),
    durationSeconds: z.number().int().positive(),
  })
  .strict();

const buffEffect = z
  .object({
    kind: z.literal('buff'),
    target: supportTarget,
    stat: statRef,
    /** Multiplier delta — applied stat is multiplied by `1 + magnitude`. */
    magnitude: z.number(),
    durationSeconds: z.number().int().positive(),
    ref: slug,
  })
  .strict();

const debuffEffect = z
  .object({
    kind: z.literal('debuff'),
    target: enemyOnly,
    stat: statRef,
    magnitude: z.number(),
    durationSeconds: z.number().int().positive(),
    ref: slug,
  })
  .strict();

const shieldEffect = z
  .object({
    kind: z.literal('shield'),
    target: supportTarget,
    magnitude: z.number().positive(),
    durationSeconds: z.number().int().positive(),
    ref: slug,
  })
  .strict();

const modifyAbilityEffect = z
  .object({
    kind: z.literal('modify-ability'),
    target: selfOnly,
    param: z.enum(['cooldown', 'magnitude']),
    abilityId: slug.optional(),
    magnitude: z.number(),
  })
  .strict();

const threatAmpEffect = z
  .object({
    kind: z.literal('threat-amp'),
    target: selfOnly,
    magnitude: z.number().positive(),
    durationSeconds: z.number().int().positive(),
    ref: slug,
  })
  .strict();

const resourceEffect = z
  .object({
    kind: z.literal('resource'),
    target: selfOnly,
    /** Restores a provision-style resource pool (provision interaction). */
    magnitude: z.number().positive(),
  })
  .strict();

export const effectExpr = z.discriminatedUnion('kind', [
  damageEffect,
  healEffect,
  hotEffect,
  dotEffect,
  buffEffect,
  debuffEffect,
  shieldEffect,
  modifyAbilityEffect,
  threatAmpEffect,
  resourceEffect,
]);

export type EffectExpr = z.infer<typeof effectExpr>;
export type EffectStatRef = z.infer<typeof statRef>;

/** Repair-style cost shape reused by gear (kept here so effects + costs share
 *  the one item-qty primitive). */
export const materialsCost = z.array(itemQty);

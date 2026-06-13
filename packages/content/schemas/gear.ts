import { z } from 'zod';
import { slug, itemQty } from './common.js';
import { itemDef } from './items.js';
import { effectExpr } from './effects.js';

export const gearSlot = z.enum([
  'weapon-focus',
  'head',
  'chest',
  'hands',
  'legs',
  'feet',
  'trinket',
]);

const attributeGrant = z
  .object({ attributeId: slug, points: z.number().int() })
  .strict();

const armorRating = z
  .object({ phys: z.number().min(0), elem: z.number().min(0) })
  .strict();

/** GearDef extends ItemDef (tier/weight/basePrice) — an ordinary economy item
 *  (FR-123) that is also equippable, instanced gear (data-model Part II). */
export const gearDef = itemDef
  .extend({
    slot: gearSlot,
    /** weapon-focus only: which school it activates (matches SchoolDef.weaponFocusTag). */
    schoolTag: z.string().min(1).optional(),
    attributeGrants: z.array(attributeGrant),
    armorRating,
    modifierSlots: z.number().int().min(0),
    durabilityMax: z.number().int().positive(),
    wearPerFight: z.number().int().min(0),
    repairCost: z
      .object({
        coinPerPoint: z.number().int().min(0),
        materials: z.array(itemQty).optional(),
      })
      .strict(),
  })
  .strict()
  .refine((g) => (g.slot === 'weapon-focus') === (g.schoolTag !== undefined), {
    message: 'weapon-focus gear declares a schoolTag; other slots do not',
  });

/** ProvisionDef extends ItemDef — a craftable, fungible good that auto-consumes
 *  at player-configured thresholds (FR-121). */
export const provisionDef = itemDef
  .extend({
    kind: z.enum(['food', 'remedy']),
    restoreEffects: z.array(effectExpr).min(1),
    defaultThresholdPct: z.number().min(0).max(100),
    consumeCooldownSeconds: z.number().int().min(0),
  })
  .strict();

export const gearFile = z.array(gearDef);
export const provisionsFile = z.array(provisionDef);

export type GearDef = z.infer<typeof gearDef>;
export type ProvisionDef = z.infer<typeof provisionDef>;
export type GearSlot = z.infer<typeof gearSlot>;

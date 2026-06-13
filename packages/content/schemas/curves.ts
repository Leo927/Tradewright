import { z } from 'zod';

/** Authored curve expression (data-model Part II, research R8). Piecewise-linear
 *  over a single non-negative input variable: value starts at `base` and
 *  accumulates `perUnitRate` per input unit; `breakpoints` override the rate
 *  beyond a threshold; `floor`/`cap` clamp the output. Total over its domain —
 *  the resolver evaluates it and hard-codes no combat constant (FR-107). */
export const curveExpr = z
  .object({
    base: z.number(),
    perUnitRate: z.number(),
    breakpoints: z
      .array(z.object({ at: z.number().min(0), perUnitRate: z.number() }).strict())
      .optional(),
    floor: z.number().optional(),
    cap: z.number().optional(),
  })
  .strict();

/** One global def set (data-model Part II). Each derived combat stat is an
 *  authored curve, not a literal — gate 7 asserts all are present and total. */
export const combatCurves = z
  .object({
    /** Constitution-analog attribute points → health pool. */
    healthCurve: curveExpr,
    /** Summed scaling-attribute points → magnitude multiplier. */
    attributeScaling: curveExpr,
    /** School mastery level → magnitude multiplier. */
    masteryScaling: curveExpr,
    /** Armor rating (phys or elem) → mitigation fraction, capped below 1. */
    armorMitigation: curveExpr,
    /** Healing-to-threat weight (FR-108). */
    threatFactors: z.object({ sustainFactor: z.number().min(0) }).strict(),
    /** Enemy tier → recovery minutes after an expedition ends (FR-132). */
    recoveryMinutes: curveExpr,
    /** Extra durability points worn on retreat, beyond per-fight wear (FR-132). */
    retreatDurabilityPenalty: z.number().int().min(0),
  })
  .strict();

export type CurveExpr = z.infer<typeof curveExpr>;
export type CombatCurves = z.infer<typeof combatCurves>;

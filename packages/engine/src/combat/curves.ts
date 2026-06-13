import type { CombatCurves, CurveExpr } from '@tradewright/content';

/**
 * Pure CombatCurves evaluator (research R2 combat). Every derived combat stat is
 * an authored curve the engine evaluates — there is no hard-coded combat
 * constant anywhere in this module (FR-107; a literal constant is a review
 * reject). A CurveExpr is piecewise-linear over a single non-negative input.
 */
export function evalCurve(curve: CurveExpr, x: number): number {
  const input = Math.max(0, x);
  const bps = [...(curve.breakpoints ?? [])].sort((a, b) => a.at - b.at);
  let value = curve.base;
  let rate = curve.perUnitRate;
  let prevAt = 0;
  for (const bp of bps) {
    if (input <= bp.at) break;
    value += rate * (bp.at - prevAt);
    prevAt = bp.at;
    rate = bp.perUnitRate;
  }
  value += rate * (input - prevAt);
  if (curve.floor !== undefined) value = Math.max(curve.floor, value);
  if (curve.cap !== undefined) value = Math.min(curve.cap, value);
  return value;
}

/** Health pool from the Constitution-analog attribute points (FR-107). */
export function healthFromAttributes(curves: CombatCurves, vigorPoints: number): number {
  return evalCurve(curves.healthCurve, vigorPoints);
}

/** Magnitude multiplier = attributeScaling(scaling points) × masteryScaling(level). */
export function magnitudeMultiplier(
  curves: CombatCurves,
  scalingAttributePoints: number,
  masteryLevel: number,
): number {
  return (
    evalCurve(curves.attributeScaling, scalingAttributePoints) *
    evalCurve(curves.masteryScaling, masteryLevel)
  );
}

/** Mitigation fraction in [0, cap] from an armor rating (FR-107). */
export function mitigationFraction(curves: CombatCurves, armorRating: number): number {
  return evalCurve(curves.armorMitigation, armorRating);
}

/** Recovery minutes after an expedition ends, by enemy tier (FR-132). */
export function recoveryMinutes(curves: CombatCurves, enemyTier: number): number {
  return evalCurve(curves.recoveryMinutes, enemyTier);
}

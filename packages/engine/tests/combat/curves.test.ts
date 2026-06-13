import { describe, expect, it } from 'vitest';
import type { CombatCurves, CurveExpr } from '@tradewright/content';
import {
  evalCurve,
  healthFromAttributes,
  magnitudeMultiplier,
  mitigationFraction,
  recoveryMinutes,
} from '../../src/combat/curves.js';

describe('CombatCurves evaluator (FR-107 — authored, never a literal)', () => {
  it('evaluates a linear curve from its authored params, not a constant', () => {
    const a: CurveExpr = { base: 100, perUnitRate: 10 };
    const b: CurveExpr = { base: 100, perUnitRate: 20 };
    // output tracks the authored slope — two different curves diverge
    expect(evalCurve(a, 5)).toBe(150);
    expect(evalCurve(b, 5)).toBe(200);
    expect(evalCurve(a, 5)).not.toBe(evalCurve(b, 5));
  });

  it('clamps to authored floor and cap', () => {
    const curve: CurveExpr = { base: 0, perUnitRate: 0.01, floor: 0, cap: 0.75 };
    expect(evalCurve(curve, 0)).toBe(0);
    expect(evalCurve(curve, 50)).toBeCloseTo(0.5, 6);
    expect(evalCurve(curve, 1000)).toBe(0.75); // capped
    expect(evalCurve(curve, -5)).toBe(0); // input floored at 0, then output floor
  });

  it('applies piecewise breakpoints to change the rate beyond a threshold', () => {
    const curve: CurveExpr = {
      base: 0,
      perUnitRate: 2,
      breakpoints: [{ at: 10, perUnitRate: 1 }],
    };
    expect(evalCurve(curve, 10)).toBe(20); // 10 × 2
    expect(evalCurve(curve, 20)).toBe(30); // 20 + 10 × 1
  });

  it('is deterministic — identical inputs yield identical outputs', () => {
    const curve: CurveExpr = { base: 3, perUnitRate: 1.5, breakpoints: [{ at: 4, perUnitRate: 0.5 }] };
    for (let x = 0; x <= 20; x++) expect(evalCurve(curve, x)).toBe(evalCurve(curve, x));
  });
});

describe('derived combat stats read the curves (FR-107)', () => {
  const curves: CombatCurves = {
    healthCurve: { base: 120, perUnitRate: 12 },
    attributeScaling: { base: 1, perUnitRate: 0.04, floor: 1 },
    masteryScaling: { base: 1, perUnitRate: 0.03, floor: 1 },
    armorMitigation: { base: 0, perUnitRate: 0.01, floor: 0, cap: 0.75 },
    threatFactors: { sustainFactor: 0.5 },
    recoveryMinutes: { base: 2, perUnitRate: 1, floor: 1 },
    retreatDurabilityPenalty: 5,
  };

  it('health scales with the constitution-analog attribute', () => {
    expect(healthFromAttributes(curves, 0)).toBe(120);
    expect(healthFromAttributes(curves, 10)).toBe(240);
  });

  it('magnitude multiplier is attributeScaling × masteryScaling', () => {
    // (1 + 0.04×10) × (1 + 0.03×3) = 1.4 × 1.09 = 1.526
    expect(magnitudeMultiplier(curves, 10, 3)).toBeCloseTo(1.526, 6);
    // a higher-mastery build hits harder than a lower one — builds matter
    expect(magnitudeMultiplier(curves, 10, 5)).toBeGreaterThan(magnitudeMultiplier(curves, 10, 1));
  });

  it('mitigation is bounded below 1 and grows with armor', () => {
    expect(mitigationFraction(curves, 0)).toBe(0);
    expect(mitigationFraction(curves, 40)).toBeCloseTo(0.4, 6);
    expect(mitigationFraction(curves, 10_000)).toBe(0.75);
  });

  it('recovery minutes grow with enemy tier', () => {
    expect(recoveryMinutes(curves, 1)).toBe(3);
    expect(recoveryMinutes(curves, 3)).toBe(5);
  });
});

import type { ContentIndex, SkillDef, XpCurve } from '@tradewright/content';

export function xpForLevelUp(curve: XpCurve, level: number): number | null {
  if (level >= curve.maxLevel) return null;
  return Math.round(curve.base * Math.pow(curve.growth, level - 1));
}

export function levelForXp(curve: XpCurve, xp: number): number {
  let level = 1;
  let remaining = xp;
  for (;;) {
    const cost = xpForLevelUp(curve, level);
    if (cost === null || remaining < cost) return level;
    remaining -= cost;
    level += 1;
  }
}

export function tierForLevel(skill: SkillDef, level: number): number {
  let tier = 0;
  for (const t of skill.tiers) {
    if (level >= t.levelThreshold && t.tier > tier) tier = t.tier;
  }
  return tier;
}

/** Activities newly unlocked when a skill reaches `tier`. */
export function activitiesUnlockedAtTier(
  content: ContentIndex,
  skillId: string,
  tier: number,
): string[] {
  return content.activities.filter((a) => a.skillId === skillId && a.tier === tier).map((a) => a.id);
}

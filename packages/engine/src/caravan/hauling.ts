import type { ContentIndex, SkillDef } from '@tradewright/content';
import type { GameEvent } from '@tradewright/contract';
import type { SaveGame } from '../world/state.js';
import { levelForXp, tierForLevel } from '../skills/progression.js';

/** The single hauling skill — found by family so the engine never hardcodes the
 *  content id (Principle IV). */
export function haulingSkill(content: ContentIndex): SkillDef {
  const skill = content.skills.find((s) => s.family === 'hauling');
  if (!skill) throw new Error('content defines no hauling skill');
  return skill;
}

export function haulingLevel(save: SaveGame, content: ContentIndex): number {
  const skill = haulingSkill(content);
  const xp = save.character?.skills[skill.id]?.xp ?? 0;
  return levelForXp(skill.xpCurve, xp);
}

/** Caravan weight capacity grows with hauling level (FR-041); all tunables are
 *  authored content (world.caravan), never engine constants. */
export function caravanCapacityWeight(save: SaveGame, content: ContentIndex): number {
  const { baseCapacityWeight, capacityWeightPerLevel } = content.world.caravan;
  return baseCapacityWeight + (haulingLevel(save, content) - 1) * capacityWeightPerLevel;
}

/** Concurrent shipment slots grow with hauling tier (FR-041). */
export function caravanSlotsForTier(content: ContentIndex, tier: number): number {
  const { baseSlots, slotsPerTier } = content.world.caravan;
  return baseSlots + Math.max(0, tier - 1) * slotsPerTier;
}

/** Completing a shipment grants hauling XP; capacity and concurrent slots grow
 *  with the skill (FR-041). Emits SkillLeveled and recomputes the stored slot
 *  count when a level-up crosses a hauling tier. */
export function grantHaulingXp(
  save: SaveGame,
  content: ContentIndex,
  emit: (e: GameEvent) => void,
): void {
  const character = save.character;
  if (!character) return;
  const skill = haulingSkill(content);
  const state = character.skills[skill.id] ?? { xp: 0, level: 1 };
  character.skills[skill.id] = state;
  const levelBefore = levelForXp(skill.xpCurve, state.xp);
  state.xp += content.world.caravan.haulingXpPerShipment;
  const levelAfter = levelForXp(skill.xpCurve, state.xp);
  state.level = levelAfter;
  if (levelAfter > levelBefore) {
    const tierAfter = tierForLevel(skill, levelAfter);
    character.caravanSlots = caravanSlotsForTier(content, tierAfter);
    emit({
      type: 'SkillLeveled',
      skillId: skill.id,
      level: levelAfter,
      tier: tierAfter,
      unlockedActivityIds: [],
    });
  }
}

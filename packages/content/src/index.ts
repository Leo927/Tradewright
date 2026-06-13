import skillsJson from '../data/skills.json';
import itemsJson from '../data/items.json';
import activitiesJson from '../data/activities.json';
import settlementsJson from '../data/settlements.json';
import routesJson from '../data/routes.json';
import npcProfilesJson from '../data/npc-profiles.json';
import notificationCategoriesJson from '../data/notification-categories.json';
import worldJson from '../data/world.json';
import attributesJson from '../data/combat/attributes.json';
import curvesJson from '../data/combat/curves.json';
import schoolsJson from '../data/combat/schools.json';
import abilitiesJson from '../data/combat/abilities.json';
import treesJson from '../data/combat/trees.json';
import enemiesJson from '../data/combat/enemies.json';
import huntingGroundsJson from '../data/combat/hunting-grounds.json';
import gearJson from '../data/combat/gear.json';
import provisionsJson from '../data/combat/provisions.json';
import rewardTablesJson from '../data/shared/reward-tables.json';
import pkg from '../package.json';

import { skillsFile, type SkillDef } from '../schemas/skills.js';
import { itemsFile, type ItemDef } from '../schemas/items.js';
import { activitiesFile, type ActivityDef } from '../schemas/activities.js';
import { settlementsFile, type SettlementDef, type FacilityDef } from '../schemas/settlements.js';
import { routesFile, type RouteDef } from '../schemas/routes.js';
import { npcProfilesFile, type NpcMarketProfile } from '../schemas/npc-profiles.js';
import {
  notificationCategoriesFile,
  type NotificationCategoryDef,
} from '../schemas/notifications.js';
import { worldTuningDef, type WorldTuningDef } from '../schemas/world.js';
import { attributesFile, type AttributeDef } from '../schemas/attributes.js';
import { combatCurves, type CombatCurves } from '../schemas/curves.js';
import {
  schoolsFile,
  abilitiesFile,
  treeBranchesFile,
  type SchoolDef,
  type AbilityDef,
  type TreeBranchDef,
} from '../schemas/combat-schools.js';
import {
  enemiesFile,
  huntingGroundsFile,
  type EnemyDef,
  type HuntingGroundDef,
} from '../schemas/enemies.js';
import { gearFile, provisionsFile, type GearDef, type ProvisionDef } from '../schemas/gear.js';
import { rewardTablesFile, type RewardTableDef } from '../schemas/reward-tables.js';

export type {
  SkillDef,
  ItemDef,
  ActivityDef,
  SettlementDef,
  FacilityDef,
  RouteDef,
  NpcMarketProfile,
  NotificationCategoryDef,
  WorldTuningDef,
  AttributeDef,
  CombatCurves,
  SchoolDef,
  AbilityDef,
  TreeBranchDef,
  EnemyDef,
  HuntingGroundDef,
  GearDef,
  ProvisionDef,
  RewardTableDef,
};
export type { CurveExpr } from '../schemas/curves.js';
export type { EffectExpr, EffectStatRef } from '../schemas/effects.js';
export type {
  TacticsProgram,
  TacticsRule,
  TacticsTrigger,
  TreeNodeDef,
  UnlockSource,
} from '../schemas/combat-schools.js';
export type { GearSlot } from '../schemas/gear.js';
export type { RewardEntry } from '../schemas/reward-tables.js';
export type { XpCurve, TierDef } from '../schemas/skills.js';
export type { NpcItemEntry } from '../schemas/npc-profiles.js';
export type { LocaleDef, UiTextCatalog, ContentTextResource } from '../schemas/text.js';

export interface ContentIndex {
  skills: SkillDef[];
  items: ItemDef[];
  activities: ActivityDef[];
  settlements: SettlementDef[];
  routes: RouteDef[];
  npcProfiles: NpcMarketProfile[];
  notificationCategories: NotificationCategoryDef[];
  world: WorldTuningDef;
  /** Combat core (data-model Part II). Empty arrays until the story that
   *  authors each domain lands; the integrity gates go green progressively. */
  attributes: AttributeDef[];
  curves: CombatCurves;
  schools: SchoolDef[];
  abilities: AbilityDef[];
  treeBranches: TreeBranchDef[];
  enemies: EnemyDef[];
  huntingGrounds: HuntingGroundDef[];
  gear: GearDef[];
  provisions: ProvisionDef[];
  rewardTables: RewardTableDef[];
  contentVersion: string;
}

/** Validated at module load — malformed content fails fast (Principle IV). */
export const content: ContentIndex = {
  skills: skillsFile.parse(skillsJson),
  items: itemsFile.parse(itemsJson),
  activities: activitiesFile.parse(activitiesJson),
  settlements: settlementsFile.parse(settlementsJson),
  routes: routesFile.parse(routesJson),
  npcProfiles: npcProfilesFile.parse(npcProfilesJson),
  notificationCategories: notificationCategoriesFile.parse(notificationCategoriesJson),
  world: worldTuningDef.parse(worldJson),
  attributes: attributesFile.parse(attributesJson),
  curves: combatCurves.parse(curvesJson),
  schools: schoolsFile.parse(schoolsJson),
  abilities: abilitiesFile.parse(abilitiesJson),
  treeBranches: treeBranchesFile.parse(treesJson),
  enemies: enemiesFile.parse(enemiesJson),
  huntingGrounds: huntingGroundsFile.parse(huntingGroundsJson),
  gear: gearFile.parse(gearJson),
  provisions: provisionsFile.parse(provisionsJson),
  rewardTables: rewardTablesFile.parse(rewardTablesJson),
  contentVersion: pkg.contentVersion,
};

export function indexById<T extends { id: string }>(defs: T[]): Map<string, T> {
  return new Map(defs.map((d) => [d.id, d]));
}

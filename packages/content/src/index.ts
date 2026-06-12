import skillsJson from '../data/skills.json';
import itemsJson from '../data/items.json';
import activitiesJson from '../data/activities.json';
import settlementsJson from '../data/settlements.json';
import routesJson from '../data/routes.json';
import npcProfilesJson from '../data/npc-profiles.json';
import notificationCategoriesJson from '../data/notification-categories.json';
import worldJson from '../data/world.json';
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
};
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
  contentVersion: pkg.contentVersion,
};

export function indexById<T extends { id: string }>(defs: T[]): Map<string, T> {
  return new Map(defs.map((d) => [d.id, d]));
}

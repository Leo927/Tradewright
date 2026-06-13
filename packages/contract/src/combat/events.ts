import type { ManifestLine } from '../commands.js';
import type {
  CombatLogEntryView,
  HaulView,
  ExpeditionEndReason,
} from './queries.js';

export interface StarterKitGranted {
  type: 'StarterKitGranted';
  schoolId: string;
  itemId: string;
  instanceId: string;
  atTick: number;
}

export interface ExpeditionStarted {
  type: 'ExpeditionStarted';
  expeditionId: string;
  groundId: string;
  enemyId: string;
  atTick: number;
}

export interface DurabilityDelta {
  instanceId: string;
  delta: number;
  durabilityAfter: number;
}

export interface ExpeditionEnded {
  type: 'ExpeditionEnded';
  expeditionId: string;
  reason: ExpeditionEndReason;
  haul: HaulView;
  durabilityDeltas: DurabilityDelta[];
  recoveryUntilTick: number;
  atTick: number;
}

export interface EnemyDefeated {
  type: 'EnemyDefeated';
  expeditionId: string;
  enemyId: string;
  combatSkillXp: number;
  masteryXp: number;
  loot: ManifestLine[];
  gearInstanceIds: string[];
  atTick: number;
}

export interface CombatLogAppended {
  type: 'CombatLogAppended';
  expeditionId: string;
  entries: CombatLogEntryView[];
}

export interface MasteryLeveled {
  type: 'MasteryLeveled';
  schoolId: string;
  level: number;
  pointsAwarded: number;
}

export interface GearBroke {
  type: 'GearBroke';
  instanceId: string;
  slot: string;
  atTick: number;
}

export interface RecoveryEnded {
  type: 'RecoveryEnded';
  atTick: number;
}

export type CombatEvent =
  | StarterKitGranted
  | ExpeditionStarted
  | ExpeditionEnded
  | EnemyDefeated
  | CombatLogAppended
  | MasteryLeveled
  | GearBroke
  | RecoveryEnded;

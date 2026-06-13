import type { ManifestLine } from '../commands.js';
import type {
  GearSlot,
  TacticsProgram,
  ProvisionPlanEntry,
} from './commands.js';

export interface GetHuntingGrounds {
  type: 'GetHuntingGrounds';
}

export interface GetSchools {
  type: 'GetSchools';
}

export interface GetLoadout {
  type: 'GetLoadout';
  /** When set, the returned fitness hint is assessed against this enemy tier. */
  vsEnemyId?: string;
}

export interface GetExpedition {
  type: 'GetExpedition';
}

export interface GetCombatLog {
  type: 'GetCombatLog';
  offset: number;
  limit: number;
}

export interface GetRecovery {
  type: 'GetRecovery';
}

export type CombatQuery =
  | GetHuntingGrounds
  | GetSchools
  | GetLoadout
  | GetExpedition
  | GetCombatLog
  | GetRecovery;

/** A drop-table summary surfaces which item/gear defs an enemy can yield —
 *  ids only; the GUI renders names from catalogs (protocol Part V). */
export interface DropTableSummaryView {
  itemDefIds: string[];
  gearDefIds: string[];
}

export type DifficultyCode = 'favored' | 'even' | 'risky' | 'overwhelming';

export interface HuntingGroundRosterEntryView {
  enemyId: string;
  tier: number;
  requiredCharacterTier: number;
  locked: boolean;
  difficulty: DifficultyCode;
  drops: DropTableSummaryView;
}

export interface HuntingGroundView {
  groundId: string;
  regionId: string;
  settlementTags: string[];
  roster: HuntingGroundRosterEntryView[];
}

export type UnlockSourceView =
  | { kind: 'mastery'; level: number }
  | { kind: 'treeNode'; nodeId: string };

export interface AbilityRosterView {
  abilityId: string;
  cooldownSeconds: number;
  unlockSource: UnlockSourceView;
  unlocked: boolean;
  slotted: boolean;
}

export type TreeNodeKind = 'passive' | 'ability-unlock';

export interface TreeNodeView {
  nodeId: string;
  pointCost: number;
  prereqNodeIds: string[];
  kind: TreeNodeKind;
  abilityId: string | null;
  spent: boolean;
  affordable: boolean;
}

export interface TreeBranchView {
  branchId: string;
  nodes: TreeNodeView[];
}

export interface SchoolView {
  schoolId: string;
  flavor: 'weapon' | 'magic';
  active: boolean;
  masteryLevel: number;
  masteryXp: number;
  xpForNextLevel: number | null;
  pointsAvailable: number;
  abilities: AbilityRosterView[];
  branches: TreeBranchView[];
}

export interface AttributeTotalView {
  attributeId: string;
  points: number;
}

export interface StatTotalsView {
  attributes: AttributeTotalView[];
  health: number;
  armorPhys: number;
  armorElem: number;
}

export interface EquippedSlotView {
  slot: GearSlot;
  instanceId: string | null;
  itemDefId: string | null;
  gearScore: number | null;
  durability: number | null;
  durabilityMax: number | null;
  broken: boolean;
}

export type InertFlagKind = 'unslotted-ability' | 'inert-rule' | 'inert-modifier';

export interface InertFlagView {
  kind: InertFlagKind;
  ref: string;
}

export interface SlottedAbilityView {
  abilityId: string;
  cooldownSeconds: number;
}

export interface FitnessHintView {
  enemyId: string;
  difficulty: DifficultyCode;
}

export interface LoadoutView {
  activeSchoolId: string | null;
  equipped: EquippedSlotView[];
  statTotals: StatTotalsView;
  slottedAbilities: SlottedAbilityView[];
  tactics: TacticsProgram;
  provisionPlan: ProvisionPlanEntry[];
  retreatThresholdPct: number;
  fitnessHint: FitnessHintView | null;
  inertFlags: InertFlagView[];
}

export interface TimedEffectView {
  ref: string;
  remainingSeconds: number;
}

export interface AbilityCooldownView {
  abilityId: string;
  remainingSeconds: number;
}

export interface CombatantView {
  ref: string;
  isEnemy: boolean;
  health: number;
  healthMax: number;
  cooldowns: AbilityCooldownView[];
  buffs: TimedEffectView[];
  debuffs: TimedEffectView[];
}

export interface HaulView {
  items: ManifestLine[];
  gearInstanceIds: string[];
  xp: number;
  masteryXp: number;
  points: number;
}

export type ExpeditionStateCode = 'fighting' | 'ended' | 'recovering';
export type ExpeditionEndReason = 'retreat' | 'supplies' | 'recalled' | 'offline-cap';

export interface ExpeditionView {
  expeditionId: string;
  groundId: string;
  enemyId: string;
  state: ExpeditionStateCode;
  endReason: ExpeditionEndReason | null;
  combatants: CombatantView[];
  haulSoFar: HaulView;
  provisionsRemaining: ManifestLine[];
  tickCount: number;
}

/** Structured log entry — ids/codes/raw values only; the GUI composes the line
 *  via ICU messages in the active locale (FR-076). */
export interface CombatLogEntryView {
  atTick: number;
  kind:
    | 'basic-attack'
    | 'ability-cast'
    | 'damage'
    | 'heal'
    | 'buff-applied'
    | 'debuff-applied'
    | 'shield-applied'
    | 'provision-consumed'
    | 'enemy-defeated'
    | 'gear-broke'
    | 'retreat';
  sourceRef: string | null;
  targetRef: string | null;
  abilityId: string | null;
  itemId: string | null;
  effectKind: string | null;
  amount: number | null;
}

export interface CombatLogPage {
  entries: CombatLogEntryView[];
  offset: number;
  limit: number;
  total: number;
}

export interface RecoveryView {
  recovering: boolean;
  untilTick: number | null;
  remainingSeconds: number | null;
}

export interface CombatQueryResultMap {
  GetHuntingGrounds: HuntingGroundView[];
  GetSchools: SchoolView[];
  GetLoadout: LoadoutView;
  GetExpedition: ExpeditionView | null;
  GetCombatLog: CombatLogPage;
  GetRecovery: RecoveryView;
}

/** Equipment slots (data-model Part II). Weapon-focus activates a school. */
export type GearSlot =
  | 'weapon-focus'
  | 'head'
  | 'chest'
  | 'hands'
  | 'legs'
  | 'feet'
  | 'trinket';

/** Closed tactics trigger vocabulary (FR-166, research R4 combat). New kinds are
 *  engine + schema changes, never authoring/runtime improvisation. */
export type TacticsTrigger =
  | { kind: 'always' }
  | { kind: 'self-health-below'; pct: number }
  | { kind: 'enemy-health-above'; pct: number }
  | { kind: 'enemy-health-below'; pct: number }
  | { kind: 'ally-health-below'; pct: number }
  | { kind: 'buff-missing'; ref: string }
  | { kind: 'debuff-present'; ref: string }
  | { kind: 'at-expedition-start' };

/** Ordered rule = strict priority; first satisfied + off-cooldown rule casts
 *  (FR-168). Runtime player state, not content; editable mid-expedition (FR-169). */
export interface TacticsRule {
  abilityId: string;
  trigger: TacticsTrigger;
}

export interface TacticsProgram {
  rules: TacticsRule[];
}

export interface ProvisionPlanEntry {
  itemId: string;
  thresholdPct: number;
}

export interface ChooseStartingSchool {
  type: 'ChooseStartingSchool';
  schoolId: string;
}

export interface StartExpedition {
  type: 'StartExpedition';
  groundId: string;
  enemyId: string;
  /** Replaces the current activity-slot occupant when set (FR-104). */
  confirmReplace?: boolean;
}

export interface RecallExpedition {
  type: 'RecallExpedition';
}

export interface TapCastAbility {
  type: 'TapCastAbility';
  abilityId: string;
}

export interface EditTactics {
  type: 'EditTactics';
  tactics: TacticsProgram;
}

export interface SetProvisionPlan {
  type: 'SetProvisionPlan';
  plan: ProvisionPlanEntry[];
}

export interface SetRetreatThreshold {
  type: 'SetRetreatThreshold';
  /** ≥ 0; 0% = fight to overwhelm, still no death (FR-131). */
  thresholdPct: number;
}

export interface EquipGear {
  type: 'EquipGear';
  slot: GearSlot;
  instanceId: string;
}

export interface UnequipGear {
  type: 'UnequipGear';
  slot: GearSlot;
}

export interface SlotAbility {
  type: 'SlotAbility';
  abilityId: string;
}

export interface UnslotAbility {
  type: 'UnslotAbility';
  abilityId: string;
}

export interface SpendTreePoint {
  type: 'SpendTreePoint';
  nodeId: string;
}

export interface Respec {
  type: 'Respec';
  schoolId: string;
}

export interface RepairGear {
  type: 'RepairGear';
  instanceId: string;
}

export type CombatCommand =
  | ChooseStartingSchool
  | StartExpedition
  | RecallExpedition
  | TapCastAbility
  | EditTactics
  | SetProvisionPlan
  | SetRetreatThreshold
  | EquipGear
  | UnequipGear
  | SlotAbility
  | UnslotAbility
  | SpendTreePoint
  | Respec
  | RepairGear;

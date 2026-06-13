import type { EffectStatRef, GearSlot } from '@tradewright/content';

export type { GearSlot };

/** Non-fungible gear (research R6 combat): stored/escrowed/shipped as an
 *  instance under the economy locality rules. At durability 0 it grants no
 *  stats/perks/modifiers until repaired (FR-122). qualityGrade is derived from
 *  modifier count (FR-270, Part III) — never stored. */
export interface GearItemInstance {
  instanceId: string;
  itemDefId: string;
  gearScore: number;
  modifiers: string[];
  durability: number;
}

/** Per character × school; independent and preserved on switch (FR-163).
 *  Combat skill XP itself lives in the Part I skills map; character tier is
 *  derived from it, never stored. */
export interface SchoolMastery {
  schoolId: string;
  xp: number;
  level: number;
  pointsEarned: number;
  spentNodes: string[];
}

export interface ProvisionPlanEntry {
  itemId: string;
  thresholdPct: number;
}

/** Closed tactics trigger vocabulary (FR-166) — mirrors the contract. */
export type TacticsTrigger =
  | { kind: 'always' }
  | { kind: 'self-health-below'; pct: number }
  | { kind: 'enemy-health-above'; pct: number }
  | { kind: 'enemy-health-below'; pct: number }
  | { kind: 'ally-health-below'; pct: number }
  | { kind: 'buff-missing'; ref: string }
  | { kind: 'debuff-present'; ref: string }
  | { kind: 'at-expedition-start' };

export interface TacticsRule {
  abilityId: string;
  trigger: TacticsTrigger;
}

export interface TacticsProgram {
  rules: TacticsRule[];
}

export type InertFlagKind = 'unslotted-ability' | 'inert-rule' | 'inert-modifier';

export interface InertFlag {
  kind: InertFlagKind;
  ref: string;
}

/** Per character. School derived from the equipped weapon-focus's schoolTag. */
export interface Loadout {
  equipped: Partial<Record<GearSlot, string>>;
  slottedAbilityIds: string[];
  tactics: TacticsProgram;
  provisionPlan: ProvisionPlanEntry[];
  retreatThresholdPct: number;
  inertFlags: InertFlag[];
}

/** An active timed effect on a combatant (resolver-owned; ticks down in seconds
 *  = combat ticks). Buffs/debuffs apply a multiplier to the named stat; dot/hot
 *  tick magnitude per second; shield absorbs up to `shieldRemaining`. */
export interface TimedEffect {
  ref: string;
  kind: 'buff' | 'debuff' | 'hot' | 'dot' | 'shield' | 'threat-amp';
  sourceRef: string;
  magnitude: number;
  remainingSeconds: number;
  stat?: EffectStatRef;
  damageType?: 'phys' | 'elem';
  shieldRemaining?: number;
}

export interface Combatant {
  ref: string;
  isEnemy: boolean;
  health: number;
  healthMax: number;
  attributeTotals: Record<string, number>;
  armorPhys: number;
  armorElem: number;
  /** abilityId → seconds remaining until ready. */
  cooldowns: Record<string, number>;
  /** Seconds until the next basic attack lands. */
  basicAttackCooldown: number;
  effects: TimedEffect[];
  /** Stable join order — the deterministic threat-tie tie-break (FR-106). */
  joinOrder: number;
}

/** Resolver state — expeditions and (later) encounter instances share it. */
export interface CombatState {
  combatants: Combatant[];
  /** enemyRef → combatantRef → accumulated threat (FR-108). */
  threatTables: Record<string, Record<string, number>>;
  tickCount: number;
  /** Per-expedition RNG sub-stream for replayable loot (research R7). */
  rngState: number;
}

/** Frozen at expedition start — only tactics stay live (FR-169, research R5).
 *  Tree passives are resolved to concrete effects at start so offline replay is
 *  well-defined (no mid-run build state the player could not have applied). */
export interface BuildSnapshot {
  schoolId: string;
  combatSkillId: string;
  slottedAbilityIds: string[];
  scalingAttributeIds: string[];
  masteryLevel: number;
  attributeTotals: Record<string, number>;
  armorPhys: number;
  armorElem: number;
  healthMax: number;
  /** Passive perk effect-ids resolved from spent tree nodes (frozen). */
  treePassiveBuffs: TimedEffect[];
  /** Equipped instances at start (for durability wear on end). */
  equipped: { slot: GearSlot; instanceId: string }[];
}

export type ExpeditionEndReason = 'retreat' | 'supplies' | 'recalled' | 'offline-cap';

export type ExpeditionState =
  | { kind: 'fighting' }
  | { kind: 'ended'; reason: ExpeditionEndReason };

export interface ExpeditionHaul {
  items: Record<string, number>;
  gearInstanceIds: string[];
  xp: number;
  masteryXp: number;
  points: number;
}

export interface ExpeditionInstance {
  id: string;
  characterId: string;
  groundId: string;
  enemyId: string;
  buildSnapshot: BuildSnapshot;
  combatState: CombatState;
  haul: ExpeditionHaul;
  provisionsRemaining: Record<string, number>;
  /** itemId → seconds until the provision can be consumed again. */
  provisionCooldowns: Record<string, number>;
  startedAtTick: number;
  state: ExpeditionState;
}

/** Combat-core save sub-state (data-model Part II). M1 saves migrate to an
 *  empty instance (formatVersion bump). No field stores rendered text. */
export interface CombatSave {
  masteries: SchoolMastery[];
  loadout: Loadout;
  expedition: ExpeditionInstance | null;
  /** Recovery gates expeditions only; null when free (FR-132). */
  recoveryUntilTick: number | null;
}

export function emptyLoadout(): Loadout {
  return {
    equipped: {},
    slottedAbilityIds: [],
    tactics: { rules: [] },
    provisionPlan: [],
    retreatThresholdPct: 0,
    inertFlags: [],
  };
}

export function emptyCombatSave(): CombatSave {
  return {
    masteries: [],
    loadout: emptyLoadout(),
    expedition: null,
    recoveryUntilTick: null,
  };
}

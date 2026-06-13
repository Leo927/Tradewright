import type { ActivityDef, ContentIndex } from '@tradewright/content';
import type { TickContext } from '../simulation/tick.js';
import { getStorage, type SaveGame } from '../world/state.js';
import { applyTransaction, EngineError } from '../world/ledger.js';
import {
  addItems,
  capacityOf,
  capacityUsed,
  hasItems,
  missingItems,
  removeItems,
  settlementDef,
  weightOfLines,
} from '../world/storage.js';
import { effectiveStationTier } from '../world/facilities.js';
import {
  activitiesUnlockedAtTier,
  levelForXp,
  tierForLevel,
} from './progression.js';

export function activityDef(content: ContentIndex, activityId: string): ActivityDef {
  const def = content.activities.find((a) => a.id === activityId);
  if (!def) throw new EngineError('NOT_FOUND', `unknown activity ${activityId}`);
  return def;
}

export interface AssignActivityInput {
  activityId: string;
  confirmReplace?: boolean;
}

export function assignActivity(
  save: SaveGame,
  content: ContentIndex,
  input: AssignActivityInput,
): void {
  const character = save.character;
  if (!character) throw new EngineError('NO_CHARACTER', 'create a character first');
  if (character.locationState.kind !== 'at') {
    throw new EngineError('ALREADY_TRAVELING', 'cannot assign work while traveling');
  }
  const settlementId = character.locationState.settlementId;
  const def = activityDef(content, input.activityId);
  const settlement = settlementDef(content, settlementId);
  if (!def.settlementTags.some((t) => settlement.activityTags.includes(t))) {
    throw new EngineError('NOT_AT_SETTLEMENT', `${def.id} is not offered at ${settlementId}`, {
      settlementId,
    });
  }
  const skill = content.skills.find((s) => s.id === def.skillId)!;
  const state = character.skills[def.skillId] ?? { xp: 0, level: 1 };
  const tier = tierForLevel(skill, levelForXp(skill.xpCurve, state.xp));
  if (tier < def.tier) {
    throw new EngineError('TIER_LOCKED', `${def.id} requires ${def.skillId} tier ${def.tier}`, {
      requiredTier: def.tier,
      effectiveTier: tier,
    });
  }
  if (def.stationFamily) {
    const stationTier = effectiveStationTier(content, settlementId, def.stationFamily);
    if (stationTier < def.tier) {
      throw new EngineError(
        'STATION_TIER_LOW',
        `${def.id} requires a tier ${def.tier} ${def.stationFamily} station at ${settlementId}`,
        { stationFamily: def.stationFamily, requiredTier: def.tier, effectiveTier: stationTier },
      );
    }
  }
  if (def.inputs.length > 0) {
    const missing = missingItems(save, settlementId, def.inputs);
    if (missing.length > 0) {
      throw new EngineError('INSUFFICIENT_INPUTS', `missing inputs for ${def.id}`, {
        missingInputs: missing,
      });
    }
  }
  const active =
    character.assignment && character.assignment.haltReason === null
      ? character.assignment
      : null;
  if (active && !input.confirmReplace) {
    throw new EngineError('CONFIRM_REQUIRED', `replacing ${active.activityId} needs confirmation`);
  }
  character.assignment = {
    activityId: def.id,
    settlementId,
    startedAtTick: save.tick,
    progressSeconds: 0,
    haltedAtTick: null,
    haltReason: null,
  };
}

export function stopActivity(save: SaveGame): void {
  const character = save.character;
  if (!character) throw new EngineError('NO_CHARACTER', 'create a character first');
  if (!character.assignment) throw new EngineError('NOT_FOUND', 'no active assignment');
  character.assignment = null;
}

/** Per-tick action resolution: consume + produce + XP atomically per action;
 *  halt on missing inputs or storage-full with time + reason (FR-016). */
export function resolveActivityTick(save: SaveGame, ctx: TickContext): void {
  const character = save.character;
  const assignment = character?.assignment;
  if (!character || !assignment || assignment.haltReason !== null) return;

  const { content, emit } = ctx;
  const def = activityDef(content, assignment.activityId);
  const skill = content.skills.find((s) => s.id === def.skillId)!;
  const storage = getStorage(save, assignment.settlementId);
  const capacity = capacityOf(content, storage);

  assignment.progressSeconds += content.world.worldTickSeconds;

  while (assignment.progressSeconds >= def.actionSeconds) {
    if (def.inputs.length > 0 && !hasItems(storage, def.inputs)) {
      assignment.haltReason = 'inputs-exhausted';
      assignment.haltedAtTick = save.tick;
      emit({
        type: 'ActivityHalted',
        activityId: def.id,
        reason: 'inputs-exhausted',
        atTick: save.tick,
        missingInputs: missingItems(save, assignment.settlementId, def.inputs).map((m) => ({
          itemId: m.itemId,
          qty: m.qty,
        })),
      });
      return;
    }
    const weightDelta = weightOfLines(content, def.outputs) - weightOfLines(content, def.inputs);
    if (capacityUsed(content, storage) + weightDelta > capacity) {
      assignment.haltReason = 'storage-full';
      assignment.haltedAtTick = save.tick;
      emit({ type: 'ActivityHalted', activityId: def.id, reason: 'storage-full', atTick: save.tick });
      return;
    }

    if (def.inputs.length > 0) {
      removeItems(storage, def.inputs);
      applyTransaction(save, {
        kind: 'consumption',
        coinDelta: 0,
        items: def.inputs,
        settlementId: assignment.settlementId,
        refId: def.id,
      });
    }
    addItems(storage, def.outputs);
    applyTransaction(save, {
      kind: 'production',
      coinDelta: 0,
      items: def.outputs,
      settlementId: assignment.settlementId,
      refId: def.id,
    });

    const state = character.skills[def.skillId]!;
    const levelBefore = levelForXp(skill.xpCurve, state.xp);
    const tierBefore = tierForLevel(skill, levelBefore);
    state.xp += def.xpPerAction;
    const levelAfter = levelForXp(skill.xpCurve, state.xp);
    state.level = levelAfter;
    assignment.progressSeconds -= def.actionSeconds;

    emit({
      type: 'ActionCompleted',
      activityId: def.id,
      skillId: def.skillId,
      settlementId: assignment.settlementId,
      outputs: def.outputs,
      inputsConsumed: def.inputs,
      xpGained: def.xpPerAction,
      atTick: save.tick,
    });

    if (levelAfter > levelBefore) {
      const tierAfter = tierForLevel(skill, levelAfter);
      const unlocked: string[] = [];
      for (let t = tierBefore + 1; t <= tierAfter; t++) {
        unlocked.push(...activitiesUnlockedAtTier(content, def.skillId, t));
      }
      emit({
        type: 'SkillLeveled',
        skillId: def.skillId,
        level: levelAfter,
        tier: tierAfter,
        unlockedActivityIds: unlocked,
      });
    }
  }
}

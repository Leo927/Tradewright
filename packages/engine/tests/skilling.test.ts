import { describe, expect, it, beforeEach } from 'vitest';
import { content } from '@tradewright/content';
import type { GameEvent } from '@tradewright/contract';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { getStorage, type SaveGame } from '../src/world/state.js';
import { EngineError } from '../src/world/ledger.js';
import { assignActivity, stopActivity, resolveActivityTick } from '../src/skills/activities.js';
import { levelForXp, tierForLevel, xpForLevelUp } from '../src/skills/progression.js';
import { fastForward } from '../src/simulation/tick.js';

const TICK = content.world.worldTickSeconds;
const FELL_PINES = 'activity.fell-pines';
const FELL_OAKS = 'activity.fell-oaks';

let save: SaveGame;
let events: GameEvent[];
const ctx = () => ({ content, emit: (e: GameEvent) => events.push(e) });

beforeEach(() => {
  save = createSave(content, 99);
  events = [];
});

function withCharacter(settlementId = 'settlement.thornholt') {
  createCharacter(save, content, { name: 'Skiller', startSettlementId: settlementId });
}

describe('character creation (FR-001, FR-050, FR-078)', () => {
  it('creates one character with starter coin and all skills at level 1', () => {
    withCharacter();
    const c = save.character!;
    expect(c.wallet).toBe(content.world.starterCoin);
    expect(save.transactions[0]!.kind).toBe('starter-grant');
    expect(Object.keys(c.skills)).toHaveLength(content.skills.length);
    expect(Object.values(c.skills).every((s) => s.level === 1 && s.xp === 0)).toBe(true);
  });

  it('rejects a second character', () => {
    withCharacter();
    expect(() =>
      createCharacter(save, content, { name: 'Two', startSettlementId: 'settlement.brackwater' }),
    ).toThrow(EngineError);
  });

  it('stores the name verbatim in any supported script, never normalized (FR-078)', () => {
    createCharacter(save, content, {
      name: '雪村アリス Ærø-Лиса',
      startSettlementId: 'settlement.thornholt',
    });
    expect(save.character!.name).toBe('雪村アリス Ærø-Лиса');
  });
});

describe('assignment validation (FR-010/011/015)', () => {
  it('assigns an available tier-1 gathering activity', () => {
    withCharacter();
    assignActivity(save, content, { activityId: FELL_PINES });
    expect(save.character!.assignment?.activityId).toBe(FELL_PINES);
    expect(save.character!.assignment?.settlementId).toBe('settlement.thornholt');
  });

  it('rejects activities not offered at the current settlement', () => {
    withCharacter('settlement.brackwater');
    expect(() => assignActivity(save, content, { activityId: FELL_PINES })).toThrow(
      expect.objectContaining({ code: 'NOT_AT_SETTLEMENT' }),
    );
  });

  it('rejects tier-locked activities with the required tier', () => {
    withCharacter();
    try {
      assignActivity(save, content, { activityId: FELL_OAKS });
      expect.unreachable();
    } catch (e) {
      const err = e as EngineError;
      expect(err.code).toBe('TIER_LOCKED');
      expect(err.details?.requiredTier).toBe(2);
    }
  });

  it('rejects input-consuming activities with the exact shortfall', () => {
    withCharacter();
    try {
      assignActivity(save, content, { activityId: 'activity.saw-pine-planks' });
      expect.unreachable();
    } catch (e) {
      const err = e as EngineError;
      expect(err.code).toBe('INSUFFICIENT_INPUTS');
      expect(err.details?.missingInputs).toEqual([
        { itemId: 'item.pinewood', qty: 2, heldAtSettlementIds: [] },
      ]);
    }
  });

  it('replacing an active assignment requires confirmation and discards progress', () => {
    withCharacter();
    assignActivity(save, content, { activityId: FELL_PINES });
    save.character!.assignment!.progressSeconds = 30;
    expect(() =>
      assignActivity(save, content, { activityId: 'activity.pick-bittergreen' }),
    ).toThrow(expect.objectContaining({ code: 'CONFIRM_REQUIRED' }));
    assignActivity(save, content, {
      activityId: 'activity.pick-bittergreen',
      confirmReplace: true,
    });
    expect(save.character!.assignment?.activityId).toBe('activity.pick-bittergreen');
    expect(save.character!.assignment?.progressSeconds).toBe(0);
  });

  it('stopping discards partial-action progress — partial actions yield nothing', () => {
    withCharacter();
    assignActivity(save, content, { activityId: FELL_PINES });
    save.character!.assignment!.progressSeconds = 45;
    stopActivity(save);
    expect(save.character!.assignment).toBeNull();
    expect(getStorage(save, 'settlement.thornholt').slots['item.pinewood']).toBeUndefined();
  });
});

describe('atomic action resolution (FR-011/012)', () => {
  it('applies outputs and XP atomically per completed action', () => {
    withCharacter();
    assignActivity(save, content, { activityId: FELL_PINES });
    const def = content.activities.find((a) => a.id === FELL_PINES)!;
    const actionsPerTick = TICK / def.actionSeconds;
    resolveActivityTick(save, ctx());
    expect(getStorage(save, 'settlement.thornholt').slots['item.pinewood']).toBe(actionsPerTick);
    expect(save.character!.skills['skill.timberfelling']!.xp).toBe(
      def.xpPerAction * actionsPerTick,
    );
    expect(events.filter((e) => e.type === 'ActionCompleted')).toHaveLength(actionsPerTick);
    expect(save.transactions.filter((t) => t.kind === 'production')).toHaveLength(actionsPerTick);
  });

  it('predicted actions over a known interval: floor(elapsed / actionSeconds)', () => {
    withCharacter();
    assignActivity(save, content, { activityId: FELL_PINES });
    const def = content.activities.find((a) => a.id === FELL_PINES)!;
    const seconds = 30 * 60;
    fastForward(save, seconds, ctx());
    const expected = Math.floor(seconds / def.actionSeconds);
    expect(getStorage(save, 'settlement.thornholt').slots['item.pinewood']).toBe(expected);
  });

  it('a long absence halts at capacity, never overfilling (FR-016)', () => {
    withCharacter();
    const settlement = content.settlements.find((s) => s.id === 'settlement.thornholt')!;
    const pinewood = content.items.find((i) => i.id === 'item.pinewood')!;
    const fits = Math.floor(settlement.baseStorageCapacity / pinewood.weight);
    getStorage(save, 'settlement.thornholt').slots['item.pinewood'] = fits - 10;
    assignActivity(save, content, { activityId: FELL_PINES });
    fastForward(save, 2 * 3600, ctx());
    expect(getStorage(save, 'settlement.thornholt').slots['item.pinewood']).toBe(fits);
    expect(save.character!.assignment?.haltReason).toBe('storage-full');
  });
});

describe('level and tier unlock detection (FR-015)', () => {
  it('emits SkillLeveled with newly unlocked activities at tier thresholds', () => {
    withCharacter();
    const skill = content.skills.find((s) => s.id === 'skill.timberfelling')!;
    let xpNeeded = 0;
    for (let lvl = 1; lvl < 10; lvl++) xpNeeded += xpForLevelUp(skill.xpCurve, lvl)!;
    expect(tierForLevel(skill, levelForXp(skill.xpCurve, xpNeeded))).toBe(2);

    save.character!.skills['skill.timberfelling']!.xp = xpNeeded - 3;
    save.character!.skills['skill.timberfelling']!.level = levelForXp(
      skill.xpCurve,
      xpNeeded - 3,
    );
    assignActivity(save, content, { activityId: FELL_PINES });
    resolveActivityTick(save, ctx());
    const leveled = events.find((e) => e.type === 'SkillLeveled');
    expect(leveled).toBeDefined();
    if (leveled?.type === 'SkillLeveled') {
      expect(leveled.tier).toBe(2);
      expect(leveled.unlockedActivityIds).toContain(FELL_OAKS);
    }
  });
});

describe('storage-full halt (FR-016)', () => {
  it('halts with time and reason when output will not fit', () => {
    withCharacter();
    const storage = getStorage(save, 'settlement.thornholt');
    const settlement = content.settlements.find((s) => s.id === 'settlement.thornholt')!;
    const pinewood = content.items.find((i) => i.id === 'item.pinewood')!;
    const fits = Math.floor(settlement.baseStorageCapacity / pinewood.weight);
    storage.slots['item.pinewood'] = fits;
    assignActivity(save, content, { activityId: FELL_PINES });
    resolveActivityTick(save, ctx());
    const assignment = save.character!.assignment!;
    expect(assignment.haltReason).toBe('storage-full');
    expect(assignment.haltedAtTick).toBe(save.tick);
    expect(getStorage(save, 'settlement.thornholt').slots['item.pinewood']).toBe(fits);
    const halted = events.find((e) => e.type === 'ActivityHalted');
    expect(halted).toBeDefined();
    if (halted?.type === 'ActivityHalted') expect(halted.reason).toBe('storage-full');
  });

  it('halted assignments do not resolve further actions', () => {
    withCharacter();
    assignActivity(save, content, { activityId: FELL_PINES });
    save.character!.assignment!.haltReason = 'storage-full';
    save.character!.assignment!.haltedAtTick = save.tick;
    resolveActivityTick(save, ctx());
    expect(getStorage(save, 'settlement.thornholt').slots['item.pinewood']).toBeUndefined();
  });
});

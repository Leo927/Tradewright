import { describe, expect, it } from 'vitest';
import { content } from '@tradewright/content';
import { createSave, loadSave, serializeSave, SAVE_FORMAT_VERSION } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { getStorage } from '../src/world/state.js';

describe('SaveGame validation + migration (research R7)', () => {
  it('round-trips a fresh save through serialize/load', () => {
    const save = createSave(content, 7);
    createCharacter(save, content, { name: 'Åse 旅人', startSettlementId: 'settlement.brackwater' });
    const loaded = loadSave(serializeSave(save), content);
    expect(loaded).toEqual(save);
  });

  it('rejects corrupt JSON', () => {
    expect(() => loadSave('{"formatVersion": 1, "garbage": true}', content)).toThrow();
  });

  it('rejects a save from a future format version', () => {
    const save = createSave(content, 7);
    const doc = JSON.parse(serializeSave(save));
    doc.formatVersion = SAVE_FORMAT_VERSION + 99;
    expect(() => loadSave(JSON.stringify(doc), content)).toThrow(/future/i);
  });

  it('migrates an M1 (v1) save forward, gaining empty combat state + gear lists (T132)', () => {
    const save = createSave(content, 7);
    createCharacter(save, content, { name: 'Migrant', startSettlementId: 'settlement.brackwater' });
    getStorage(save, 'settlement.brackwater').slots['item.pinewood'] = 5;
    // shape a v1 document: no combat sub-state, storages without gearInstances
    const doc = JSON.parse(serializeSave(save));
    doc.formatVersion = 1;
    delete doc.combat;
    doc.storages = doc.storages.map((s: Record<string, unknown>) => {
      const { gearInstances, ...rest } = s;
      void gearInstances;
      return rest;
    });

    const loaded = loadSave(JSON.stringify(doc), content);
    expect(loaded.formatVersion).toBe(SAVE_FORMAT_VERSION);
    expect(loaded.combat).toEqual({
      masteries: [],
      loadout: { equipped: {}, slottedAbilityIds: [], tactics: { rules: [] }, provisionPlan: [], retreatThresholdPct: 0, inertFlags: [] },
      expedition: null,
      recoveryUntilTick: null,
    });
    // economy data survives untouched; storage gains an empty gear list
    expect(loaded.storages[0]!.slots['item.pinewood']).toBe(5);
    expect(loaded.storages[0]!.gearInstances).toEqual([]);
  });

  it('fails loudly when no migration path exists', () => {
    const save = createSave(content, 7);
    const doc = JSON.parse(serializeSave(save));
    doc.formatVersion = 0; // no migration registered from 0
    expect(() => loadSave(JSON.stringify(doc), content)).toThrow(/migration/i);
  });
});

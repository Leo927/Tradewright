import { describe, expect, it } from 'vitest';
import { content } from '@tradewright/content';
import {
  createSave,
  loadSave,
  serializeSave,
  registerMigration,
  SAVE_FORMAT_VERSION,
} from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';

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

  it('migrates older formats forward through registered migrations', () => {
    const save = createSave(content, 7);
    const doc = JSON.parse(serializeSave(save));
    doc.formatVersion = SAVE_FORMAT_VERSION - 1;
    doc.legacyField = 'old';
    const unregister = registerMigration(SAVE_FORMAT_VERSION - 1, (old) => {
      const next = { ...(old as Record<string, unknown>) };
      delete next['legacyField'];
      next['formatVersion'] = SAVE_FORMAT_VERSION;
      return next;
    });
    try {
      const loaded = loadSave(JSON.stringify(doc), content);
      expect(loaded.formatVersion).toBe(SAVE_FORMAT_VERSION);
    } finally {
      unregister();
    }
  });

  it('fails loudly when no migration path exists', () => {
    const save = createSave(content, 7);
    const doc = JSON.parse(serializeSave(save));
    doc.formatVersion = SAVE_FORMAT_VERSION - 1;
    expect(() => loadSave(JSON.stringify(doc), content)).toThrow(/migration/i);
  });
});

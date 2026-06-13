import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { content } from '@tradewright/content';
import { LocalGameHost } from '../src/adapter/local-game-host.js';
import { createSave } from '../src/world/save.js';
import { createManualClock } from '../src/simulation/clock.js';
import type { SaveGame } from '../src/world/state.js';

const SEED = 424242;
const SUPPORTED = ['en', 'pseudo-expand', 'pseudo-cjk'];

function buildHost(_localeId: string) {
  const save = createSave(content, SEED);
  const clock = createManualClock(1_000_000);
  const host = new LocalGameHost({ content, clock, save, supportedLocaleIds: SUPPORTED });
  host.start();
  return { host, save, clock };
}

/** The world state must be locale-identical; the settings envelope is the one
 *  deliberately differing, simulation-invisible field (data-model Part V). */
function worldState(save: SaveGame): Omit<SaveGame, 'settings'> {
  const { settings: _settings, ...world } = save;
  return world;
}

describe('locale neutrality replay (FR-074, SC-014, quickstart US0-c)', () => {
  it('identical inputs under en and pseudo locales produce identical engine state', async () => {
    const a = buildHost('en');
    const b = buildHost('pseudo-expand');

    await a.host.send({ type: 'SetDisplayLocale', localeId: 'en' });
    await b.host.send({ type: 'SetDisplayLocale', localeId: 'pseudo-expand' });
    await a.host.send({
      type: 'CreateCharacter',
      name: '商隊の主',
      startSettlementId: 'settlement.thornholt',
    });
    await b.host.send({
      type: 'CreateCharacter',
      name: '商隊の主',
      startSettlementId: 'settlement.thornholt',
    });

    a.clock.advance(8 * 3600 * 1000);
    b.clock.advance(8 * 3600 * 1000);
    a.host.pump();
    b.host.pump();

    expect(a.save.settings.displayLocale).toBe('en');
    expect(b.save.settings.displayLocale).toBe('pseudo-expand');
    expect(worldState(a.save)).toEqual(worldState(b.save));
  });

  it('SetDisplayLocale never touches simulation state', async () => {
    const { host, save } = buildHost('en');
    await host.send({
      type: 'CreateCharacter',
      name: 'N',
      startSettlementId: 'settlement.brackwater',
    });
    const before = structuredClone(worldState(save));
    const cmdCounterBefore = save.nextIds['cmd'] ?? 0;
    await host.send({ type: 'SetDisplayLocale', localeId: 'pseudo-cjk' });
    const after = worldState(save);
    expect({ ...after, nextIds: { ...after.nextIds, cmd: cmdCounterBefore } }).toEqual(before);
  });

  it('rejects a locale missing from text/locales.json (FR-072)', async () => {
    const { host } = buildHost('en');
    const ack = await host.send({ type: 'SetDisplayLocale', localeId: 'xx-unknown' });
    expect(ack.accepted).toBe(false);
    if (!ack.accepted) expect(ack.code).toBe('UNSUPPORTED_LOCALE');
  });

  it('no engine or contract source imports or references content text (research R1 i18n)', () => {
    const roots = [
      join(import.meta.dirname, '..', 'src'),
      join(import.meta.dirname, '..', '..', 'contract', 'src'),
    ];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (path.endsWith('.ts')) files.push(path);
      }
    };
    roots.forEach(walk);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/from\s+['"][^'"]*(content\/text|\/text\/|ui\.json)/);
      expect(source, file).not.toMatch(/import\s*\(\s*['"][^'"]*(content\/text|ui\.json)/);
    }
  });
});

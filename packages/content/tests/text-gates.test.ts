import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { content } from '../src/index.js';
import { loadTextTree, loadRawData, packageRoot, type TextTree } from '../src/loader.js';
import { generatePseudoLocales, toPseudoExpand, toPseudoCjk } from '../src/gen-pseudo.js';
import { checkTextGates, checkNoDisplayTextInData, icuPlaceholders } from '../src/gates.js';

let tree: TextTree;

beforeAll(() => {
  generatePseudoLocales();
  tree = loadTextTree();
});

describe('text gates (content-schema Part V)', () => {
  it('gates 1-4: schema validity, ICU parseability, coverage, parity, orphans', () => {
    const report = checkTextGates(tree, content);
    expect(report.errors).toEqual([]);
  });

  it('generated pseudo locales fall back nowhere (zero warnings on full tree)', () => {
    const report = checkTextGates(tree, content);
    expect(report.warnings).toEqual([]);
  });

  it('gate 2 detects a coverage hole in a shipped locale', () => {
    const en = tree.byLocale['en']!;
    const { 'app.title': _removed, ...rest } = en.ui;
    const holed: TextTree = {
      locales: [
        { id: 'en', endonym: 'English', status: 'shipped' },
        { id: 'xx', endonym: 'Xx', status: 'shipped' },
      ],
      byLocale: { en, xx: { ui: rest, content: en.content } },
    };
    const report = checkTextGates(holed, content);
    expect(report.errors.some((e) => e.includes('xx') && e.includes('app.title'))).toBe(true);
  });

  it('gate 3 detects placeholder drift', () => {
    const en = tree.byLocale['en']!;
    const drifted: TextTree = {
      locales: [...tree.locales, { id: 'yy', endonym: 'Yy', status: 'validation' }],
      byLocale: {
        ...tree.byLocale,
        yy: { ui: { ...en.ui, 'common.coin': 'coins: {wrongName, number}' }, content: en.content },
      },
    };
    const report = checkTextGates(drifted, content);
    expect(report.errors.some((e) => e.includes('yy') && e.includes('common.coin'))).toBe(true);
  });

  it('gate 4 detects an orphan content-text key', () => {
    const en = tree.byLocale['en']!;
    const orphaned: TextTree = {
      ...tree,
      byLocale: {
        ...tree.byLocale,
        en: {
          ...en,
          content: {
            ...en.content,
            items: { ...en.content['items'], 'item.ghost.name': 'Ghost Item' },
          },
        },
      },
    };
    const report = checkTextGates(orphaned, content);
    expect(report.errors.some((e) => e.includes('item.ghost'))).toBe(true);
  });

  it('gate 5: no display text in data/', () => {
    expect(checkNoDisplayTextInData(loadRawData())).toEqual([]);
  });

  it('gate 5 detects inline display text', () => {
    const errors = checkNoDisplayTextInData({
      'bad.json': [{ id: 'item.x', name: 'Inline Name' }],
    });
    expect(errors.length).toBe(1);
  });

  it('ICU placeholder extraction handles plural/select nesting', () => {
    expect(
      icuPlaceholders('{count, plural, one {# crate for {who}} other {# crates for {who}}}'),
    ).toEqual(new Set(['count', 'who']));
  });
});

describe('fallback-gap detection (T049, research R5 i18n)', () => {
  it('reports every key missing from a non-shipped locale as a gap', () => {
    const en = tree.byLocale['en']!;
    const pseudo = tree.byLocale['pseudo-expand']!;
    const { 'nav.settings': _gone, ...gappedUi } = pseudo.ui;
    const gapped: TextTree = {
      ...tree,
      byLocale: { ...tree.byLocale, 'pseudo-expand': { ui: gappedUi, content: pseudo.content } },
    };
    const report = checkTextGates(gapped, content);
    expect(report.errors).toEqual([]);
    expect(
      report.warnings.some((w) => w.includes('pseudo-expand') && w.includes('nav.settings')),
    ).toBe(true);
    expect(en.ui['nav.settings']).toBeDefined();
  });
});

describe('pseudo-locale generation (gate 7, research R4 i18n)', () => {
  it('transforms are deterministic and preserve ICU placeholders', () => {
    const msg = 'Your caravan has reached {settlement}.';
    expect(toPseudoExpand(msg)).toEqual(toPseudoExpand(msg));
    expect(toPseudoCjk(msg)).toEqual(toPseudoCjk(msg));
    expect([...icuPlaceholders(toPseudoExpand(msg))]).toEqual(['settlement']);
    expect([...icuPlaceholders(toPseudoCjk(msg))]).toEqual(['settlement']);
  });

  it('pseudo-expand pads ~40% and brackets every message', () => {
    const out = toPseudoExpand('Confirm');
    expect(out.startsWith('⟦')).toBe(true);
    expect(out.endsWith('⟧')).toBe(true);
    expect(out).toContain('·');
  });

  it('same en input generates byte-identical pseudo files', () => {
    const snapshot = () => {
      const out: Record<string, string> = {};
      for (const locale of ['pseudo-expand', 'pseudo-cjk']) {
        const dir = join(packageRoot, 'text', locale);
        out[`${locale}/ui.json`] = readFileSync(join(dir, 'ui.json'), 'utf8');
        for (const f of readdirSync(join(dir, 'content')).sort()) {
          out[`${locale}/content/${f}`] = readFileSync(join(dir, 'content', f), 'utf8');
        }
      }
      return out;
    };
    const first = snapshot();
    generatePseudoLocales();
    expect(snapshot()).toEqual(first);
  });
});

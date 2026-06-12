import { beforeAll, describe, expect, it } from 'vitest';
import { generatePseudoLocales } from '../src/gen-pseudo.js';
import { loadTextTree } from '../src/loader.js';
import { checkDenylist } from '../src/gates.js';
import denylist from './denylist.json';

describe('originality denylist (world-integrity gate 8 + text gate 6, FR-024/071)', () => {
  beforeAll(() => {
    generatePseudoLocales();
  });

  it('no locale catalog contains a denylisted inspiration term', () => {
    const tree = loadTextTree();
    expect(checkDenylist(tree, denylist)).toEqual([]);
  });

  it('detects a denylisted term in any locale', () => {
    const tree = loadTextTree();
    const tainted = {
      ...tree,
      byLocale: {
        ...tree.byLocale,
        en: {
          ...tree.byLocale['en']!,
          ui: { ...tree.byLocale['en']!.ui, 'test.bad': 'A chunk of Orichalcum ore' },
        },
      },
    };
    expect(checkDenylist(tainted, denylist).length).toBeGreaterThan(0);
  });
});

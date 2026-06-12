import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadTextTree, packageRoot, type LocaleText } from './loader.js';

const ACCENT_MAP: Record<string, string> = {
  a: 'á', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ğ', h: 'ĥ', i: 'í', j: 'ĵ',
  k: 'ķ', l: 'ĺ', m: 'ɱ', n: 'ñ', o: 'ó', p: 'þ', q: 'ʠ', r: 'ŕ', s: 'š', t: 'ţ',
  u: 'ú', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž',
  A: 'Á', B: 'Ɓ', C: 'Ç', D: 'Ð', E: 'É', F: 'Ƒ', G: 'Ğ', H: 'Ĥ', I: 'Í', J: 'Ĵ',
  K: 'Ķ', L: 'Ĺ', M: 'M', N: 'Ñ', O: 'Ó', P: 'Þ', Q: 'Q', R: 'Ŕ', S: 'Š', T: 'Ţ',
  U: 'Ú', V: 'V', W: 'Ŵ', X: 'X', Y: 'Ý', Z: 'Ž',
};

/** Transforms only text outside ICU `{…}` arguments so placeholder parity
 *  (text gate 3) holds by construction. */
function mapOutsideBraces(message: string, mapChar: (ch: string) => string): string {
  let depth = 0;
  let out = '';
  for (const ch of message) {
    if (ch === '{') depth++;
    if (ch === '}') depth = Math.max(0, depth - 1);
    out += depth === 0 && ch !== '}' ? mapChar(ch) : ch;
  }
  return out;
}

export function toPseudoExpand(message: string): string {
  const accented = mapOutsideBraces(message, (ch) => ACCENT_MAP[ch] ?? ch);
  const letters = [...message].filter((c) => /[a-zA-Z]/.test(c)).length;
  const padding = '·'.repeat(Math.ceil(letters * 0.4));
  return `⟦${accented}${padding}⟧`;
}

export function toPseudoCjk(message: string): string {
  const mapped = mapOutsideBraces(message, (ch) => {
    const code = ch.charCodeAt(0);
    if (/[a-zA-Z]/.test(ch)) return String.fromCharCode(0x4e00 + (code * 37) % 0x2000);
    return ch;
  });
  return `「${mapped}」`;
}

function transformLocale(base: LocaleText, transform: (s: string) => string): LocaleText {
  const ui = Object.fromEntries(
    Object.entries(base.ui).map(([k, v]) => [k, transform(v)]),
  );
  const content = Object.fromEntries(
    Object.entries(base.content).map(([domain, entries]) => [
      domain,
      Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, transform(v)])),
    ]),
  );
  return { ui, content };
}

function writeLocale(root: string, localeId: string, text: LocaleText) {
  const dir = join(root, 'text', localeId);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'content'), { recursive: true });
  const stable = (obj: Record<string, string>) =>
    JSON.stringify(Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : 1))), null, 2) + '\n';
  writeFileSync(join(dir, 'ui.json'), stable(text.ui));
  for (const [domain, entries] of Object.entries(text.content)) {
    writeFileSync(join(dir, 'content', `${domain}.json`), stable(entries));
  }
}

export function generatePseudoLocales(root: string = packageRoot): void {
  const tree = loadTextTree(root);
  const base = tree.byLocale['en'];
  if (!base) throw new Error('base locale en missing');
  writeLocale(root, 'pseudo-expand', transformLocale(base, toPseudoExpand));
  writeLocale(root, 'pseudo-cjk', transformLocale(base, toPseudoCjk));
}


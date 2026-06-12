import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localesFile, uiTextCatalog, contentTextResource, type LocaleDef } from '../schemas/text.js';

export const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export interface LocaleText {
  ui: Record<string, string>;
  content: Record<string, Record<string, string>>;
}

export interface TextTree {
  locales: LocaleDef[];
  byLocale: Record<string, LocaleText>;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Reads and schema-validates the whole `text/` tree from disk (Node-side:
 *  gates, CLI, generators). The client imports catalogs as files instead. */
export function loadTextTree(root: string = packageRoot): TextTree {
  const textDir = join(root, 'text');
  const locales = localesFile.parse(readJson(join(textDir, 'locales.json')));
  const byLocale: Record<string, LocaleText> = {};
  for (const locale of locales) {
    const dir = join(textDir, locale.id);
    if (!existsSync(dir)) continue;
    const ui = uiTextCatalog.parse(readJson(join(dir, 'ui.json')));
    const content: Record<string, Record<string, string>> = {};
    const contentDir = join(dir, 'content');
    if (existsSync(contentDir)) {
      for (const file of readdirSync(contentDir).filter((f) => f.endsWith('.json')).sort()) {
        content[file.replace(/\.json$/, '')] = contentTextResource.parse(
          readJson(join(contentDir, file)),
        );
      }
    }
    byLocale[locale.id] = { ui, content };
  }
  return { locales, byLocale };
}

/** Raw `data/` documents for schema-level validation reporting. */
export function loadRawData(root: string = packageRoot): Record<string, unknown> {
  const dataDir = join(root, 'data');
  const out: Record<string, unknown> = {};
  for (const file of readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort()) {
    out[file] = readJson(join(dataDir, file));
  }
  return out;
}

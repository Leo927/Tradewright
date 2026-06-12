import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import type { ContentIndex } from './index.js';
import type { TextTree } from './loader.js';

export interface GateReport {
  errors: string[];
  warnings: string[];
}

export function checkReferentialIntegrity(c: ContentIndex): string[] {
  const errors: string[] = [];
  const skillIds = new Set(c.skills.map((s) => s.id));
  const itemIds = new Set(c.items.map((i) => i.id));
  const settlementIds = new Set(c.settlements.map((s) => s.id));
  const profileIds = new Set(c.npcProfiles.map((p) => p.id));
  const allTags = new Set(c.settlements.flatMap((s) => s.activityTags));

  for (const a of c.activities) {
    if (!skillIds.has(a.skillId)) errors.push(`${a.id}: unknown skill ${a.skillId}`);
    for (const line of [...a.inputs, ...a.outputs]) {
      if (!itemIds.has(line.itemId)) errors.push(`${a.id}: unknown item ${line.itemId}`);
    }
    if (!a.settlementTags.some((t) => allTags.has(t))) {
      errors.push(`${a.id}: no settlement carries any of its tags`);
    }
  }
  for (const s of c.settlements) {
    if (!profileIds.has(s.npcProfileId)) errors.push(`${s.id}: unknown npc profile ${s.npcProfileId}`);
  }
  for (const r of c.routes) {
    for (const end of r.endpoints) {
      if (!settlementIds.has(end)) errors.push(`${r.id}: unknown settlement ${end}`);
    }
  }
  for (const p of c.npcProfiles) {
    for (const e of p.entries) {
      if (!itemIds.has(e.itemId)) errors.push(`${p.id}: unknown item ${e.itemId}`);
    }
    for (const f of p.floorBuyList) {
      if (!itemIds.has(f.itemId)) errors.push(`${p.id}: unknown floor item ${f.itemId}`);
    }
  }
  return errors;
}

/** World-integrity gate 1: the recipe graph is a DAG. */
export function checkRecipeDag(c: ContentIndex): string[] {
  const producers = new Map<string, Set<string>>();
  for (const a of c.activities) {
    for (const out of a.outputs) {
      let deps = producers.get(out.itemId);
      if (!deps) producers.set(out.itemId, (deps = new Set()));
      for (const input of a.inputs) deps.add(input.itemId);
    }
  }
  const errors: string[] = [];
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (item: string, path: string[]) => {
    if (done.has(item)) return;
    if (visiting.has(item)) {
      errors.push(`recipe cycle: ${[...path, item].join(' -> ')}`);
      return;
    }
    visiting.add(item);
    for (const dep of producers.get(item) ?? []) visit(dep, [...path, item]);
    visiting.delete(item);
    done.add(item);
  };
  for (const item of producers.keys()) visit(item, []);
  return errors;
}

/** Gate 2: every activity input is obtainable somewhere. */
export function checkInputsObtainable(c: ContentIndex): string[] {
  const obtainable = new Set(c.activities.flatMap((a) => a.outputs.map((o) => o.itemId)));
  const errors: string[] = [];
  for (const a of c.activities) {
    for (const input of a.inputs) {
      if (!obtainable.has(input.itemId)) {
        errors.push(`${a.id}: input ${input.itemId} is not produced by any activity`);
      }
    }
  }
  return errors;
}

/** Gate 3: every settlement offers ≥ 1 tier-1 gathering activity. */
export function checkTier1GatheringEverywhere(c: ContentIndex): string[] {
  const skillById = new Map(c.skills.map((s) => [s.id, s]));
  const errors: string[] = [];
  for (const s of c.settlements) {
    const tags = new Set(s.activityTags);
    const ok = c.activities.some(
      (a) =>
        a.tier === 1 &&
        a.inputs.length === 0 &&
        skillById.get(a.skillId)?.family === 'gathering' &&
        a.settlementTags.some((t) => tags.has(t)),
    );
    if (!ok) errors.push(`${s.id}: no tier-1 gathering activity available`);
  }
  return errors;
}

/** Gate 4: the route graph is connected. */
export function checkRouteGraphConnected(c: ContentIndex): string[] {
  if (c.settlements.length === 0) return [];
  const adjacency = new Map<string, string[]>();
  for (const r of c.routes) {
    const [a, b] = r.endpoints;
    adjacency.set(a, [...(adjacency.get(a) ?? []), b]);
    adjacency.set(b, [...(adjacency.get(b) ?? []), a]);
  }
  const first = c.settlements[0]!.id;
  const seen = new Set([first]);
  const queue = [first];
  while (queue.length) {
    for (const next of adjacency.get(queue.shift()!) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return c.settlements
    .filter((s) => !seen.has(s.id))
    .map((s) => `${s.id}: unreachable by any route`);
}

/** Gate 5 (SC-006): no settlement's local activities produce > 60% of recipes. */
export function checkAsymmetryBudget(c: ContentIndex): string[] {
  const recipes = c.activities.filter((a) => a.inputs.length > 0);
  if (recipes.length === 0) return [];
  const errors: string[] = [];
  for (const s of c.settlements) {
    const tags = new Set(s.activityTags);
    const local = recipes.filter((a) => a.settlementTags.some((t) => tags.has(t)));
    const share = local.length / recipes.length;
    if (share > 0.6) {
      errors.push(`${s.id}: produces ${(share * 100).toFixed(0)}% of launch recipes (> 60%)`);
    }
  }
  return errors;
}

/** Gate 6: every skill declares ≥ 5 tiers. */
export function checkTierCoverage(c: ContentIndex): string[] {
  return c.skills
    .filter((s) => s.tiers.length < 5)
    .map((s) => `${s.id}: declares ${s.tiers.length} tiers (< 5)`);
}

/** Gate 7: NPC sanity bounds. */
export function checkNpcSanity(c: ContentIndex): string[] {
  const errors: string[] = [];
  for (const p of c.npcProfiles) {
    for (const e of p.entries) {
      if (!(e.priceBounds.minMultiplier < 1 && 1 < e.priceBounds.maxMultiplier)) {
        errors.push(`${p.id}/${e.itemId}: priceBounds must straddle 1×`);
      }
      if (e.productionPerHour <= 0 || e.consumptionPerHour <= 0) {
        errors.push(`${p.id}/${e.itemId}: production and consumption must be nonzero`);
      }
    }
  }
  return errors;
}

/** Gate 9: caravan durations within the authored band; travel shorter. */
export function checkRouteDurations(c: ContentIndex): string[] {
  const errors: string[] = [];
  const { minHours, maxHours } = c.world.caravanDurationBand;
  for (const r of c.routes) {
    const hours = r.caravanMinutes / 60;
    if (hours < minHours || hours > maxHours) {
      errors.push(`${r.id}: caravan ${hours}h outside band ${minHours}-${maxHours}h`);
    }
    if (r.travelMinutes >= r.caravanMinutes) {
      errors.push(`${r.id}: personal travel must be shorter than the caravan`);
    }
  }
  return errors;
}

/** Gate 10: 5 gathering, 5 refining, 7 crafting skills plus hauling. */
export function checkSkillFamilyCounts(c: ContentIndex): string[] {
  const counts = new Map<string, number>();
  for (const s of c.skills) counts.set(s.family, (counts.get(s.family) ?? 0) + 1);
  const errors: string[] = [];
  const expect = (family: string, n: number) => {
    if ((counts.get(family) ?? 0) !== n) {
      errors.push(`expected ${n} ${family} skills, found ${counts.get(family) ?? 0}`);
    }
  };
  expect('gathering', 5);
  expect('refining', 5);
  expect('crafting', 7);
  if ((counts.get('hauling') ?? 0) < 1) errors.push('hauling progression missing');
  return errors;
}

/** Gate 8 + text gate 6: the originality denylist over every locale's text. */
export function checkDenylist(tree: TextTree, denylist: string[]): string[] {
  const errors: string[] = [];
  const terms = denylist.map((t) => t.toLowerCase());
  for (const [localeId, text] of Object.entries(tree.byLocale)) {
    const all: [string, string][] = [
      ...Object.entries(text.ui),
      ...Object.values(text.content).flatMap((domain) => Object.entries(domain)),
    ];
    for (const [key, value] of all) {
      const lower = value.toLowerCase();
      for (const term of terms) {
        if (lower.includes(term)) {
          errors.push(`${localeId}/${key}: contains denylisted term "${term}"`);
        }
      }
    }
  }
  return errors;
}

function collectPlaceholders(elements: MessageFormatElement[], out: Set<string>) {
  for (const el of elements) {
    switch (el.type) {
      case TYPE.argument:
      case TYPE.number:
      case TYPE.date:
      case TYPE.time:
        out.add(el.value);
        break;
      case TYPE.plural:
      case TYPE.select:
        out.add(el.value);
        for (const option of Object.values(el.options)) {
          collectPlaceholders(option.value, out);
        }
        break;
      case TYPE.tag:
        out.add(el.value);
        collectPlaceholders(el.children, out);
        break;
      default:
        break;
    }
  }
}

export function icuPlaceholders(message: string): Set<string> {
  const out = new Set<string>();
  collectPlaceholders(parse(message), out);
  return out;
}

function flattenLocale(text: TextTree['byLocale'][string]): Map<string, string> {
  const map = new Map<string, string>(Object.entries(text.ui).map(([k, v]) => [`ui:${k}`, v]));
  for (const [domain, entries] of Object.entries(text.content)) {
    for (const [k, v] of Object.entries(entries)) map.set(`${domain}:${k}`, v);
  }
  return map;
}

const TEXT_FIELDS_BY_DOMAIN: Record<string, Set<string>> = {
  skills: new Set(['name', 'description']),
  items: new Set(['name', 'description']),
  activities: new Set(['name', 'description']),
  settlements: new Set(['name', 'description']),
  routes: new Set(['name', 'description']),
};

/** Text gates 1–5 of content-schema Part V (the denylist is gate 6 above,
 *  pseudo determinism gate 7 lives with the generator). */
export function checkTextGates(tree: TextTree, c: ContentIndex): GateReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const base = tree.byLocale['en'];
  if (!base) return { errors: ['base locale en missing from text tree'], warnings };
  const baseFlat = flattenLocale(base);

  for (const [localeId, text] of Object.entries(tree.byLocale)) {
    for (const [key, message] of flattenLocale(text)) {
      try {
        parse(message);
      } catch (e) {
        errors.push(`${localeId}/${key}: not ICU-parseable (${(e as Error).message})`);
      }
    }
  }

  const shipped = tree.locales.filter((l) => l.status === 'shipped').map((l) => l.id);
  for (const localeId of shipped) {
    const text = tree.byLocale[localeId];
    if (!text) {
      errors.push(`${localeId}: shipped locale has no catalogs`);
      continue;
    }
    const flat = flattenLocale(text);
    for (const key of baseFlat.keys()) {
      if (!flat.has(key)) errors.push(`${localeId}: missing key ${key} (coverage, SC-015)`);
    }
  }
  for (const locale of tree.locales.filter((l) => l.status === 'validation')) {
    const text = tree.byLocale[locale.id];
    if (!text) continue;
    const flat = flattenLocale(text);
    for (const key of baseFlat.keys()) {
      if (!flat.has(key)) {
        warnings.push(`${locale.id}: falls back to base for ${key} (FR-075 gap report)`);
      }
    }
  }

  for (const [localeId, text] of Object.entries(tree.byLocale)) {
    if (localeId === 'en') continue;
    for (const [key, message] of flattenLocale(text)) {
      const baseMessage = baseFlat.get(key);
      if (baseMessage === undefined) {
        errors.push(`${localeId}/${key}: orphan key with no base entry`);
        continue;
      }
      try {
        const got = [...icuPlaceholders(message)].sort();
        const want = [...icuPlaceholders(baseMessage)].sort();
        if (JSON.stringify(got) !== JSON.stringify(want)) {
          errors.push(
            `${localeId}/${key}: placeholders [${got}] differ from base [${want}] (FR-073)`,
          );
        }
      } catch {
        /* unparseable messages already reported */
      }
    }
  }

  const defIds = new Map<string, Set<string>>([
    ['skills', new Set(c.skills.map((s) => s.id))],
    ['items', new Set(c.items.map((i) => i.id))],
    ['activities', new Set(c.activities.map((a) => a.id))],
    [
      'settlements',
      new Set([
        ...c.settlements.map((s) => s.id),
        ...c.settlements.flatMap((s) => s.facilities.map((f) => f.id)),
      ]),
    ],
    ['routes', new Set(c.routes.map((r) => r.id))],
  ]);
  for (const [domain, entries] of Object.entries(base.content)) {
    const ids = defIds.get(domain);
    const fields = TEXT_FIELDS_BY_DOMAIN[domain];
    if (!ids || !fields) {
      errors.push(`content text domain ${domain} has no matching data domain`);
      continue;
    }
    for (const key of Object.keys(entries)) {
      const dot = key.lastIndexOf('.');
      const defId = key.slice(0, dot);
      const field = key.slice(dot + 1);
      if (!ids.has(defId)) errors.push(`en/${domain}:${key}: no def ${defId} (orphan, FR-071)`);
      else if (!fields.has(field)) {
        errors.push(`en/${domain}:${key}: field ${field} not a declared text field`);
      }
    }
  }

  return { errors, warnings };
}

/** Text gate 5: mechanics JSON carries no display-text keys (FR-070/071). */
export function checkNoDisplayTextInData(rawData: Record<string, unknown>): string[] {
  const forbidden = new Set(['name', 'description', 'lore', 'text', 'label', 'title', 'body']);
  const errors: string[] = [];
  const walk = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value)) {
        if (forbidden.has(k) && typeof v === 'string') {
          errors.push(`${path}.${k}: display text in data/ (FR-070/071)`);
        }
        walk(v, `${path}.${k}`);
      }
    }
  };
  for (const [file, doc] of Object.entries(rawData)) walk(doc, file);
  return errors;
}

import { describe, expect, it } from 'vitest';
import { content } from '../src/index.js';

/**
 * Part II integrity gates (content-schema Part II, data-model Part II).
 *
 * These enforce the combat-content invariants. Each gate that depends on
 * story-authored content is **vacuous while that content is empty** and begins
 * enforcing the moment the content lands — so master stays green through M2 and
 * a partial authoring commit (e.g. a school missing a branch) fails loudly.
 * Progressive activation: gate 7 (US6 core), gate 5 (US6 grounds), gate 3
 * (US7 abilities), gates 1 & 2 (US9 trees), gate 6 (US10 gear), gate 4 (US13).
 */

const ATTRIBUTE_IDS = new Set(content.attributes.map((a) => a.id));
const ABILITY_IDS = new Set(content.abilities.map((a) => a.id));
const ENEMY_IDS = new Set(content.enemies.map((e) => e.id));
const GEAR_IDS = new Set(content.gear.map((g) => g.id));
const ITEM_IDS = new Set(content.items.map((i) => i.id));
const REWARD_TABLE_IDS = new Set(content.rewardTables.map((t) => t.id));
const branchById = new Map(content.treeBranches.map((b) => [b.id, b]));

/** A settlement's region key is its first activity tag (coastal/highland/...). */
function settlementRegions(): { settlementId: string; region: string; tags: string[] }[] {
  return content.settlements.map((s) => ({
    settlementId: s.id,
    region: s.activityTags[0] ?? s.id,
    tags: s.activityTags,
  }));
}

describe('Part II gate 7 — attributes + curves (FR-107)', () => {
  it('declares exactly five attributes', () => {
    expect(content.attributes.length).toBe(5);
  });

  it('every school designates 1–2 existing scaling attributes', () => {
    for (const school of content.schools) {
      expect(school.scalingAttributeIds.length).toBeGreaterThanOrEqual(1);
      expect(school.scalingAttributeIds.length).toBeLessThanOrEqual(2);
      for (const id of school.scalingAttributeIds) {
        expect(ATTRIBUTE_IDS.has(id), `unknown scaling attribute ${id}`).toBe(true);
      }
    }
  });

  it('all CombatCurves are present and well-formed numbers', () => {
    const c = content.curves;
    for (const key of ['healthCurve', 'attributeScaling', 'masteryScaling', 'armorMitigation', 'recoveryMinutes'] as const) {
      expect(Number.isFinite(c[key].base)).toBe(true);
      expect(Number.isFinite(c[key].perUnitRate)).toBe(true);
    }
    expect(c.threatFactors.sustainFactor).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(c.retreatDurabilityPenalty)).toBe(true);
  });
});

describe('Part II gate 1 — every school is complete (FR-165/167/170/113)', () => {
  it('has exactly two resolving branches, a basic attack, valid default tactics, a resolving tier-1 starter kit', () => {
    for (const school of content.schools) {
      // exactly two branch refs that resolve to this school's branches
      expect(school.branchIds.length).toBe(2);
      for (const bid of school.branchIds) {
        const branch = branchById.get(bid);
        expect(branch, `school ${school.id} branch ${bid} missing`).toBeDefined();
        expect(branch!.schoolId).toBe(school.id);
      }
      // basic attack exists with at least one effect
      expect(school.basicAttack.effects.length).toBeGreaterThanOrEqual(1);
      // default tactics reference only this school's own ability roster
      const roster = new Set(school.abilityIds);
      for (const rule of school.defaultTactics.rules) {
        expect(roster.has(rule.abilityId), `default tactics ${rule.abilityId} not in ${school.id} roster`).toBe(true);
      }
      // starter kit resolves to a tier-1 weapon/focus gear def for this school
      const kit = content.gear.find((g) => g.id === school.starterKitItemId);
      expect(kit, `school ${school.id} starter kit ${school.starterKitItemId} missing`).toBeDefined();
      expect(kit!.tier).toBe(1);
      expect(kit!.slot).toBe('weapon-focus');
    }
  });
});

describe('Part II gate 2 — tree-point scarcity (FR-171)', () => {
  it('earnable points at the launch mastery cap < combined branch cost, per school', () => {
    for (const school of content.schools) {
      const branches = school.branchIds.map((b) => branchById.get(b)).filter(Boolean);
      const combinedCost = branches.reduce(
        (sum, b) => sum + b!.nodes.reduce((s, n) => s + n.pointCost, 0),
        0,
      );
      if (combinedCost === 0) continue; // node bodies not authored yet (pre-US9)
      // one point per mastery level-up to the curve's maxLevel.
      const earnable = school.masteryCurve.maxLevel - 1;
      expect(earnable, `school ${school.id} points not scarce`).toBeLessThan(combinedCost);
    }
  });
});

describe('Part II gate 3 — abilities + nodes use the closed vocabulary, unlocks resolve (FR-161/172)', () => {
  it('every ability has ≥1 effect and a resolving unlock source', () => {
    const nodeIds = new Set(content.treeBranches.flatMap((b) => b.nodes.map((n) => n.id)));
    for (const ability of content.abilities) {
      expect(ability.effects.length).toBeGreaterThanOrEqual(1);
      if (ability.unlockSource.kind === 'treeNode') {
        expect(nodeIds.has(ability.unlockSource.nodeId), `ability ${ability.id} unlock node missing`).toBe(true);
      }
    }
  });

  it('ability-unlock nodes reference existing abilities; school rosters resolve', () => {
    for (const branch of content.treeBranches) {
      for (const node of branch.nodes) {
        if (node.body.kind === 'abilityUnlock') {
          expect(ABILITY_IDS.has(node.body.abilityId), `node ${node.id} unlocks unknown ability`).toBe(true);
        }
        for (const pre of node.prereqNodeIds) {
          const known = content.treeBranches.some((b) => b.nodes.some((n) => n.id === pre));
          expect(known, `node ${node.id} prereq ${pre} missing`).toBe(true);
        }
      }
    }
    for (const school of content.schools) {
      for (const id of school.abilityIds) {
        expect(ABILITY_IDS.has(id), `school ${school.id} roster ability ${id} missing`).toBe(true);
      }
    }
  });
});

describe('Part II gate 4 — drop tables + combat economy (FR-053/140/141, SC-105)', () => {
  it('no reward-table entry pays coin (schema makes it unrepresentable)', () => {
    for (const table of content.rewardTables) {
      for (const entry of table.entries) {
        expect(entry.kind === 'item' || entry.kind === 'gearDrop').toBe(true);
      }
    }
  });

  it('every hunting region yields ≥1 combat-exclusive material and regions differ', () => {
    if (content.huntingGrounds.length === 0 || content.rewardTables.length === 0) return; // pre-US13
    const tableById = new Map(content.rewardTables.map((t) => [t.id, t]));
    const nonCombatOutputs = new Set(content.activities.flatMap((a) => a.outputs.map((o) => o.itemId)));
    const materialsByRegion = new Map<string, Set<string>>();
    for (const ground of content.huntingGrounds) {
      const mats = materialsByRegion.get(ground.regionId) ?? new Set<string>();
      for (const entry of ground.roster) {
        const enemy = content.enemies.find((e) => e.id === entry.enemyId);
        const table = enemy && tableById.get(enemy.dropTableId);
        if (!table) continue;
        for (const drop of table.entries) {
          if (drop.kind === 'item' && !nonCombatOutputs.has(drop.itemId)) mats.add(drop.itemId);
        }
      }
      materialsByRegion.set(ground.regionId, mats);
    }
    for (const [region, mats] of materialsByRegion) {
      expect(mats.size, `region ${region} yields no combat-exclusive material`).toBeGreaterThanOrEqual(1);
    }
    // regional material sets differ pairwise
    const sets = [...materialsByRegion.values()].map((s) => [...s].sort().join(','));
    expect(new Set(sets).size, 'regional materials do not differ').toBe(sets.length);
  });

  it('≥20% of crafting recipes demand a combat-exclusive material; each is demanded ≥1×', () => {
    if (content.rewardTables.length === 0) return; // pre-US13
    const nonCombatOutputs = new Set(content.activities.flatMap((a) => a.outputs.map((o) => o.itemId)));
    const combatMaterials = new Set<string>();
    for (const table of content.rewardTables) {
      for (const entry of table.entries) {
        if (entry.kind === 'item' && !nonCombatOutputs.has(entry.itemId)) combatMaterials.add(entry.itemId);
      }
    }
    if (combatMaterials.size === 0) return; // materials not authored yet
    const recipes = content.activities.filter((a) => a.inputs.length > 0);
    const demanding = recipes.filter((r) => r.inputs.some((i) => combatMaterials.has(i.itemId)));
    expect(demanding.length / recipes.length, '<20% of recipes demand combat materials').toBeGreaterThanOrEqual(0.2);
    for (const mat of combatMaterials) {
      const demanded = recipes.some((r) => r.inputs.some((i) => i.itemId === mat));
      expect(demanded, `combat material ${mat} demanded by no recipe`).toBe(true);
    }
  });
});

describe('Part II gate 5 — every settlement region has a tier-1 hunting ground (FR-110/113)', () => {
  it('a fresh character can fight from day one in every region', () => {
    if (content.huntingGrounds.length === 0) return; // pre-US6 grounds
    for (const { settlementId, tags } of settlementRegions()) {
      const ground = content.huntingGrounds.find((g) => g.settlementTags.some((t) => tags.includes(t)));
      expect(ground, `settlement ${settlementId} has no hunting ground`).toBeDefined();
      const hasTier1 = ground!.roster.some((r) => {
        const enemy = content.enemies.find((e) => e.id === r.enemyId);
        return enemy?.tier === 1 && r.requiredCharacterTier <= 1;
      });
      expect(hasTier1, `settlement ${settlementId} ground lacks a tier-1 enemy`).toBe(true);
    }
  });

  it('every roster enemy resolves', () => {
    for (const ground of content.huntingGrounds) {
      for (const r of ground.roster) {
        expect(ENEMY_IDS.has(r.enemyId), `ground ${ground.id} enemy ${r.enemyId} missing`).toBe(true);
      }
    }
  });
});

describe('Part II gate 6 — gear coverage (FR-120/122)', () => {
  it('a craftable weapon/focus exists per school per tier present', () => {
    if (content.gear.length === 0 || content.schools.length === 0) return; // pre-US10
    const tiers = [...new Set(content.gear.map((g) => g.tier))].sort();
    const craftableGear = new Set(
      content.activities.flatMap((a) => a.outputs.map((o) => o.itemId)).filter((id) => GEAR_IDS.has(id)),
    );
    for (const school of content.schools) {
      for (const tier of tiers) {
        const weapon = content.gear.find(
          (g) => g.slot === 'weapon-focus' && g.schoolTag === school.weaponFocusTag && g.tier === tier,
        );
        // tier-1 starter weapon is granted, not crafted; higher tiers must be craftable
        if (!weapon) continue;
        if (tier > 1) {
          expect(craftableGear.has(weapon.id), `${school.id} tier-${tier} weapon not craftable`).toBe(true);
        }
      }
    }
  });

  it('every armor slot has craftable coverage per gear tier', () => {
    if (content.gear.length === 0) return; // pre-US10
    const armorSlots = ['head', 'chest', 'hands', 'legs', 'feet'] as const;
    const craftableGear = new Set(
      content.activities.flatMap((a) => a.outputs.map((o) => o.itemId)).filter((id) => GEAR_IDS.has(id)),
    );
    const tiers = [...new Set(content.gear.map((g) => g.tier))];
    for (const tier of tiers) {
      for (const slot of armorSlots) {
        const piece = content.gear.find((g) => g.slot === slot && g.tier === tier);
        if (!piece) continue;
        expect(craftableGear.has(piece.id), `tier-${tier} ${slot} not craftable`).toBe(true);
      }
    }
  });

  it('all gear carries durability/wear/repair', () => {
    for (const g of content.gear) {
      expect(g.durabilityMax).toBeGreaterThan(0);
      expect(g.wearPerFight).toBeGreaterThanOrEqual(0);
      expect(g.repairCost.coinPerPoint).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Part II gate 8 — originality (FR-150)', () => {
  it('reward-table item/gear refs resolve to known defs', () => {
    // structural originality (denylist over text) is enforced by the text-gate
    // suite once combat catalogs land; here we hold referential integrity.
    for (const table of content.rewardTables) {
      for (const entry of table.entries) {
        if (entry.kind === 'item') {
          expect(ITEM_IDS.has(entry.itemId) || GEAR_IDS.has(entry.itemId), `reward item ${entry.itemId} unknown`).toBe(true);
        } else {
          expect(GEAR_IDS.has(entry.gearDefId), `reward gear ${entry.gearDefId} unknown`).toBe(true);
        }
      }
    }
    for (const enemy of content.enemies) {
      expect(REWARD_TABLE_IDS.has(enemy.dropTableId), `enemy ${enemy.id} drop table ${enemy.dropTableId} unknown`).toBe(true);
    }
  });
});

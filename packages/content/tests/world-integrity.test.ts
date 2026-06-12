import { describe, expect, it } from 'vitest';
import { content, type ContentIndex } from '../src/index.js';
import {
  checkRecipeDag,
  checkInputsObtainable,
  checkTier1GatheringEverywhere,
  checkRouteGraphConnected,
  checkAsymmetryBudget,
  checkTierCoverage,
  checkNpcSanity,
  checkRouteDurations,
  checkSkillFamilyCounts,
} from '../src/gates.js';

describe('world integrity gates (content-schema Part I, gates 1-7 & 9-10)', () => {
  it('gate 1: the recipe graph is a DAG', () => {
    expect(checkRecipeDag(content)).toEqual([]);
  });

  it('gate 1 detects a cycle', () => {
    const cyclic: ContentIndex = {
      ...content,
      activities: [
        ...content.activities,
        {
          id: 'activity.cycle',
          skillId: 'skill.smelting',
          tier: 1,
          actionSeconds: 60,
          inputs: [{ itemId: 'item.tin-bar', qty: 1 }],
          outputs: [{ itemId: 'item.tin-ore', qty: 1 }],
          xpPerAction: 1,
          settlementTags: ['highland'],
        },
      ],
    };
    expect(checkRecipeDag(cyclic).length).toBeGreaterThan(0);
  });

  it('gate 2: every activity input is obtainable', () => {
    expect(checkInputsObtainable(content)).toEqual([]);
  });

  it('gate 3: every settlement offers a tier-1 gathering activity', () => {
    expect(checkTier1GatheringEverywhere(content)).toEqual([]);
  });

  it('gate 4: the route graph is connected', () => {
    expect(checkRouteGraphConnected(content)).toEqual([]);
  });

  it('gate 4 detects an unreachable settlement', () => {
    const cut = { ...content, routes: content.routes.slice(0, 1) };
    expect(checkRouteGraphConnected(cut).length).toBeGreaterThan(0);
  });

  it('gate 5 (SC-006): no settlement produces > 60% of launch recipes', () => {
    expect(checkAsymmetryBudget(content)).toEqual([]);
  });

  it('gate 5 detects an over-concentrated settlement', () => {
    const concentrated: ContentIndex = {
      ...content,
      activities: content.activities.map((a) =>
        a.inputs.length > 0 ? { ...a, settlementTags: ['coastal'] } : a,
      ),
    };
    expect(checkAsymmetryBudget(concentrated).length).toBeGreaterThan(0);
  });

  it('gate 6: every skill declares >= 5 tiers', () => {
    expect(checkTierCoverage(content)).toEqual([]);
  });

  it('gate 7: NPC sanity bounds hold', () => {
    expect(checkNpcSanity(content)).toEqual([]);
  });

  it('gate 9: caravan durations inside the authored band, travel shorter', () => {
    expect(checkRouteDurations(content)).toEqual([]);
  });

  it('gate 9 detects an out-of-band route', () => {
    const slow: ContentIndex = {
      ...content,
      routes: [{ ...content.routes[0]!, caravanMinutes: 600 }],
    };
    expect(checkRouteDurations(slow).length).toBeGreaterThan(0);
  });

  it('gate 10: 5 gathering + 5 refining + 7 crafting skills plus hauling', () => {
    expect(checkSkillFamilyCounts(content)).toEqual([]);
  });
});

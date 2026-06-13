import { describe, expect, it } from 'vitest';
import type {
  CombatCommand,
  CombatQuery,
  CombatEvent,
  HuntingGroundView,
  SchoolView,
  LoadoutView,
  ExpeditionView,
  CombatLogPage,
  RecoveryView,
  TacticsProgram,
} from '../src/index.js';

const tactics: TacticsProgram = {
  rules: [
    { abilityId: 'ability.cleave', trigger: { kind: 'always' } },
    { abilityId: 'ability.mend', trigger: { kind: 'self-health-below', pct: 40 } },
    { abilityId: 'ability.rally', trigger: { kind: 'ally-health-below', pct: 50 } },
    { abilityId: 'ability.expose', trigger: { kind: 'debuff-present', ref: 'effect.sunder' } },
    { abilityId: 'ability.ward', trigger: { kind: 'buff-missing', ref: 'effect.guard' } },
    { abilityId: 'ability.opener', trigger: { kind: 'at-expedition-start' } },
    { abilityId: 'ability.finish', trigger: { kind: 'enemy-health-below', pct: 25 } },
    { abilityId: 'ability.poke', trigger: { kind: 'enemy-health-above', pct: 75 } },
  ],
};

const commands: CombatCommand[] = [
  { type: 'ChooseStartingSchool', schoolId: 'school.warbrand' },
  { type: 'StartExpedition', groundId: 'ground.coastal-shallows', enemyId: 'enemy.tide-crawler', confirmReplace: true },
  { type: 'RecallExpedition' },
  { type: 'TapCastAbility', abilityId: 'ability.cleave' },
  { type: 'EditTactics', tactics },
  { type: 'SetProvisionPlan', plan: [{ itemId: 'item.travel-ration', thresholdPct: 50 }] },
  { type: 'SetRetreatThreshold', thresholdPct: 25 },
  { type: 'EquipGear', slot: 'weapon-focus', instanceId: 'gear-1' },
  { type: 'UnequipGear', slot: 'head' },
  { type: 'SlotAbility', abilityId: 'ability.cleave' },
  { type: 'UnslotAbility', abilityId: 'ability.poke' },
  { type: 'SpendTreePoint', nodeId: 'node.warbrand-edge.1' },
  { type: 'Respec', schoolId: 'school.warbrand' },
  { type: 'RepairGear', instanceId: 'gear-1' },
];

const queries: CombatQuery[] = [
  { type: 'GetHuntingGrounds' },
  { type: 'GetSchools' },
  { type: 'GetLoadout', vsEnemyId: 'enemy.tide-crawler' },
  { type: 'GetExpedition' },
  { type: 'GetCombatLog', offset: 0, limit: 50 },
  { type: 'GetRecovery' },
];

const huntingGrounds: HuntingGroundView[] = [
  {
    groundId: 'ground.coastal-shallows',
    regionId: 'coastal',
    settlementTags: ['coastal'],
    roster: [
      {
        enemyId: 'enemy.tide-crawler',
        tier: 1,
        requiredCharacterTier: 1,
        locked: false,
        difficulty: 'even',
        drops: { itemDefIds: ['item.crawler-chitin'], gearDefIds: ['gear.crawler-charm'] },
      },
    ],
  },
];

const schools: SchoolView[] = [
  {
    schoolId: 'school.warbrand',
    flavor: 'weapon',
    active: true,
    masteryLevel: 3,
    masteryXp: 120,
    xpForNextLevel: 200,
    pointsAvailable: 2,
    abilities: [
      {
        abilityId: 'ability.cleave',
        cooldownSeconds: 4,
        unlockSource: { kind: 'mastery', level: 1 },
        unlocked: true,
        slotted: true,
      },
      {
        abilityId: 'ability.finish',
        cooldownSeconds: 8,
        unlockSource: { kind: 'treeNode', nodeId: 'node.warbrand-edge.2' },
        unlocked: false,
        slotted: false,
      },
    ],
    branches: [
      {
        branchId: 'branch.warbrand-edge',
        nodes: [
          {
            nodeId: 'node.warbrand-edge.1',
            pointCost: 1,
            prereqNodeIds: [],
            kind: 'passive',
            abilityId: null,
            spent: true,
            affordable: false,
          },
          {
            nodeId: 'node.warbrand-edge.2',
            pointCost: 1,
            prereqNodeIds: ['node.warbrand-edge.1'],
            kind: 'ability-unlock',
            abilityId: 'ability.finish',
            spent: false,
            affordable: true,
          },
        ],
      },
    ],
  },
];

const loadout: LoadoutView = {
  activeSchoolId: 'school.warbrand',
  equipped: [
    {
      slot: 'weapon-focus',
      instanceId: 'gear-1',
      itemDefId: 'gear.warbrand-tier1',
      gearScore: 100,
      durability: 40,
      durabilityMax: 50,
      broken: false,
    },
    { slot: 'head', instanceId: null, itemDefId: null, gearScore: null, durability: null, durabilityMax: null, broken: false },
  ],
  statTotals: {
    attributes: [{ attributeId: 'attr.might', points: 12 }],
    health: 250,
    armorPhys: 18,
    armorElem: 6,
  },
  slottedAbilities: [{ abilityId: 'ability.cleave', cooldownSeconds: 4 }],
  tactics,
  provisionPlan: [{ itemId: 'item.travel-ration', thresholdPct: 50 }],
  retreatThresholdPct: 25,
  fitnessHint: { enemyId: 'enemy.tide-crawler', difficulty: 'favored' },
  inertFlags: [{ kind: 'inert-rule', ref: 'ability.finish' }],
};

const expedition: ExpeditionView = {
  expeditionId: 'expedition-1',
  groundId: 'ground.coastal-shallows',
  enemyId: 'enemy.tide-crawler',
  state: 'fighting',
  endReason: null,
  combatants: [
    {
      ref: 'player',
      isEnemy: false,
      health: 240,
      healthMax: 250,
      cooldowns: [{ abilityId: 'ability.cleave', remainingSeconds: 2 }],
      buffs: [{ ref: 'effect.guard', remainingSeconds: 5 }],
      debuffs: [],
    },
    {
      ref: 'enemy.tide-crawler',
      isEnemy: true,
      health: 60,
      healthMax: 120,
      cooldowns: [],
      buffs: [],
      debuffs: [{ ref: 'effect.sunder', remainingSeconds: 3 }],
    },
  ],
  haulSoFar: {
    items: [{ itemId: 'item.crawler-chitin', qty: 2 }],
    gearInstanceIds: ['gear-7'],
    xp: 40,
    masteryXp: 12,
    points: 0,
  },
  provisionsRemaining: [{ itemId: 'item.travel-ration', qty: 3 }],
  tickCount: 18,
};

const combatLog: CombatLogPage = {
  entries: [
    {
      atTick: 1,
      kind: 'ability-cast',
      sourceRef: 'player',
      targetRef: 'enemy.tide-crawler',
      abilityId: 'ability.cleave',
      itemId: null,
      effectKind: 'damage-phys',
      amount: 30,
    },
    {
      atTick: 2,
      kind: 'provision-consumed',
      sourceRef: 'player',
      targetRef: 'player',
      abilityId: null,
      itemId: 'item.travel-ration',
      effectKind: 'heal',
      amount: 40,
    },
    {
      atTick: 3,
      kind: 'enemy-defeated',
      sourceRef: 'player',
      targetRef: 'enemy.tide-crawler',
      abilityId: null,
      itemId: null,
      effectKind: null,
      amount: null,
    },
  ],
  offset: 0,
  limit: 50,
  total: 3,
};

const recovery: RecoveryView = { recovering: true, untilTick: 600, remainingSeconds: 300 };

const events: CombatEvent[] = [
  { type: 'StarterKitGranted', schoolId: 'school.warbrand', itemId: 'gear.warbrand-tier1', instanceId: 'gear-1', atTick: 0 },
  { type: 'ExpeditionStarted', expeditionId: 'expedition-1', groundId: 'ground.coastal-shallows', enemyId: 'enemy.tide-crawler', atTick: 5 },
  {
    type: 'ExpeditionEnded',
    expeditionId: 'expedition-1',
    reason: 'retreat',
    haul: expedition.haulSoFar,
    durabilityDeltas: [{ instanceId: 'gear-1', delta: -3, durabilityAfter: 37 }],
    recoveryUntilTick: 600,
    atTick: 120,
  },
  {
    type: 'EnemyDefeated',
    expeditionId: 'expedition-1',
    enemyId: 'enemy.tide-crawler',
    combatSkillXp: 40,
    masteryXp: 12,
    loot: [{ itemId: 'item.crawler-chitin', qty: 2 }],
    gearInstanceIds: ['gear-7'],
    atTick: 30,
  },
  { type: 'CombatLogAppended', expeditionId: 'expedition-1', entries: combatLog.entries },
  { type: 'MasteryLeveled', schoolId: 'school.warbrand', level: 4, pointsAwarded: 1 },
  { type: 'GearBroke', instanceId: 'gear-1', slot: 'weapon-focus', atTick: 90 },
  { type: 'RecoveryEnded', atTick: 600 },
];

const queryResults: Record<string, unknown> = {
  'HuntingGroundView[]': huntingGrounds,
  'SchoolView[]': schools,
  LoadoutView: loadout,
  ExpeditionView: expedition,
  CombatLogPage: combatLog,
  RecoveryView: recovery,
};

const allDtos: [string, unknown][] = [
  ...commands.map((c): [string, unknown] => [`command:${c.type}`, c]),
  ...queries.map((q): [string, unknown] => [`query:${q.type}`, q]),
  ...events.map((e): [string, unknown] => [`event:${e.type}`, e]),
  ...Object.entries(queryResults).map(([k, v]): [string, unknown] => [`result:${k}`, v]),
];

describe('combat contract serializability (Principle V)', () => {
  it.each(allDtos)('%s JSON-round-trips losslessly', (_label, dto) => {
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });
});

/** Protocol Part V: every string-valued combat field is an id / code / ref —
 *  no rendered text crosses the contract. Synergy notes, ability/school names,
 *  and log prose all live in text catalogs, never these payloads (FR-074/076). */
const STRING_FIELD_ALLOWLIST = new Set([
  'type',
  'kind',
  'side',
  'state',
  'status',
  'reason',
  'endReason',
  'flavor',
  'difficulty',
  'effectKind',
  'slot',
  'schoolId',
  'groundId',
  'regionId',
  'enemyId',
  'abilityId',
  'instanceId',
  'itemId',
  'itemDefId',
  'nodeId',
  'branchId',
  'attributeId',
  'ref',
  'sourceRef',
  'targetRef',
  'activeSchoolId',
  'vsEnemyId',
  'expeditionId',
  'settlementTags',
  'itemDefIds',
  'gearDefIds',
  'gearInstanceIds',
  'prereqNodeIds',
]);

function collectStringFields(value: unknown, path: string[], out: { key: string; path: string }[]) {
  if (typeof value !== 'object' || value === null) return;
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === 'string') {
      out.push({ key, path: [...path, key].join('.') });
    } else if (Array.isArray(v)) {
      if (v.some((x) => typeof x === 'string')) out.push({ key, path: [...path, key].join('.') });
      v.forEach((x, i) => collectStringFields(x, [...path, key, String(i)], out));
    } else {
      collectStringFields(v, [...path, key], out);
    }
  }
}

describe('combat contract text-freedom audit (protocol Part V)', () => {
  it.each(allDtos)('%s declares no rendered-text field', (_label, dto) => {
    const found: { key: string; path: string }[] = [];
    collectStringFields(dto, [], found);
    const violations = found.filter((f) => !STRING_FIELD_ALLOWLIST.has(f.key));
    expect(violations).toEqual([]);
  });
});

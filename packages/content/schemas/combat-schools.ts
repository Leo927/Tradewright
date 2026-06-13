import { z } from 'zod';
import { slug } from './common.js';
import { effectExpr } from './effects.js';
import { xpCurve } from './skills.js';

/** Closed tactics trigger vocabulary (FR-166) — mirrors the contract's
 *  `TacticsTrigger`. Used by school `defaultTactics` (content) and player
 *  tactics (runtime). */
export const tacticsTrigger = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('always') }).strict(),
  z.object({ kind: z.literal('self-health-below'), pct: z.number().min(0).max(100) }).strict(),
  z.object({ kind: z.literal('enemy-health-above'), pct: z.number().min(0).max(100) }).strict(),
  z.object({ kind: z.literal('enemy-health-below'), pct: z.number().min(0).max(100) }).strict(),
  z.object({ kind: z.literal('ally-health-below'), pct: z.number().min(0).max(100) }).strict(),
  z.object({ kind: z.literal('buff-missing'), ref: slug }).strict(),
  z.object({ kind: z.literal('debuff-present'), ref: slug }).strict(),
  z.object({ kind: z.literal('at-expedition-start') }).strict(),
]);

export const tacticsRule = z
  .object({ abilityId: slug, trigger: tacticsTrigger })
  .strict();

export const tacticsProgram = z.object({ rules: z.array(tacticsRule) }).strict();

export const basicAttack = z
  .object({
    intervalSeconds: z.number().positive(),
    effects: z.array(effectExpr).min(1),
  })
  .strict();

export const unlockSource = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('mastery'), level: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal('treeNode'), nodeId: slug }).strict(),
]);

export const abilityDef = z
  .object({
    id: slug,
    schoolId: slug,
    cooldownSeconds: z.number().positive(),
    effects: z.array(effectExpr).min(1),
    /** Whether ability magnitude scales by the school's attributes + mastery. */
    magnitudeScaling: z.enum(['attribute-mastery', 'flat']),
    unlockSource,
  })
  .strict();

/** Node body: a passive (EffectExpr set) or an ability unlock. The exact effect
 *  text (FR-172) is display text in `text/.../content/combat/trees.json`. */
export const treeNodeBody = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('passive'), effects: z.array(effectExpr).min(1) }).strict(),
  z.object({ kind: z.literal('abilityUnlock'), abilityId: slug }).strict(),
]);

export const treeNodeDef = z
  .object({
    id: slug,
    prereqNodeIds: z.array(slug),
    pointCost: z.number().int().positive(),
    body: treeNodeBody,
  })
  .strict();

export const treeBranchDef = z
  .object({
    id: slug,
    schoolId: slug,
    nodes: z.array(treeNodeDef).min(1),
  })
  .strict();

export const schoolDef = z
  .object({
    id: slug,
    flavor: z.enum(['weapon', 'magic']),
    scalingAttributeIds: z.array(slug).min(1).max(2),
    /** Item tag that, when equipped in weapon-focus, activates this school. */
    weaponFocusTag: z.string().min(1),
    starterKitItemId: slug,
    /** Combat skill whose XP family drives character tier (data-model Part II). */
    combatSkillId: slug,
    masteryCurve: xpCurve,
    basicAttack,
    abilityIds: z.array(slug),
    /** Exactly two branch references into `trees.json` (TreeBranchDef ids). */
    branchIds: z.tuple([slug, slug]),
    defaultTactics: tacticsProgram,
  })
  .strict();

export const schoolsFile = z.array(schoolDef);
export const abilitiesFile = z.array(abilityDef);
export const treeBranchesFile = z.array(treeBranchDef);

export type TacticsTrigger = z.infer<typeof tacticsTrigger>;
export type TacticsRule = z.infer<typeof tacticsRule>;
export type TacticsProgram = z.infer<typeof tacticsProgram>;
export type AbilityDef = z.infer<typeof abilityDef>;
export type TreeNodeDef = z.infer<typeof treeNodeDef>;
export type TreeBranchDef = z.infer<typeof treeBranchDef>;
export type SchoolDef = z.infer<typeof schoolDef>;
export type UnlockSource = z.infer<typeof unlockSource>;

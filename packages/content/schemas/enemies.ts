import { z } from 'zod';
import { slug } from './common.js';
import { effectExpr } from './effects.js';

const attributePoints = z
  .object({ attributeId: slug, points: z.number().int().min(0) })
  .strict();

const armorRating = z
  .object({ phys: z.number().min(0), elem: z.number().min(0) })
  .strict();

const enemyAction = z
  .object({
    intervalSeconds: z.number().positive(),
    effects: z.array(effectExpr).min(1),
  })
  .strict();

export const enemyDef = z
  .object({
    id: slug,
    tier: z.number().int().positive(),
    family: slug,
    stats: z
      .object({
        attributes: z.array(attributePoints),
        health: z.number().positive(),
        armorRating,
      })
      .strict(),
    actions: z.array(enemyAction).min(1),
    xpAward: z
      .object({
        combatSkillXp: z.number().int().min(0),
        masteryXp: z.number().int().min(0),
      })
      .strict(),
    dropTableId: slug,
  })
  .strict();

export const huntingGroundDef = z
  .object({
    id: slug,
    regionId: slug,
    settlementTags: z.array(z.string()).min(1),
    roster: z
      .array(
        z
          .object({ enemyId: slug, requiredCharacterTier: z.number().int().positive() })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const enemiesFile = z.array(enemyDef);
export const huntingGroundsFile = z.array(huntingGroundDef);

export type EnemyDef = z.infer<typeof enemyDef>;
export type HuntingGroundDef = z.infer<typeof huntingGroundDef>;

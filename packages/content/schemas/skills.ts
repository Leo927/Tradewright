import { z } from 'zod';
import { slug } from './common.js';

export const tierDef = z
  .object({
    tier: z.number().int().positive(),
    levelThreshold: z.number().int().positive(),
  })
  .strict();

export const xpCurve = z
  .object({
    base: z.number().positive(),
    growth: z.number().min(1),
    maxLevel: z.number().int().positive(),
  })
  .strict();

export const skillDef = z
  .object({
    id: slug,
    family: z.enum(['gathering', 'refining', 'crafting', 'hauling', 'combat']),
    xpCurve,
    tiers: z.array(tierDef).min(5),
  })
  .strict();

export const skillsFile = z.array(skillDef);

export type SkillDef = z.infer<typeof skillDef>;
export type XpCurve = z.infer<typeof xpCurve>;
export type TierDef = z.infer<typeof tierDef>;

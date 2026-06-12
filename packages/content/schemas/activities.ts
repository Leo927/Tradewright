import { z } from 'zod';
import { slug, itemQty } from './common.js';

export const activityDef = z
  .object({
    id: slug,
    skillId: slug,
    tier: z.number().int().positive(),
    actionSeconds: z.number().positive(),
    inputs: z.array(itemQty),
    outputs: z.array(itemQty).min(1),
    xpPerAction: z.number().positive(),
    settlementTags: z.array(z.string()).min(1),
    stationFamily: slug.optional(),
  })
  .strict();

export const activitiesFile = z.array(activityDef);

export type ActivityDef = z.infer<typeof activityDef>;

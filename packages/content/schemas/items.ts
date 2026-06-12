import { z } from 'zod';
import { slug } from './common.js';

export const itemDef = z
  .object({
    id: slug,
    tier: z.number().int().positive(),
    weight: z.number().positive(),
    basePrice: z.number().positive(),
  })
  .strict();

export const itemsFile = z.array(itemDef);

export type ItemDef = z.infer<typeof itemDef>;

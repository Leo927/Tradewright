import { z } from 'zod';
import { slug } from './common.js';

export const npcItemEntry = z
  .object({
    itemId: slug,
    equilibriumStock: z.number().positive(),
    productionPerHour: z.number().min(0),
    consumptionPerHour: z.number().min(0),
    priceBounds: z
      .object({
        minMultiplier: z.number().positive(),
        maxMultiplier: z.number().positive(),
      })
      .strict(),
    orderBandWidth: z.number().min(0).max(1),
    orderDepth: z.number().int().positive(),
  })
  .strict();

export const npcMarketProfile = z
  .object({
    id: slug,
    entries: z.array(npcItemEntry).min(1),
    floorBuyList: z
      .array(z.object({ itemId: slug, floorPrice: z.number().positive() }).strict())
      .min(1),
    floorBudgetPerPeriod: z.number().positive(),
    sweep: z
      .object({
        periodTicks: z.number().int().positive(),
        budgetPerPeriod: z.number().positive(),
      })
      .strict(),
  })
  .strict();

export const npcProfilesFile = z.array(npcMarketProfile);

export type NpcMarketProfile = z.infer<typeof npcMarketProfile>;
export type NpcItemEntry = z.infer<typeof npcItemEntry>;

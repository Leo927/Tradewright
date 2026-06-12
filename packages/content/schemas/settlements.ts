import { z } from 'zod';
import { slug } from './common.js';

export const facilityDef = z
  .object({
    id: slug,
    kind: z.enum(['station', 'storage']),
    craftFamily: slug.optional(),
    baseTier: z.number().int().positive(),
  })
  .strict()
  .refine((f) => (f.kind === 'station') === (f.craftFamily !== undefined), {
    message: 'stations declare a craftFamily; storage facilities do not',
  });

export const storageExpansion = z
  .object({
    capacityPerLevel: z.number().positive(),
    costBase: z.number().positive(),
    costGrowth: z.number().min(1),
  })
  .strict();

export const settlementDef = z
  .object({
    id: slug,
    activityTags: z.array(z.string()).min(1),
    listingFeeRate: z.number().min(0).max(1),
    salesTaxRate: z.number().min(0).max(1),
    baseStorageCapacity: z.number().positive(),
    storageExpansion,
    facilities: z.array(facilityDef).min(1),
    npcProfileId: slug,
  })
  .strict();

export const settlementsFile = z.array(settlementDef);

export type SettlementDef = z.infer<typeof settlementDef>;
export type FacilityDef = z.infer<typeof facilityDef>;

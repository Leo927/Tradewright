import { z } from 'zod';

export const worldTuningDef = z
  .object({
    worldTickSeconds: z.number().positive(),
    marketCadenceTicks: z.number().int().positive(),
    offlineCapHours: z.number().positive(),
    caravanDurationBand: z
      .object({
        minHours: z.number().positive(),
        maxHours: z.number().positive(),
      })
      .strict(),
    starterCoin: z.number().int().positive(),
  })
  .strict();

export type WorldTuningDef = z.infer<typeof worldTuningDef>;

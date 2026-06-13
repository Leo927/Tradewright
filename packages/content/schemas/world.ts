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
    /** Hauling pacing — the single authored source for caravan capacity and
     *  slot growth; the engine reads these, never hardcodes them (Principle IV,
     *  FR-041). Capacity is weight units; slots are concurrent shipments. */
    caravan: z
      .object({
        baseCapacityWeight: z.number().positive(),
        capacityWeightPerLevel: z.number().min(0),
        baseSlots: z.number().int().positive(),
        slotsPerTier: z.number().int().min(0),
        haulingXpPerShipment: z.number().min(0),
      })
      .strict(),
  })
  .strict();

export type WorldTuningDef = z.infer<typeof worldTuningDef>;

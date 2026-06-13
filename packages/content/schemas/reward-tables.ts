import { z } from 'zod';
import { slug } from './common.js';

/** Shared reward-table shape, game-wide (research R7 combat). Entries reference
 *  an item stack or a gear drop only — **a coin entry is unrepresentable**
 *  (FR-053, the sole-faucet rule enforced by schema). */
const qtyRange = z
  .object({ min: z.number().int().positive(), max: z.number().int().positive() })
  .strict()
  .refine((q) => q.max >= q.min, { message: 'qty range max must be ≥ min' });

const rewardEntry = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('item'),
      itemId: slug,
      chance: z.number().min(0).max(1),
      qty: qtyRange,
    })
    .strict(),
  z
    .object({
      kind: z.literal('gearDrop'),
      gearDefId: slug,
      chance: z.number().min(0).max(1),
    })
    .strict(),
]);

export const rewardTableDef = z
  .object({
    id: slug,
    entries: z.array(rewardEntry),
  })
  .strict();

export const rewardTablesFile = z.array(rewardTableDef);

export type RewardTableDef = z.infer<typeof rewardTableDef>;
export type RewardEntry = z.infer<typeof rewardEntry>;

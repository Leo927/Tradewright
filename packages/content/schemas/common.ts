import { z } from 'zod';

export const slug = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

export const itemQty = z
  .object({
    itemId: slug,
    qty: z.number().int().positive(),
  })
  .strict();

export type ItemQty = z.infer<typeof itemQty>;

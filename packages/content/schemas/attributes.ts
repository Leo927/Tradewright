import { z } from 'zod';
import { slug } from './common.js';

/** Exactly five at launch (FR-107). Names/descriptions are display text and
 *  live in `text/<locale>/content/combat/attributes.json` — never here. */
export const attributeDef = z
  .object({
    id: slug,
  })
  .strict();

export const attributesFile = z.array(attributeDef);

export type AttributeDef = z.infer<typeof attributeDef>;

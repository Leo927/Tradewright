import { z } from 'zod';

export const localeDef = z
  .object({
    id: z.string().regex(/^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/),
    endonym: z.string().min(1),
    status: z.enum(['shipped', 'validation']),
  })
  .strict();

export const localesFile = z.array(localeDef);

/** Flat `stringId → ICU message` map. */
export const uiTextCatalog = z.record(z.string().min(1), z.string());

/** Flat `<defId>.<field> → string` map, one file per `data/` domain. */
export const contentTextResource = z.record(z.string().min(1), z.string());

export type LocaleDef = z.infer<typeof localeDef>;
export type UiTextCatalog = z.infer<typeof uiTextCatalog>;
export type ContentTextResource = z.infer<typeof contentTextResource>;

import { z } from 'zod';
import { slug } from './common.js';

/** Template references are `ui.json` keys, never inline strings (FR-064/070). */
export const notificationCategoryDef = z
  .object({
    id: slug,
    titleKey: z.string().min(1),
    bodyKey: z.string().min(1),
    onlineVersionOnly: z.boolean(),
  })
  .strict();

export const notificationCategoriesFile = z.array(notificationCategoryDef);

export type NotificationCategoryDef = z.infer<typeof notificationCategoryDef>;

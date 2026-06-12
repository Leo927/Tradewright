import { z } from 'zod';
import { slug } from './common.js';

export const routeDef = z
  .object({
    id: slug,
    endpoints: z.tuple([slug, slug]),
    caravanMinutes: z.number().positive(),
    travelMinutes: z.number().positive(),
    riskLevel: z.enum(['safe', 'low', 'moderate', 'high']),
    riskChance: z.number().min(0).max(1),
    lossFraction: z.number().min(0).max(1),
    mitigationCost: z.number().min(0),
    mitigationFactor: z.number().min(0).max(1),
    dispatchCost: z.number().min(0),
  })
  .strict();

export const routesFile = z.array(routeDef);

export type RouteDef = z.infer<typeof routeDef>;

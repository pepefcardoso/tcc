import { z } from 'zod';

export const pseSchema = z.object({
  pse: z.number().int().min(1).max(10),
});

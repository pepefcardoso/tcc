import { z } from 'zod';

export const uploadBodySchema = z.object({
  athlete_id: z.string().uuid({ message: 'athlete_id must be a valid UUID' }),
});

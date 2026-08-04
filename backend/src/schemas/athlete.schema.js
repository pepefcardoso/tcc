import { z } from 'zod';

const athleteBase = z.object({
  name: z.string().max(100),
  position: z.string().max(50).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Must be YYYY-MM-DD' }),
  weight_kg: z.number().multipleOf(0.01),
  height_m: z.number().multipleOf(0.001),
});

export const createAthleteSchema = athleteBase.required({ name: true });
export const patchAthleteSchema = athleteBase.partial();

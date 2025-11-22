import z from 'zod';

export const userSettingsSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  enable_ai: z.boolean(),
});

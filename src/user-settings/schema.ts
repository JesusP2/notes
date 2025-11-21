import z from 'zod';

export const userSettingsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  enableAI: z.boolean(),
});

import { z } from 'zod';

export const generationJobSchema = z.object({
  jobId: z.string().uuid().optional(),
  interestIds: z.array(z.string().min(1)).min(1),
  religionId: z.string().min(1).nullable().optional(),
  contentLanguage: z.string().min(2).optional(),
  localDate: z.string().min(4).optional(),
  occasions: z.array(z.string().min(1)).optional().default([]),
  constraints: z
    .object({
      cardsRequested: z.number().int().min(1).max(50),
    })
    .default({ cardsRequested: 6 }),
});

export function validateGenerationJobPayload(payload) {
  return generationJobSchema.safeParse(payload);
}


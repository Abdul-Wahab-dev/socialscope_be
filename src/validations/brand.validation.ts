import { z } from 'zod';
import { countryCode, nullableText, nullableUrl } from './common.validation';

export const updateBrandProfileSchema = z
  .object({
    companyName: z.string().trim().min(2).max(120),
    website: nullableUrl,
    industry: nullableText(40),
    country: countryCode.nullable(),
    city: nullableText(80),
    logoUrl: nullableUrl,
    description: nullableText(2000),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Nothing to update');

export const saveCreatorSchema = z.object({
  creatorProfileId: z.uuid('Invalid creator id'),
  note: nullableText(500),
});

export const creatorProfileIdParam = z.object({ creatorProfileId: z.uuid('Invalid creator id') });

export type UpdateBrandProfileInput = z.infer<typeof updateBrandProfileSchema>;
export type SaveCreatorInput = z.infer<typeof saveCreatorSchema>;

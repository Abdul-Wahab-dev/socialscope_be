import { z } from 'zod';
import { DELIVERABLE_TYPES, SOCIAL_PLATFORMS } from '../types';
import { countryCode, nullableText, nullableUrl } from './common.validation';
import { usernameSchema } from './auth.validation';

export const updateCreatorProfileSchema = z
  .object({
    username: usernameSchema,
    displayName: z.string().trim().min(2).max(80),
    bio: nullableText(1000),
    avatarUrl: nullableUrl,
    categories: z.array(z.string().trim().min(1).max(40)).max(5, 'Pick up to 5 categories'),
    languages: z.array(z.string().trim().min(2).max(40)).max(8, 'Pick up to 8 languages'),
    country: countryCode.nullable(),
    city: nullableText(80),
    contactEmail: z.union([z.literal(''), z.email('Enter a valid email')]).nullish().transform((v) => v || null),
    isAvailable: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Nothing to update');

export const usernameQuerySchema = z.object({ username: usernameSchema });

export const rateCardSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS).nullish().transform((v) => v ?? null),
  deliverable: z.enum(DELIVERABLE_TYPES, 'Choose a deliverable type'),
  title: z.string().trim().min(2).max(120),
  description: nullableText(1000),
  price: z.coerce.number('Price must be a number').min(0, 'Price cannot be negative').max(1_000_000, 'Price is too high'),
  currency: z.string().trim().length(3).toUpperCase().default('USD'),
});
export const updateRateCardSchema = rateCardSchema.partial().refine((d) => Object.keys(d).length > 0, 'Nothing to update');

export const portfolioItemSchema = z.object({
  title: z.string().trim().min(2).max(120),
  brandName: nullableText(120),
  url: nullableUrl,
  description: nullableText(1000),
});
export const updatePortfolioItemSchema = portfolioItemSchema.partial().refine((d) => Object.keys(d).length > 0, 'Nothing to update');

export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileSchema>;
export type RateCardInput = z.infer<typeof rateCardSchema>;
export type UpdateRateCardInput = z.infer<typeof updateRateCardSchema>;
export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;
export type UpdatePortfolioItemInput = z.infer<typeof updatePortfolioItemSchema>;

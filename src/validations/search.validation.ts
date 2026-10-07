import { z } from 'zod';
import { SOCIAL_PLATFORMS } from '../types';
import { csvList } from './common.validation';

export const SEARCH_SORTS = ['relevance', 'followers_desc', 'engagement_desc', 'price_asc', 'newest'] as const;

export const searchCreatorsSchema = z
  .object({
    q: z.string().trim().max(100).optional().transform((v) => v || undefined),
    categories: csvList,
    platform: z.enum(SOCIAL_PLATFORMS).optional(),
    country: z.string().trim().length(2).toUpperCase().optional(),
    city: z.string().trim().max(80).optional().transform((v) => v || undefined),
    language: z.string().trim().max(40).optional().transform((v) => v || undefined),
    minFollowers: z.coerce.number().int().min(0).optional(),
    maxFollowers: z.coerce.number().int().min(0).optional(),
    minEngagement: z.coerce.number().min(0).max(100).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    availableOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    sort: z.enum(SEARCH_SORTS).default('relevance'),
    page: z.coerce.number().int().min(1).max(100).default(1),
    limit: z.coerce.number().int().min(1).max(30).default(12),
  })
  .refine((d) => d.minFollowers === undefined || d.maxFollowers === undefined || d.minFollowers <= d.maxFollowers, {
    message: 'minFollowers must be less than or equal to maxFollowers',
    path: ['maxFollowers'],
  });

export type SearchCreatorsInput = z.infer<typeof searchCreatorsSchema>;

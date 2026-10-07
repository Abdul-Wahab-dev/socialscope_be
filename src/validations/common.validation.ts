import { z } from 'zod';
import { SOCIAL_PLATFORMS } from '../types';

export const uuidParam = z.object({ id: z.uuid('Invalid id') });
export const platformParam = z.object({ platform: z.enum(SOCIAL_PLATFORMS, 'Unsupported platform') });

/** Trims strings and converts "" to undefined so optional fields behave. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .nullish()
    .transform((v) => (v === '' || v === undefined ? null : v));

export const nullableUrl = z
  .union([z.literal(''), z.url('Must be a valid URL (including https://)').max(1000)])
  .nullish()
  .transform((v) => (v ? v : null));

export const countryCode = z
  .string()
  .trim()
  .length(2, 'Use a 2-letter ISO country code, e.g. PK')
  .transform((v) => v.toUpperCase());

/** Comma separated list in the query string -> string[] */
export const csvList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    const arr = (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

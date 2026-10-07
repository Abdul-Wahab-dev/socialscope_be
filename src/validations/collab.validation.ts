import { z } from 'zod';
import { COLLAB_STATUSES, DELIVERABLE_TYPES, SOCIAL_PLATFORMS } from '../types';
import { paginationQuery } from './common.validation';

const deliverableSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS).optional(),
  type: z.enum(DELIVERABLE_TYPES),
  quantity: z.coerce.number().int().min(1).max(100),
  notes: z.string().trim().max(300).optional(),
});

const today = () => new Date().toISOString().slice(0, 10);

export const createCollabSchema = z.object({
  creatorProfileId: z.uuid('Invalid creator id'),
  title: z.string().trim().min(5, 'Title is too short').max(150),
  brief: z.string().trim().min(20, 'Describe the campaign in at least 20 characters').max(5000),
  deliverables: z.array(deliverableSchema).min(1, 'Add at least one deliverable').max(10),
  budget: z.coerce.number('Budget must be a number').min(1, 'Budget must be at least 1').max(1_000_000),
  currency: z.string().trim().length(3).toUpperCase().default('USD'),
  deadline: z
    .iso.date('Use YYYY-MM-DD')
    .refine((d) => d >= today(), 'Deadline cannot be in the past')
    .optional(),
});

export const respondCollabSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept'), message: z.string().trim().max(2000).optional() }),
  z.object({ action: z.literal('decline'), message: z.string().trim().max(2000).optional() }),
  z.object({
    action: z.literal('counter'),
    counterBudget: z.coerce.number().min(1).max(1_000_000),
    message: z.string().trim().max(2000).optional(),
  }),
]);

export const counterResponseSchema = z.object({ action: z.enum(['accept', 'decline']) });

export const listCollabsQuery = paginationQuery.extend({
  status: z.enum(COLLAB_STATUSES).optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(4000),
});

export type CreateCollabInput = z.infer<typeof createCollabSchema>;
export type RespondCollabInput = z.infer<typeof respondCollabSchema>;
export type ListCollabsQuery = z.infer<typeof listCollabsQuery>;

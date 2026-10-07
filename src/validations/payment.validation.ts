import { z } from 'zod';

export const checkoutSchema = z.discriminatedUnion('purpose', [
  z.object({ purpose: z.literal('creator_registration') }),
  z.object({ purpose: z.literal('search_credits'), packageId: z.string().trim().min(1, 'Choose a package') }),
]);

export type CheckoutInput = z.infer<typeof checkoutSchema>;

import { z } from "zod";

export const checkoutSchema = z.discriminatedUnion("purpose", [
  z.object({
    purpose: z.literal("creator_registration"),
    /** Creator confirmed their profile and connected-account stats will be published */
    publishConsent: z.literal(
      true,
      "Please confirm that your profile and stats will be public"
    ),
  }),
  z.object({
    purpose: z.literal("search_credits"),
    packageId: z.string().trim().min(1, "Choose a package"),
  }),
]);

export type CheckoutInput = z.infer<typeof checkoutSchema>;

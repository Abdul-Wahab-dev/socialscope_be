import { z } from "zod";
import { parseFacebookProfileUrl } from "../utils/facebook-url";

const MAX_COUNT = 10_000_000_000; // 10B, beyond any real account

const count = (label: string) =>
  z.coerce
    .number(`${label} must be a number`)
    .int(`${label} must be a whole number`)
    .min(0, `${label} can’t be negative`)
    .max(MAX_COUNT, `${label} looks too high`);

/** Creator-entered stats for a self-reported platform (Facebook profile). */
export const selfReportedStatsSchema = z
  .object({
    profileUrl: z
      .string("Add your Facebook profile link")
      .trim()
      .min(1, "Add your Facebook profile link")
      .max(1000)
      .refine(
        (v) => parseFacebookProfileUrl(v) !== null,
        "Enter the link to your Facebook profile, e.g. https://www.facebook.com/yourname"
      ),
    followers: count("Followers"),
    following: count("Following").optional(),
    postsCount: count("Posts").optional(),
    avgViews: count("Average views").optional(),
    avgLikes: count("Average reactions"),
    avgComments: count("Average comments"),
  })
  .refine((d) => d.followers > 0, {
    path: ["followers"],
    message: "Enter your follower count",
  });

export type SelfReportedStatsBody = z.infer<typeof selfReportedStatsSchema>;

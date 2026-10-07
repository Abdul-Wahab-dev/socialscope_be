import { Router } from "express";
import { z } from "zod";
import * as creator from "../controllers/creator.controller";
import {
  authenticate,
  optionalAuth,
  requireRole,
} from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { uuidParam } from "../validations/common.validation";
import {
  portfolioItemSchema,
  rateCardSchema,
  updateCreatorProfileSchema,
  updatePortfolioItemSchema,
  updateRateCardSchema,
  usernameQuerySchema,
} from "../validations/creator.validation";

const router = Router();
const creatorOnly = [authenticate, requireRole("creator")];

router.get(
  "/username-available",
  optionalAuth,
  validate({ query: usernameQuerySchema }),
  creator.checkUsername
);

router.get("/featured", creator.getFeatured);
router.get("/me", ...creatorOnly, creator.getMyProfile);
router.post(
  "/me",
  ...creatorOnly,
  validate({ body: updateCreatorProfileSchema }),
  creator.updateMyProfile
);
router.get("/me/insights", ...creatorOnly, creator.getInsights);

router.get("/me/rate-cards", ...creatorOnly, creator.listRateCards);
router.post(
  "/me/rate-cards",
  ...creatorOnly,
  validate({ body: rateCardSchema }),
  creator.createRateCard
);
router.patch(
  "/me/rate-cards/:id",
  ...creatorOnly,
  validate({ params: uuidParam, body: updateRateCardSchema }),
  creator.updateRateCard
);
router.delete(
  "/me/rate-cards/:id",
  ...creatorOnly,
  validate({ params: uuidParam }),
  creator.deleteRateCard
);

router.get("/me/portfolio", ...creatorOnly, creator.listPortfolio);
router.post(
  "/me/portfolio",
  ...creatorOnly,
  validate({ body: portfolioItemSchema }),
  creator.createPortfolioItem
);
router.patch(
  "/me/portfolio/:id",
  ...creatorOnly,
  validate({ params: uuidParam, body: updatePortfolioItemSchema }),
  creator.updatePortfolioItem
);
router.delete(
  "/me/portfolio/:id",
  ...creatorOnly,
  validate({ params: uuidParam }),
  creator.deletePortfolioItem
);

// Public media kit — keep last so it doesn't shadow /me
router.get(
  "/:username",
  optionalAuth,
  validate({
    params: z.object({
      username: z
        .string()
        .trim()
        .min(1)
        .max(30)
        .regex(/^[a-zA-Z0-9_.]+$/, "Invalid username"),
    }),
  }),
  creator.getPublicProfile
);

export default router;

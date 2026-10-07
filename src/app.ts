import "./configs/zod";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env, isProd, isTest } from "./configs/env";
import "./models"; // register models + associations
import routes from "./routes";
import { stripeWebhook } from "./controllers/payment.controller";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { requestId } from "./middleware/request-id.middleware";
import { apiLimiter } from "./middleware/rate-limit.middleware";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  if (isProd) app.set("trust proxy", 1); // behind a load balancer: real client IP for rate limits & quotas

  app.use(requestId);
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL.split(",").map((o) => o.trim()),
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    })
  );
  if (!isTest) app.use(morgan(isProd ? "combined" : "dev"));

  // Stripe needs the raw body to verify signatures — mount before express.json()
  app.post(
    `${env.API_PREFIX}/payments/webhook`,
    express.raw({ type: "application/json", limit: "1mb" }),
    stripeWebhook
  );

  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(cookieParser());

  app.use(env.API_PREFIX, apiLimiter, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

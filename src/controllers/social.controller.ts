import type { Request, Response } from "express";
import { env } from "../configs/env";
import { socialAccountService } from "../services/social-account.service";
import { ApiError } from "../utils/api-error";
import { sendSuccess } from "../utils/response";
import type { SocialPlatform } from "../types";
import { logger } from "../libs/logger";
import { dataDeletionService } from "../services/data-deletion.service";

const socialsPage = `${env.FRONTEND_URL}/creator/socials`;

export const listAccounts = async (req: Request, res: Response) => {
  sendSuccess(res, await socialAccountService.list(req.user!.id));
};

export const getConnectUrl = async (req: Request, res: Response) => {
  sendSuccess(
    res,
    await socialAccountService.getConnectUrl(
      req.user!.id,
      req.params.platform as SocialPlatform
    )
  );
};

/** OAuth redirect target. Always redirects back to the frontend with a success or error flag. */
export const oauthCallback = async (req: Request, res: Response) => {
  const platform = req.params.platform as SocialPlatform;
  const {
    code,
    state,
    error,
    error_description: errorDescription,
  } = req.query as Record<string, string | undefined>;

  const back = (params: Record<string, string>) =>
    res.redirect(`${socialsPage}?${new URLSearchParams(params).toString()}`);

  if (error)
    return back({
      error: errorDescription || "Connection was cancelled",
      platform,
    });
  if (!code || !state)
    return back({ error: "Missing authorization code", platform });

  try {
    console.log(platform, code, state, "platform", "code", "state");
    await socialAccountService.handleCallback(platform, code, state);
    return back({ connected: platform });
  } catch (err) {
    const message =
      err instanceof ApiError
        ? err.message
        : "Could not connect your account. Please try again.";
    if (!(err instanceof ApiError)) logger.error("OAuth callback failed", err);
    return back({ error: message, platform });
  }
};

export const syncAccount = async (req: Request, res: Response) => {
  sendSuccess(
    res,
    await socialAccountService.manualSync(req.user!.id, String(req.params.id)),
    { message: "Stats refreshed" }
  );
};

export const disconnectAccount = async (req: Request, res: Response) => {
  await socialAccountService.disconnect(req.user!.id, String(req.params.id));
  sendSuccess(res, null, { message: "Account disconnected" });
};

export const accountHistory = async (req: Request, res: Response) => {
  sendSuccess(
    res,
    await socialAccountService.history(req.user!.id, String(req.params.id))
  );
};

/** Meta "Data Deletion Request" callback (also used for "Deauthorize"). Body: signed_request (form-encoded). */
export const instagramDataDeletion = async (req: Request, res: Response) => {
  const result = await dataDeletionService.handleInstagramDeletion(
    req.body?.signed_request
  );
  res.json(result); // Meta expects exactly { url, confirmation_code }
};

export const deletionStatus = async (req: Request, res: Response) => {
  sendSuccess(
    res,
    await dataDeletionService.getStatus(String(req.params.code))
  );
};

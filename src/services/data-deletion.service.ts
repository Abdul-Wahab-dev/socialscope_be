import crypto from "crypto";
import { env } from "../configs/env";
import { sequelize } from "../configs/database";
import { DataDeletionRequest, SocialAccount } from "../models";
import { sha256 } from "../libs/crypto";
import { logger } from "../libs/logger";
import { ApiError } from "../utils/api-error";
import { creatorService } from "./creator.service";

interface SignedRequestPayload {
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
}

const b64url = (s: string) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
const newCode = () => crypto.randomBytes(9).toString("base64url").toUpperCase();

/**
 * Handles platform-initiated deletion (Meta "Data Deletion Request" & "Deauthorize" callbacks)
 * and exposes a public status lookup by confirmation code.
 */
export class DataDeletionService {
  /** Verifies Meta's `signed_request` (HMAC-SHA256 with the app secret) and returns its payload. */
  parseMetaSignedRequest(
    signedRequest: string | undefined,
    appSecret: string
  ): SignedRequestPayload {
    if (!signedRequest || !signedRequest.includes("."))
      throw ApiError.badRequest("Missing signed_request");
    if (!appSecret)
      throw new ApiError(
        503,
        "Meta app secret is not configured",
        "PROVIDER_NOT_CONFIGURED"
      );

    const [encodedSig, payload] = signedRequest.split(".", 2) as [
      string,
      string,
    ];
    const expected = crypto
      .createHmac("sha256", appSecret)
      .update(payload)
      .digest();
    const actual = b64url(encodedSig);
    if (
      actual.length !== expected.length ||
      !crypto.timingSafeEqual(actual, expected)
    ) {
      throw ApiError.badRequest("Invalid signed_request signature");
    }
    let data: SignedRequestPayload;
    try {
      data = JSON.parse(b64url(payload).toString("utf8"));
    } catch {
      throw ApiError.badRequest("Malformed signed_request payload");
    }
    if (data.algorithm && data.algorithm.toUpperCase() !== "HMAC-SHA256")
      throw ApiError.badRequest("Unsupported algorithm");
    return data;
  }

  /** Instagram Login callback: deletes the Instagram account(s) with that Instagram user id. */
  async handleInstagramDeletion(signedRequest: string | undefined) {
    const payload = this.parseMetaSignedRequest(
      signedRequest,
      env.INSTAGRAM_APP_SECRET
    );
    if (!payload.user_id)
      throw ApiError.badRequest("signed_request has no user_id");
    return this.deleteMetaAccounts("instagram", String(payload.user_id), {
      platformUserId: String(payload.user_id),
    });
  }

  /**
   * Facebook Login callback: signed with the Facebook app secret; `user_id` is the app-scoped
   * Facebook user id saved at login (owner_platform_user_id). Deletes that Facebook connection
   * together with the stats the creator entered for it.
   */
  async handleFacebookDeletion(signedRequest: string | undefined) {
    const payload = this.parseMetaSignedRequest(
      signedRequest,
      env.FACEBOOK_APP_SECRET
    );
    if (!payload.user_id)
      throw ApiError.badRequest("signed_request has no user_id");
    return this.deleteMetaAccounts("facebook", String(payload.user_id), {
      ownerPlatformUserId: String(payload.user_id),
    });
  }

  private async deleteMetaAccounts(
    platform: "instagram" | "facebook",
    metaUserId: string,
    match: { platformUserId?: string; ownerPlatformUserId?: string }
  ) {
    const code = newCode();
    const affectedProfiles: string[] = [];

    await sequelize.transaction(async (transaction) => {
      const accounts = await SocialAccount.findAll({
        where: { platform, ...match },
        transaction,
      });
      for (const a of accounts) {
        affectedProfiles.push(a.creatorProfileId);
        await a.destroy({ transaction }); // cascades to stat snapshots
      }
      await DataDeletionRequest.create(
        {
          confirmationCode: code,
          source: `${platform}_callback`,
          platformUserIdHash: sha256(`${platform}:${metaUserId}`),
          status: accounts.length ? "completed" : "not_found",
          completedAt: new Date(),
        },
        { transaction }
      );
    });

    for (const id of new Set(affectedProfiles))
      await creatorService.recomputeAggregates(id);
    logger.info(
      `${platform} data deletion processed (${affectedProfiles.length} account(s)), code ${code}`
    );

    return {
      url: `${env.FRONTEND_URL}/data-deletion?code=${code}`,
      confirmation_code: code,
    };
  }

  async recordAccountDeletion() {
    const code = newCode();
    await DataDeletionRequest.create({
      confirmationCode: code,
      source: "account_deletion",
      platformUserIdHash: null,
      status: "completed",
      completedAt: new Date(),
    });
    return code;
  }

  async getStatus(code: string) {
    const req = await DataDeletionRequest.findOne({
      where: { confirmationCode: code.toUpperCase() },
    });
    if (!req)
      throw ApiError.notFound(
        "No deletion request found for this confirmation code"
      );
    return {
      confirmationCode: req.confirmationCode,
      status: req.status,
      source: req.source,
      requestedAt: req.createdAt,
      completedAt: req.completedAt,
    };
  }
}

export const dataDeletionService = new DataDeletionService();

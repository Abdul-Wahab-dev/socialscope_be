import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { sequelize } from '../configs/database';
import { env } from '../configs/env';
import { BrandProfile, CreatorProfile, RefreshToken, User } from '../models';
import { signAccessToken } from '../libs/jwt';
import { randomToken, sha256 } from '../libs/crypto';
import { ApiError } from '../utils/api-error';
import { addDays } from '../utils/helpers';
import { dataDeletionService } from './data-deletion.service';
import type { ChangePasswordInput, LoginInput, RegisterInput } from '../validations/auth.validation';

interface ClientInfo {
  userAgent?: string;
  ip?: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const BCRYPT_ROUNDS = 12;
// Used to keep login timing constant when the email does not exist
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', BCRYPT_ROUNDS);

export class AuthService {
  async register(input: RegisterInput, client: ClientInfo) {
    const existing = await User.findOne({ where: { email: input.email } });
    if (existing) throw ApiError.conflict('An account with this email already exists', { field: 'email' });

    if (input.role === 'creator') {
      const taken = await CreatorProfile.findOne({ where: { username: input.username } });
      if (taken) throw ApiError.conflict('This username is already taken', { field: 'username' });
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await sequelize.transaction(async (transaction) => {
      const created = await User.create({ email: input.email, passwordHash, fullName: input.fullName, role: input.role }, { transaction });
      if (input.role === 'creator') {
        await CreatorProfile.create({ userId: created.id, username: input.username, displayName: input.fullName }, { transaction });
      } else {
        await BrandProfile.create({ userId: created.id, companyName: input.companyName }, { transaction });
      }
      return created;
    });

    const tokens = await this.issueTokens(user, client);
    return { user: await this.getMe(user.id), tokens };
  }

  async login(input: LoginInput, client: ClientInfo) {
    const user = await User.findOne({ where: { email: input.email } });
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    if (user.status !== 'active') throw ApiError.forbidden('This account has been suspended');

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await this.issueTokens(user, client);
    return { user: await this.getMe(user.id), tokens };
  }

  /** Rotating refresh tokens: each refresh revokes the old token. Reuse of a revoked token revokes all sessions. */
  async refresh(rawToken: string | undefined, client: ClientInfo) {
    if (!rawToken) throw ApiError.unauthorized('Session expired, please log in again');
    const record = await RefreshToken.findOne({ where: { tokenHash: sha256(rawToken) } });
    if (!record) throw ApiError.unauthorized('Session expired, please log in again');

    if (record.revokedAt) {
      // Possible token theft: kill every session of this user.
      await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: record.userId, revokedAt: { [Op.is]: null } } });
      throw ApiError.unauthorized('Session expired, please log in again');
    }
    if (record.expiresAt < new Date()) throw ApiError.unauthorized('Session expired, please log in again');

    const user = await User.findByPk(record.userId);
    if (!user || user.status !== 'active') throw ApiError.unauthorized('Session expired, please log in again');

    record.revokedAt = new Date();
    await record.save();
    const tokens = await this.issueTokens(user, client);
    return { user, tokens };
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash: sha256(rawToken), revokedAt: { [Op.is]: null } } });
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await User.findByPk(userId);
    if (!user) throw ApiError.notFound('User not found');
    const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!ok) throw ApiError.validation([{ field: 'currentPassword', message: 'Current password is incorrect' }]);
    user.passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    await user.save();
    // sign out other devices
    await RefreshToken.update({ revokedAt: new Date() }, { where: { userId, revokedAt: { [Op.is]: null } } });
  }

  /**
   * Permanently deletes the user and everything linked to them (profile, social tokens & stats,
   * rate cards, collabs, messages, sessions) via ON DELETE CASCADE. Requires the current password.
   */
  async deleteAccount(userId: string, password: string) {
    const user = await User.findByPk(userId);
    if (!user) throw ApiError.notFound('User not found');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw ApiError.validation([{ field: 'password', message: 'Password is incorrect' }]);
    await user.destroy();
    return dataDeletionService.recordAccountDeletion();
  }

  async getMe(userId: string) {
    const user = await User.findByPk(userId, {
      include: [
        { model: CreatorProfile, as: 'creatorProfile', attributes: ['id', 'username', 'displayName', 'avatarUrl', 'isListed', 'isFounding'] },
        { model: BrandProfile, as: 'brandProfile', attributes: ['id', 'companyName', 'logoUrl'] },
      ],
    });
    if (!user) throw ApiError.notFound('User not found');
    return user.toJSON();
  }

  private async issueTokens(user: User, client: ClientInfo): Promise<IssuedTokens> {
    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = randomToken();
    const refreshExpiresAt = addDays(new Date(), env.JWT_REFRESH_EXPIRES_DAYS);
    await RefreshToken.create({
      userId: user.id,
      tokenHash: sha256(refreshToken),
      userAgent: client.userAgent?.slice(0, 500) ?? null,
      ipAddress: client.ip ?? null,
      expiresAt: refreshExpiresAt,
    });
    return { accessToken, refreshToken, refreshExpiresAt };
  }
}

export const authService = new AuthService();

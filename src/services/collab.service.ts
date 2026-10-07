import { Op } from 'sequelize';
import { sequelize } from '../configs/database';
import { BrandProfile, CollabRequest, CreatorProfile, Message, User } from '../models';
import { ApiError } from '../utils/api-error';
import { buildMeta } from '../utils/pagination';
import type { AuthUser } from '../types';
import type { CreateCollabInput, ListCollabsQuery, RespondCollabInput } from '../validations/collab.validation';

const OPEN_STATUSES = ['pending', 'countered'] as const;
const CLOSED_FOR_MESSAGES = ['declined', 'cancelled'];

export class CollabService {
  async create(brandUserId: string, input: CreateCollabInput) {
    const creator = await CreatorProfile.findOne({ where: { id: input.creatorProfileId } });
    if (!creator || !creator.isListed) throw ApiError.notFound('Creator not found');
    if (creator.userId === brandUserId) throw ApiError.badRequest('You cannot send a request to yourself');
    if (!creator.isAvailable) throw ApiError.badRequest('This creator is not taking new collaborations right now');

    const open = await CollabRequest.findOne({
      where: { brandUserId, creatorProfileId: creator.id, status: { [Op.in]: [...OPEN_STATUSES] } },
    });
    if (open) throw ApiError.conflict('You already have an open request with this creator', { collabId: open.id });

    const { budget, ...rest } = input;
    const collab = await CollabRequest.create({ ...rest, budgetCents: Math.round(budget * 100), brandUserId });
    return this.getForUser({ id: brandUserId, role: 'brand' }, collab.id);
  }

  async list(user: AuthUser, query: ListCollabsQuery) {
    const where = await this.scopeWhere(user);
    if (query.status) Object.assign(where, { status: query.status });

    const { rows, count } = await CollabRequest.findAndCountAll({
      where,
      attributes: {
        include: [
          [
            sequelize.literal(
              `(SELECT COUNT(*)::int FROM messages m WHERE m.collab_request_id = "CollabRequest"."id" AND m.read_at IS NULL AND m.sender_user_id <> ${sequelize.escape(user.id)})`,
            ),
            'unreadCount',
          ],
        ],
      },
      include: this.defaultIncludes(),
      order: [['updatedAt', 'DESC']],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      distinct: true,
    });
    return { items: rows, meta: buildMeta(query.page, query.limit, count) };
  }

  async getForUser(user: AuthUser, id: string) {
    const where = { ...(await this.scopeWhere(user)), id };
    const collab = await CollabRequest.findOne({ where, include: this.defaultIncludes() });
    if (!collab) throw ApiError.notFound('Collaboration request not found');
    return collab;
  }

  /** Creator accepts / declines / counters a pending request. */
  async respond(user: AuthUser, id: string, input: RespondCollabInput) {
    const collab = await this.getForUser(user, id);
    if (user.role !== 'creator') throw ApiError.forbidden('Only the creator can respond to this request');
    if (collab.status !== 'pending') throw ApiError.badRequest(`Request is already ${collab.status}`);

    await sequelize.transaction(async (transaction) => {
      if (input.action === 'accept') collab.status = 'accepted';
      else if (input.action === 'decline') collab.status = 'declined';
      else {
        collab.status = 'countered';
        collab.counterCents = Math.round(input.counterBudget * 100);
      }
      collab.respondedAt = new Date();
      await collab.save({ transaction });
      if (input.message) await Message.create({ collabRequestId: collab.id, senderUserId: user.id, body: input.message }, { transaction });
    });
    return this.getForUser(user, id);
  }

  /** Brand accepts or declines the creator's counter offer. */
  async respondToCounter(user: AuthUser, id: string, action: 'accept' | 'decline') {
    const collab = await this.getForUser(user, id);
    if (collab.status !== 'countered') throw ApiError.badRequest('There is no counter offer to respond to');
    if (action === 'accept') {
      collab.budgetCents = collab.counterCents ?? collab.budgetCents;
      collab.status = 'accepted';
    } else {
      collab.status = 'declined';
    }
    await collab.save();
    return this.getForUser(user, id);
  }

  async cancel(user: AuthUser, id: string) {
    const collab = await this.getForUser(user, id);
    if (!OPEN_STATUSES.includes(collab.status as (typeof OPEN_STATUSES)[number])) {
      throw ApiError.badRequest(`A ${collab.status} request cannot be cancelled`);
    }
    collab.status = 'cancelled';
    await collab.save();
    return this.getForUser(user, id);
  }

  async complete(user: AuthUser, id: string) {
    const collab = await this.getForUser(user, id);
    if (collab.status !== 'accepted') throw ApiError.badRequest('Only accepted collaborations can be marked complete');
    collab.status = 'completed';
    await collab.save();
    return this.getForUser(user, id);
  }

  async listMessages(user: AuthUser, collabId: string) {
    await this.getForUser(user, collabId); // access check
    await Message.update(
      { readAt: new Date() },
      { where: { collabRequestId: collabId, senderUserId: { [Op.ne]: user.id }, readAt: { [Op.is]: null } } },
    );
    return Message.findAll({
      where: { collabRequestId: collabId },
      include: [{ model: User, as: 'sender', attributes: ['id', 'fullName', 'role'] }],
      order: [['createdAt', 'ASC']],
      limit: 500,
    });
  }

  async sendMessage(user: AuthUser, collabId: string, body: string) {
    const collab = await this.getForUser(user, collabId);
    if (CLOSED_FOR_MESSAGES.includes(collab.status)) throw ApiError.badRequest(`This request is ${collab.status}; messaging is closed`);
    const message = await Message.create({ collabRequestId: collabId, senderUserId: user.id, body });
    collab.changed('updatedAt', true); // bump thread to top of inbox
    await collab.save();
    return Message.findByPk(message.id, { include: [{ model: User, as: 'sender', attributes: ['id', 'fullName', 'role'] }] });
  }

  async unreadCount(user: AuthUser) {
    const scope = await this.scopeWhere(user);
    const collabs = await CollabRequest.findAll({ where: scope, attributes: ['id'] });
    if (!collabs.length) return { unread: 0 };
    const unread = await Message.count({
      where: { collabRequestId: collabs.map((c) => c.id), senderUserId: { [Op.ne]: user.id }, readAt: { [Op.is]: null } },
    });
    return { unread };
  }

  // ---------------------------------------------------------------------------

  /** Row-level access: brands see what they sent, creators see what they received. */
  private async scopeWhere(user: AuthUser): Promise<Record<string, unknown>> {
    if (user.role === 'brand') return { brandUserId: user.id };
    if (user.role === 'creator') {
      const profile = await CreatorProfile.findOne({ where: { userId: user.id }, attributes: ['id'] });
      if (!profile) throw ApiError.notFound('Creator profile not found');
      return { creatorProfileId: profile.id };
    }
    return {}; // admin
  }

  private defaultIncludes() {
    return [
      { model: CreatorProfile, as: 'creatorProfile', attributes: ['id', 'username', 'displayName', 'avatarUrl'] },
      {
        model: User,
        as: 'brandUser',
        attributes: ['id', 'fullName'],
        include: [{ model: BrandProfile, as: 'brandProfile', attributes: ['companyName', 'logoUrl', 'website'] }],
      },
    ];
  }
}

export const collabService = new CollabService();

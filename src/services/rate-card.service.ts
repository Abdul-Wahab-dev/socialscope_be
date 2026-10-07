import { RateCard } from '../models';
import { ApiError } from '../utils/api-error';
import type { RateCardInput, UpdateRateCardInput } from '../validations/creator.validation';
import { creatorService } from './creator.service';

const MAX_RATE_CARDS = 20;
const toCents = (price: number) => Math.round(price * 100);

export class RateCardService {
  async list(userId: string) {
    const profile = await creatorService.getByUserId(userId);
    return RateCard.findAll({ where: { creatorProfileId: profile.id }, order: [['priceCents', 'ASC']] });
  }

  async create(userId: string, input: RateCardInput) {
    const profile = await creatorService.getByUserId(userId);
    const count = await RateCard.count({ where: { creatorProfileId: profile.id } });
    if (count >= MAX_RATE_CARDS) throw ApiError.badRequest(`You can add up to ${MAX_RATE_CARDS} rates`);

    const { price, ...rest } = input;
    const card = await RateCard.create({ ...rest, priceCents: toCents(price), creatorProfileId: profile.id });
    await creatorService.recomputeAggregates(profile.id);
    return card;
  }

  async update(userId: string, id: string, input: UpdateRateCardInput) {
    const card = await this.findOwned(userId, id);
    const { price, ...rest } = input;
    await card.update({ ...rest, ...(price !== undefined ? { priceCents: toCents(price) } : {}) });
    await creatorService.recomputeAggregates(card.creatorProfileId);
    return card;
  }

  async remove(userId: string, id: string) {
    const card = await this.findOwned(userId, id);
    await card.destroy();
    await creatorService.recomputeAggregates(card.creatorProfileId);
  }

  private async findOwned(userId: string, id: string) {
    const profile = await creatorService.getByUserId(userId);
    const card = await RateCard.findOne({ where: { id, creatorProfileId: profile.id } });
    if (!card) throw ApiError.notFound('Rate not found');
    return card;
  }
}

export const rateCardService = new RateCardService();

import { PortfolioItem } from '../models';
import { ApiError } from '../utils/api-error';
import type { PortfolioItemInput, UpdatePortfolioItemInput } from '../validations/creator.validation';
import { creatorService } from './creator.service';

const MAX_ITEMS = 30;

export class PortfolioService {
  async list(userId: string) {
    const profile = await creatorService.getByUserId(userId);
    return PortfolioItem.findAll({ where: { creatorProfileId: profile.id }, order: [['createdAt', 'DESC']] });
  }

  async create(userId: string, input: PortfolioItemInput) {
    const profile = await creatorService.getByUserId(userId);
    const count = await PortfolioItem.count({ where: { creatorProfileId: profile.id } });
    if (count >= MAX_ITEMS) throw ApiError.badRequest(`You can add up to ${MAX_ITEMS} portfolio items`);
    return PortfolioItem.create({ ...input, creatorProfileId: profile.id });
  }

  async update(userId: string, id: string, input: UpdatePortfolioItemInput) {
    const item = await this.findOwned(userId, id);
    return item.update(input);
  }

  async remove(userId: string, id: string) {
    const item = await this.findOwned(userId, id);
    await item.destroy();
  }

  private async findOwned(userId: string, id: string) {
    const profile = await creatorService.getByUserId(userId);
    const item = await PortfolioItem.findOne({ where: { id, creatorProfileId: profile.id } });
    if (!item) throw ApiError.notFound('Portfolio item not found');
    return item;
  }
}

export const portfolioService = new PortfolioService();

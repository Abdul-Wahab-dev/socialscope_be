import { BrandProfile, CreatorProfile, SavedCreator } from '../models';
import { ApiError } from '../utils/api-error';
import type { SaveCreatorInput, UpdateBrandProfileInput } from '../validations/brand.validation';

export class BrandService {
  async getMyProfile(userId: string) {
    const profile = await BrandProfile.findOne({ where: { userId } });
    if (!profile) throw ApiError.notFound('Brand profile not found');
    return profile;
  }

  async updateMyProfile(userId: string, input: UpdateBrandProfileInput) {
    const profile = await this.getMyProfile(userId);
    return profile.update(input);
  }

  async listSaved(userId: string) {
    return SavedCreator.findAll({
      where: { userId },
      include: [
        {
          model: CreatorProfile,
          as: 'creatorProfile',
          attributes: ['id', 'username', 'displayName', 'avatarUrl', 'categories', 'country', 'city', 'totalFollowers', 'avgEngagementRate', 'minPriceCents', 'isAvailable', 'isListed'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async saveCreator(userId: string, input: SaveCreatorInput) {
    const creator = await CreatorProfile.findOne({ where: { id: input.creatorProfileId, isListed: true } });
    if (!creator) throw ApiError.notFound('Creator not found');
    const [saved, created] = await SavedCreator.findOrCreate({
      where: { userId, creatorProfileId: input.creatorProfileId },
      defaults: { userId, creatorProfileId: input.creatorProfileId, note: input.note },
    });
    if (!created && input.note !== undefined) await saved.update({ note: input.note });
    return saved;
  }

  async unsaveCreator(userId: string, creatorProfileId: string) {
    const deleted = await SavedCreator.destroy({ where: { userId, creatorProfileId } });
    if (!deleted) throw ApiError.notFound('Creator is not in your saved list');
  }

  async savedIds(userId: string): Promise<Set<string>> {
    const rows = await SavedCreator.findAll({ where: { userId }, attributes: ['creatorProfileId'] });
    return new Set(rows.map((r) => r.creatorProfileId));
  }
}

export const brandService = new BrandService();

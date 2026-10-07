/**
 * Dev seed: demo brand + 24 listed creators with (fake) social stats and rate cards.
 * Usage: npm run seed      (idempotent — skips users that already exist)
 * Login for all demo users: password "Password123"
 */
import bcrypt from 'bcryptjs';
import { connectDatabase, sequelize } from '../configs/database';
import { BrandProfile, CreatorProfile, RateCard, SocialAccount, SocialStatSnapshot, User } from '../models';
import { creatorService } from '../services/creator.service';
import { socialAccountService } from '../services/social-account.service';
import type { DeliverableType, SocialPlatform } from '../types';

const PASSWORD = 'Password123';
const cities: Array<[string, string]> = [
  ['PK', 'Lahore'], ['PK', 'Karachi'], ['PK', 'Islamabad'], ['AE', 'Dubai'], ['GB', 'London'], ['US', 'New York'], ['IN', 'Mumbai'], ['SA', 'Riyadh'],
];
const cats = ['fashion', 'beauty', 'food', 'tech', 'gaming', 'fitness', 'travel', 'lifestyle', 'comedy', 'education'];
const names = ['Ayesha', 'Hamza', 'Zara', 'Bilal', 'Sana', 'Usman', 'Maham', 'Ali', 'Fatima', 'Omar', 'Hira', 'Saad', 'Noor', 'Danish', 'Iqra', 'Faizan', 'Mehwish', 'Taha', 'Anaya', 'Rayan', 'Laiba', 'Arham', 'Emaan', 'Shahzaib'];

const rnd = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
const pickN = <T>(arr: T[], n: number) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

async function main() {
  await connectDatabase();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const [brandUser, brandCreated] = await User.findOrCreate({
    where: { email: 'brand@demo.com' },
    defaults: { email: 'brand@demo.com', passwordHash, fullName: 'Demo Brand Manager', role: 'brand' },
  });
  if (brandCreated) await BrandProfile.create({ userId: brandUser.id, companyName: 'Demo Foods Co.', industry: 'food', country: 'PK', city: 'Lahore' });

  for (let i = 0; i < names.length; i++) {
    const email = `creator${i + 1}@demo.com`;
    if (await User.findOne({ where: { email } })) continue;
    const name = names[i]!;
    const [country, city] = cities[i % cities.length]!;

    await sequelize.transaction(async (transaction) => {
      const user = await User.create({ email, passwordHash, fullName: `${name} Demo`, role: 'creator' }, { transaction });
      const profile = await CreatorProfile.create(
        {
          userId: user.id,
          username: `${name.toLowerCase()}${i + 1}`,
          displayName: name,
          bio: `${name} creates ${pickN(cats, 1)[0]} content for a young, engaged audience in ${city}.`,
          categories: pickN(cats, rnd(1, 3)),
          languages: pickN(['english', 'urdu', 'arabic', 'hindi'], rnd(1, 2)),
          country,
          city,
          isAvailable: Math.random() > 0.15,
          isListed: true,
          listedAt: new Date(Date.now() - rnd(1, 60) * 86_400_000),
        },
        { transaction },
      );

      const platforms = pickN<SocialPlatform>(['instagram', 'tiktok', 'youtube'], rnd(1, 3));
      for (const platform of platforms) {
        const followers = rnd(3_000, 800_000);
        const avgLikes = Math.round(followers * (rnd(10, 80) / 1000));
        const avgComments = Math.round(avgLikes * 0.04);
        const acc = await SocialAccount.create(
          {
            creatorProfileId: profile.id,
            platform,
            platformUserId: `seed_${platform}_${user.id}`,
            handle: `${name.toLowerCase()}.${platform}`,
            profileUrl: null,
            followers,
            following: rnd(100, 900),
            postsCount: rnd(50, 1200),
            avgViews: Math.round(followers * (rnd(100, 700) / 1000)),
            avgLikes,
            avgComments,
            engagementRate: socialAccountService.engagementRate(followers, avgLikes, avgComments),
            syncStatus: 'ok',
            lastSyncedAt: new Date(),
          },
          { transaction },
        );
        for (let d = 8; d >= 0; d--) {
          await SocialStatSnapshot.create(
            { socialAccountId: acc.id, followers: Math.round(followers * (1 - d * 0.012)), avgViews: acc.avgViews, engagementRate: acc.engagementRate, capturedAt: new Date(Date.now() - d * 7 * 86_400_000) },
            { transaction },
          );
        }
        const deliverable: DeliverableType = platform === 'youtube' ? 'video' : platform === 'tiktok' ? 'short' : 'reel';
        await RateCard.create(
          { creatorProfileId: profile.id, platform, deliverable, title: `1 ${platform} ${deliverable}`, description: null, priceCents: rnd(20, 600) * 100 },
          { transaction },
        );
      }
    });

    const profile = await CreatorProfile.findOne({ where: { username: `${name.toLowerCase()}${i + 1}` } });
    if (profile) await creatorService.recomputeAggregates(profile.id);
  }

  console.log(`Seed complete. Brand: brand@demo.com / Creators: creator1..${names.length}@demo.com — password: ${PASSWORD}`);
  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  await sequelize.close();
  process.exit(1);
});

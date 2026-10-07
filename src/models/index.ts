import { User } from './user.model';
import { RefreshToken } from './refresh-token.model';
import { Category } from './category.model';
import { CreatorProfile } from './creator-profile.model';
import { SocialAccount } from './social-account.model';
import { SocialStatSnapshot } from './social-stat-snapshot.model';
import { RateCard } from './rate-card.model';
import { PortfolioItem } from './portfolio-item.model';
import { BrandProfile } from './brand-profile.model';
import { SavedCreator } from './saved-creator.model';
import { SearchLog } from './search-log.model';
import { Payment } from './payment.model';
import { CollabRequest } from './collab-request.model';
import { Message } from './message.model';
import { DataDeletionRequest } from './data-deletion-request.model';

// ---- Associations (schema itself is owned by db-migrate SQL migrations; never call sync()) ----
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(CreatorProfile, { foreignKey: 'userId', as: 'creatorProfile' });
CreatorProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(BrandProfile, { foreignKey: 'userId', as: 'brandProfile' });
BrandProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

CreatorProfile.hasMany(SocialAccount, { foreignKey: 'creatorProfileId', as: 'socialAccounts' });
SocialAccount.belongsTo(CreatorProfile, { foreignKey: 'creatorProfileId', as: 'creatorProfile' });

SocialAccount.hasMany(SocialStatSnapshot, { foreignKey: 'socialAccountId', as: 'snapshots' });
SocialStatSnapshot.belongsTo(SocialAccount, { foreignKey: 'socialAccountId', as: 'socialAccount' });

CreatorProfile.hasMany(RateCard, { foreignKey: 'creatorProfileId', as: 'rateCards' });
RateCard.belongsTo(CreatorProfile, { foreignKey: 'creatorProfileId', as: 'creatorProfile' });

CreatorProfile.hasMany(PortfolioItem, { foreignKey: 'creatorProfileId', as: 'portfolioItems' });
PortfolioItem.belongsTo(CreatorProfile, { foreignKey: 'creatorProfileId', as: 'creatorProfile' });

User.hasMany(SavedCreator, { foreignKey: 'userId', as: 'savedCreators' });
SavedCreator.belongsTo(CreatorProfile, { foreignKey: 'creatorProfileId', as: 'creatorProfile' });

User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
User.hasMany(SearchLog, { foreignKey: 'userId', as: 'searchLogs' });

CollabRequest.belongsTo(User, { foreignKey: 'brandUserId', as: 'brandUser' });
CollabRequest.belongsTo(CreatorProfile, { foreignKey: 'creatorProfileId', as: 'creatorProfile' });
CreatorProfile.hasMany(CollabRequest, { foreignKey: 'creatorProfileId', as: 'collabRequests' });

CollabRequest.hasMany(Message, { foreignKey: 'collabRequestId', as: 'messages' });
Message.belongsTo(CollabRequest, { foreignKey: 'collabRequestId', as: 'collabRequest' });
Message.belongsTo(User, { foreignKey: 'senderUserId', as: 'sender' });

export {
  User,
  RefreshToken,
  Category,
  CreatorProfile,
  SocialAccount,
  SocialStatSnapshot,
  RateCard,
  PortfolioItem,
  BrandProfile,
  SavedCreator,
  SearchLog,
  Payment,
  CollabRequest,
  Message,
  DataDeletionRequest,
};

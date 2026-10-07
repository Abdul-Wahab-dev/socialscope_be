import { Router } from 'express';
import * as search from '../controllers/search.controller';
import { optionalAuth } from '../middleware/auth.middleware';
import { ensureGuestId } from '../middleware/guest.middleware';
import { validate } from '../middleware/validate.middleware';
import { searchCreatorsSchema } from '../validations/search.validation';

const router = Router();

router.get('/creators', optionalAuth, ensureGuestId, validate({ query: searchCreatorsSchema }), search.searchCreators);
router.get('/quota', optionalAuth, ensureGuestId, search.getQuota);

export default router;

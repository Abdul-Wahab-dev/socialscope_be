import { Router } from 'express';
import * as brand from '../controllers/brand.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { creatorProfileIdParam, saveCreatorSchema, updateBrandProfileSchema } from '../validations/brand.validation';

const router = Router();
router.use(authenticate, requireRole('brand'));

router.get('/me', brand.getMyProfile);
router.patch('/me', validate({ body: updateBrandProfileSchema }), brand.updateMyProfile);
router.get('/me/saved', brand.listSaved);
router.post('/me/saved', validate({ body: saveCreatorSchema }), brand.saveCreator);
router.delete('/me/saved/:creatorProfileId', validate({ params: creatorProfileIdParam }), brand.unsaveCreator);

export default router;

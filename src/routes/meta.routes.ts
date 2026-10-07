import { Router } from 'express';
import * as meta from '../controllers/meta.controller';

const router = Router();

router.get('/categories', meta.getCategories);
router.get('/config', meta.getConfig);
router.get('/stats', meta.getStats);

export default router;

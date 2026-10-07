import { Router } from 'express';
import authRoutes from './auth.routes';
import metaRoutes from './meta.routes';
import creatorRoutes from './creator.routes';
import socialRoutes from './social.routes';
import brandRoutes from './brand.routes';
import searchRoutes from './search.routes';
import collabRoutes from './collab.routes';
import paymentRoutes from './payment.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

router.use('/auth', authRoutes);
router.use('/meta', metaRoutes);
router.use('/creators', creatorRoutes);
router.use('/social', socialRoutes);
router.use('/brands', brandRoutes);
router.use('/search', searchRoutes);
router.use('/collabs', collabRoutes);
router.use('/payments', paymentRoutes);

export default router;

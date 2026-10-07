import { Router } from 'express';
import { z } from 'zod';
import * as social from '../controllers/social.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { platformParam, uuidParam } from '../validations/common.validation';

const router = Router();
const creatorOnly = [authenticate, requireRole('creator')];

router.get('/accounts', ...creatorOnly, social.listAccounts);
router.post('/accounts/:id/sync', ...creatorOnly, validate({ params: uuidParam }), social.syncAccount);
router.get('/accounts/:id/history', ...creatorOnly, validate({ params: uuidParam }), social.accountHistory);
router.delete('/accounts/:id', ...creatorOnly, validate({ params: uuidParam }), social.disconnectAccount);

// Meta platform callbacks (configure these URLs in the Meta App Dashboard → Instagram → Business login settings)
router.post('/instagram/data-deletion', social.instagramDataDeletion);
router.post('/instagram/deauthorize', social.instagramDataDeletion);
router.get('/data-deletion/:code', validate({ params: z.object({ code: z.string().trim().min(6).max(40).regex(/^[A-Za-z0-9_-]+$/) }) }), social.deletionStatus);

router.get('/:platform/connect', ...creatorOnly, validate({ params: platformParam }), social.getConnectUrl);
// Public: the provider redirects the browser here; the user is identified by the signed `state`
router.get('/:platform/callback', validate({ params: platformParam }), social.oauthCallback);

export default router;

import { Router } from 'express';
import * as collab from '../controllers/collab.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParam } from '../validations/common.validation';
import { counterResponseSchema, createCollabSchema, listCollabsQuery, respondCollabSchema, sendMessageSchema } from '../validations/collab.validation';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listCollabsQuery }), collab.listCollabs);
router.get('/unread-count', collab.unreadCount);
router.post('/', requireRole('brand'), validate({ body: createCollabSchema }), collab.createCollab);
router.get('/:id', validate({ params: uuidParam }), collab.getCollab);

router.patch('/:id/respond', requireRole('creator'), validate({ params: uuidParam, body: respondCollabSchema }), collab.respondCollab);
router.patch('/:id/counter-response', requireRole('brand'), validate({ params: uuidParam, body: counterResponseSchema }), collab.respondToCounter);
router.patch('/:id/cancel', requireRole('brand'), validate({ params: uuidParam }), collab.cancelCollab);
router.patch('/:id/complete', requireRole('brand'), validate({ params: uuidParam }), collab.completeCollab);

router.get('/:id/messages', validate({ params: uuidParam }), collab.listMessages);
router.post('/:id/messages', validate({ params: uuidParam, body: sendMessageSchema }), collab.sendMessage);

export default router;

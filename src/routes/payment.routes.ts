import { Router } from 'express';
import * as payment from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParam } from '../validations/common.validation';
import { checkoutSchema } from '../validations/payment.validation';

const router = Router();

// NOTE: POST /payments/webhook is mounted in app.ts with a raw body parser.
router.use(authenticate);
router.get('/', payment.listPayments);
router.post('/checkout', validate({ body: checkoutSchema }), payment.createCheckout);
router.get('/:id', validate({ params: uuidParam }), payment.getPayment);
router.post('/:id/mock-confirm', validate({ params: uuidParam }), payment.confirmMockPayment);

export default router;

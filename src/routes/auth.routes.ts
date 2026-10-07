import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { changePasswordSchema, deleteAccountSchema, loginSchema, registerSchema } from '../validations/auth.validation';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), auth.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', authenticate, auth.me);
router.patch('/password', authenticate, validate({ body: changePasswordSchema }), auth.changePassword);

router.delete('/me', authenticate, validate({ body: deleteAccountSchema }), auth.deleteAccount);

export default router;

import { Router } from 'express';
import { register, login, refresh, logout } from './auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.delete('/logout', logout);

export { router as authRouter };

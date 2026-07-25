import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { postFeedback } from './feedback.controller';
import type { AuthenticatedRequest } from '../../shared/types';

const router = Router();
router.use(requireAuth as (req: Request, res: Response, next: NextFunction) => void);

router.post('/', (req, res, next) => {
  postFeedback(req as AuthenticatedRequest, res, next);
});

export { router as feedbackRouter };

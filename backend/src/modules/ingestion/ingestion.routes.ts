import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { uploadDocument, uploadMiddleware, getDocumentStatus, listDocuments } from './ingestion.controller';

const router = Router();
router.use(requireAuth as (req: Request, res: Response, next: NextFunction) => void);

router.post('/upload', uploadMiddleware, uploadDocument);
router.get('/', listDocuments);
router.get('/:id/status', getDocumentStatus);

export { router as ingestionRouter };

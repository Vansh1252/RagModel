import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { requireAdmin } from './admin.middleware';
import { uploadMiddleware, uploadDocument } from '../ingestion/ingestion.controller';
import {
  ingestText,
  ingestQAPair,
  listDocuments,
  deleteDocument,
  ingestUrl,
  getFeedbackMessages,
  getAnalytics,
} from './admin.controller';
import { AuthenticatedRequest } from '../../shared/types';
import { RequestHandler } from 'express';

export const adminRouter = Router();

// All admin routes require authentication + admin role
adminRouter.use(requireAuth as RequestHandler);
adminRouter.use(requireAdmin as RequestHandler);

// POST /api/admin/ingest/file   — upload PDF/txt/md file
adminRouter.post('/ingest/file', uploadMiddleware, uploadDocument);

// POST /api/admin/ingest/text   — manually written text
adminRouter.post('/ingest/text', ingestText);

// POST /api/admin/ingest/qa     — Q&A pair
adminRouter.post('/ingest/qa', ingestQAPair);

// POST /api/admin/ingest/url    — URL scrape & ingest
adminRouter.post('/ingest/url', ingestUrl);

// GET  /api/admin/documents     — list all ingested documents
adminRouter.get('/documents', listDocuments);

// DELETE /api/admin/documents/:id — delete a document
adminRouter.delete('/documents/:id', deleteDocument);

// GET  /api/admin/feedback      — get feedback messages
adminRouter.get('/feedback', getFeedbackMessages);

// GET  /api/admin/analytics     — get analytics summary
adminRouter.get('/analytics', getAnalytics);

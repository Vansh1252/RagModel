import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { documents } from '../../db/schema';
import { processDocument } from './ingestion.service';
import { ValidationError } from '../../shared/utils/errors';

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.pdf', '.ts', '.js', '.py'];

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${ext}`));
    }
  },
});

export const uploadMiddleware = upload.single('file');

export async function uploadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new ValidationError('No file uploaded');

    const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
    const validSourceTypes = ['pdf', 'txt', 'md', 'url', 'qa'] as const;
    const sourceType = validSourceTypes.includes(ext as (typeof validSourceTypes)[number])
      ? (ext as (typeof validSourceTypes)[number])
      : 'txt';

    const [doc] = await db
      .insert(documents)
      .values({
        name: req.file.originalname,
        sourceType,
        status: 'pending',
      })
      .returning();

    if (!doc) throw new Error('Document creation failed');

    processDocument(doc.id, req.file.path, req.file.mimetype, req.file.originalname).catch(
      (err) => console.error('[ingestion] processDocument failed:', err),
    );

    res.status(202).json({
      documentId: doc.id,
      name: doc.name,
      status: 'pending',
    });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!doc) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
      return;
    }

    res.json({
      id: doc.id,
      name: doc.name,
      status: doc.status,
      chunkCount: doc.chunkCount,
      error: doc.error,
    });
  } catch (err) {
    next(err);
  }
}

export async function listDocuments(_req: Request, res: Response, next: NextFunction) {
  try {
    const docs = await db.query.documents.findMany({
      orderBy: (d, { desc }) => [desc(d.createdAt)],
    });
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

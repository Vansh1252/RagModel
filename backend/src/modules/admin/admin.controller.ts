import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { documents, messages, analytics } from '../../db/schema';
import { processDocument } from '../ingestion/ingestion.service';
import { scrapeUrl } from './url-scraper';
import { ValidationError } from '../../shared/utils/errors';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const ingestTextSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  sourceType: z.enum(['txt', 'md']).default('txt'),
});

const ingestQASchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
});

export async function ingestText(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ingestTextSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    const { title, content, sourceType } = parsed.data;

    // Write content to a temp file so the existing pipeline handles it
    const tmpFile = path.join(os.tmpdir(), `${uuidv4()}.${sourceType}`);
    fs.writeFileSync(tmpFile, content, 'utf8');

    const [doc] = await db
      .insert(documents)
      .values({
        name: title,
        sourceType,
        status: 'pending',
      })
      .returning();

    if (!doc) throw new Error('Document creation failed');

    processDocument(doc.id, tmpFile, 'text/plain', title).catch(
      (err) => console.error('[ingestion] processDocument failed:', err),
    );

    res.status(202).json({ documentId: doc.id, name: doc.name, status: 'pending' });
  } catch (err) {
    next(err);
  }
}

export async function ingestQAPair(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ingestQASchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    const { question, answer } = parsed.data;
    const content = `Q: ${question}\nA: ${answer}`;
    const title = `QA: ${question.slice(0, 80)}`;

    const tmpFile = path.join(os.tmpdir(), `${uuidv4()}.txt`);
    fs.writeFileSync(tmpFile, content, 'utf8');

    const [doc] = await db
      .insert(documents)
      .values({
        name: title,
        sourceType: 'qa',
        status: 'pending',
      })
      .returning();

    if (!doc) throw new Error('Document creation failed');

    processDocument(doc.id, tmpFile, 'text/plain', title).catch(
      (err) => console.error('[ingestion] processDocument failed:', err),
    );

    res.status(202).json({ documentId: doc.id, name: doc.name, status: 'pending' });
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

export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const doc = await db.query.documents.findFirst({ where: eq(documents.id, id) });
    if (!doc) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
      return;
    }
    await db.delete(documents).where(eq(documents.id, id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

const ingestUrlSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  title: z.string().optional(),
});

export async function ingestUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ingestUrlSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
    const { url, title } = parsed.data;
    const docName = title ?? new URL(url).hostname;

    const [doc] = await db.insert(documents).values({ name: docName, sourceType: 'url', status: 'pending' }).returning();
    if (!doc) throw new Error('Document creation failed');

    (async () => {
      try {
        const content = await scrapeUrl(url);
        const tmpFile = path.join(os.tmpdir(), `${uuidv4()}.txt`);
        fs.writeFileSync(tmpFile, content, 'utf8');
        await processDocument(doc.id, tmpFile, 'text/plain', docName);
      } catch (err) {
        console.error('[ingestion] URL scrape failed:', err);
      }
    })();

    res.status(202).json({ documentId: doc.id, name: docName, status: 'pending' });
  } catch (err) {
    next(err);
  }
}

export async function getFeedbackMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const value =
      req.query['value'] === '-1' ? -1 : req.query['value'] === '1' ? 1 : undefined;
    const msgs = await db.query.messages.findMany({
      where: value !== undefined ? eq(messages.feedback, value) : undefined,
      orderBy: (m, { desc }) => [desc(m.createdAt)],
      limit: 100,
    });
    res.json(msgs);
  } catch (err) {
    next(err);
  }
}

export async function getAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db.query.analytics.findMany({
      orderBy: (a, { desc }) => [desc(a.createdAt)],
      limit: 500,
    });
    const total = rows.length;
    const successful = rows.filter((r) => r.success).length;
    const avgRetrievalMs =
      rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + (r.retrievalMs ?? 0), 0) / rows.length)
        : 0;
    const llmRows = rows.filter((r) => r.llmMs);
    const avgLlmMs =
      llmRows.length > 0
        ? Math.round(llmRows.reduce((s, r) => s + (r.llmMs ?? 0), 0) / llmRows.length)
        : 0;
    const totalTokens = rows.reduce((s, r) => s + (r.tokensUsed ?? 0), 0);
    const byMode = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.mode ?? 'unknown'] = (acc[r.mode ?? 'unknown'] ?? 0) + 1;
      return acc;
    }, {});
    const byIntent = rows.reduce<Record<string, number>>((acc, r) => {
      if (r.intent) acc[r.intent] = (acc[r.intent] ?? 0) + 1;
      return acc;
    }, {});
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentRows = rows.filter((r) => new Date(r.createdAt) >= sevenDaysAgo);
    const byDay: Record<string, number> = {};
    recentRows.forEach((r) => {
      const day = new Date(r.createdAt).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    });
    res.json({ total, successful, avgRetrievalMs, avgLlmMs, totalTokens, byMode, byIntent, byDay });
  } catch (err) {
    next(err);
  }
}

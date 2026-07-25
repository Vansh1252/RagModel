import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const sourceTypeEnum = pgEnum('source_type', ['pdf', 'txt', 'md', 'url', 'qa']);
export const documentStatusEnum = pgEnum('document_status', [
  'pending',
  'processing',
  'indexed',
  'failed',
]);

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 500 }).notNull(),
  sourceType: sourceTypeEnum('source_type').notNull(),
  chunkCount: integer('chunk_count').default(0),
  status: documentStatusEnum('status').default('pending').notNull(),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const documentChunks = pgTable(
  'document_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    // Generated tsvector column for full-text (BM25-style) search
    // NOTE: added manually in migration SQL — Drizzle doesn't support GENERATED columns yet
    // tsv: tsvector — added in migration
    pineconeId: varchar('pinecone_id', { length: 255 }),
    metadata: text('metadata'), // JSON stringified
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_document_chunks_document_id').on(table.documentId)]
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;

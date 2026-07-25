import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const analytics = pgTable('analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  query: text('query').notNull(),
  intent: varchar('intent', { length: 50 }),
  mode: varchar('mode', { length: 20 }),
  retrievalMs: integer('retrieval_ms'),
  llmMs: integer('llm_ms'),
  tokensUsed: integer('tokens_used'),
  chunksUsed: integer('chunks_used'),
  success: boolean('success').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Analytics = typeof analytics.$inferSelect;
export type NewAnalytics = typeof analytics.$inferInsert;

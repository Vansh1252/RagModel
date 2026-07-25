import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
  smallint,
  integer,
} from 'drizzle-orm/pg-core';
import { conversations } from './conversations';

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  // [{ pineconeId, file, preview, score }]
  sources: jsonb('sources').$type<MessageSource[]>(),
  feedback: smallint('feedback'), // 1 = thumbs up, -1 = thumbs down
  tokensUsed: integer('tokens_used'),
  retrievalMs: integer('retrieval_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export interface MessageSource {
  pineconeId: string;
  file: string;
  preview: string;
  score: number;
}

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

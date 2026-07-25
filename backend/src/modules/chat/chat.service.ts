import { eq, asc } from 'drizzle-orm';
import { db } from '../../config/db';
import { conversations, messages } from '../../db/schema';
import type { ChatMode } from '../../shared/types';
import type { NewMessage } from '../../db/schema';

export async function createConversation(userId: string, mode: ChatMode = 'search') {
  const [conv] = await db
    .insert(conversations)
    .values({ userId, mode, title: 'New Conversation' })
    .returning();
  return conv!;
}

export async function getConversationHistory(conversationId: string) {
  return db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [asc(messages.createdAt)],
  });
}

export async function getUserConversations(userId: string) {
  return db.query.conversations.findMany({
    where: eq(conversations.userId, userId),
    orderBy: (c, { desc }) => [desc(c.updatedAt)],
  });
}

export async function saveMessage(data: Omit<NewMessage, 'id' | 'createdAt'>) {
  const [msg] = await db.insert(messages).values(data).returning();
  return msg!;
}

export async function updateConversationTitle(conversationId: string, title: string) {
  await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

export async function verifyConversationOwner(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  return conv?.userId === userId;
}

export async function deleteConversation(conversationId: string, userId: string): Promise<boolean> {
  const conv = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
  if (!conv || conv.userId !== userId) return false;
  await db.delete(conversations).where(eq(conversations.id, conversationId));
  return true;
}

export async function renameConversation(conversationId: string, userId: string, title: string): Promise<boolean> {
  const conv = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
  if (!conv || conv.userId !== userId) return false;
  await db.update(conversations).set({ title, updatedAt: new Date() }).where(eq(conversations.id, conversationId));
  return true;
}

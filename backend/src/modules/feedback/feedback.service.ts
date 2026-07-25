import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/db';
import { messages, conversations } from '../../db/schema';
import { getPineconeIndex, PINECONE_NAMESPACES } from '../../config/pinecone';
import { embedQuery } from '../rag/embeddings.service';
import { scoreImportance } from './importance-scorer';
import { NotFoundError, ValidationError } from '../../shared/utils/errors';

const IMPORTANCE_THRESHOLD = 0.5;

export async function submitFeedback(
  messageId: string,
  userId: string,
  value: 1 | -1
): Promise<void> {
  const msg = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });

  if (!msg) throw new NotFoundError('Message not found');
  if (msg.role !== 'assistant') throw new ValidationError('Can only rate assistant messages');

  // Update feedback in DB
  await db.update(messages).set({ feedback: value }).where(eq(messages.id, messageId));

  if (value === 1) {
    await handleThumbsUp(msg.conversationId, messageId, userId);
  } else {
    await handleThumbsDown(msg.conversationId, messageId);
  }
}

async function handleThumbsUp(
  conversationId: string,
  messageId: string,
  userId: string
): Promise<void> {
  // Get the full conversation to find the user message that preceded this one
  const history = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  const assistantIdx = history.findIndex((m) => m.id === messageId);
  if (assistantIdx <= 0) return;

  const userMsg = history[assistantIdx - 1];
  const assistantMsg = history[assistantIdx];
  if (!userMsg || !assistantMsg || userMsg.role !== 'user') return;

  const importanceScore = scoreImportance({
    query: userMsg.content,
    answer: assistantMsg.content,
    conversationLength: history.length,
  });

  // Thumbs-up adds 0.3 bonus — confirmed answers always get stored
  if (importanceScore + 0.3 > IMPORTANCE_THRESHOLD) {
    await upsertQaPair(userMsg.content, assistantMsg.content);
  }
}

async function handleThumbsDown(conversationId: string, messageId: string): Promise<void> {
  // Log which source chunks contributed to this bad answer
  // They'll accumulate negative signals for future cleanup
  const msg = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });

  if (!msg?.sources) return;

  // Sources are already persisted in messages.sources JSONB
  // A future maintenance job can query messages WHERE feedback = -1
  // and remove pinecone vectors that consistently appear in bad answers
  console.log(`[feedback] Thumbs down recorded for message ${messageId}`);
}

async function upsertQaPair(question: string, answer: string): Promise<void> {
  const content = `Q: ${question}\nA: ${answer}`;
  const embedding = await embedQuery(content);

  const index = getPineconeIndex();
  const ns = index.namespace(PINECONE_NAMESPACES.QA_PAIRS);
  const record = {
    id: uuidv4(),
    values: embedding,
    metadata: {
      question,
      answer,
      preview: content.slice(0, 200),
      isQaPair: true,
      documentName: 'Self-Improvement (User Validated)',
      documentId: 'qa-pairs',
      sourceType: 'qa',
      chunkIndex: 0,
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (ns.upsert as (opts: any) => Promise<void>)({ records: [record] });

  console.log('[feedback] Q&A pair upserted to Pinecone qa-pairs namespace');
}

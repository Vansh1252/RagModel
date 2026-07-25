import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { verifyAccessToken } from '../../shared/utils/jwt';
import { runRAGPipeline } from '../rag/rag.service';
import {
  createConversation,
  getConversationHistory,
  saveMessage,
  updateConversationTitle,
  verifyConversationOwner,
} from './chat.service';
import { logAnalytics } from '../analytics/analytics.service';
import { openai } from '../../config/openai';
import type { ChatMode, WsMessage } from '../../shared/types';
import type { MessageSource } from '../../db/schema';

interface AuthenticatedClient {
  ws: WebSocket;
  userId: string;
  email: string;
  role: string;
  authTimer?: ReturnType<typeof setTimeout>;
  abortController?: AbortController;
}

const clients = new Map<WebSocket, AuthenticatedClient>();

function send(ws: WebSocket, data: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function broadcastToAdmins(data: Record<string, unknown>): void {
  for (const client of clients.values()) {
    if (client.role === 'admin') {
      send(client.ws, data);
    }
  }
}

export function handleConnection(ws: WebSocket): void {
  // 3 second window to send auth message
  const authTimer = setTimeout(() => {
    if (!clients.has(ws)) {
      send(ws, { type: 'error', message: 'Authentication timeout' });
      ws.close(4001, 'Auth timeout');
    }
  }, 3000);

  // Temporary entry so we can cancel on auth
  const tempClient: AuthenticatedClient = { ws, userId: '', email: '', role: 'user', authTimer };
  clients.set(ws, tempClient);

  ws.on('message', async (raw) => {
    let msg: WsMessage;

    try {
      msg = JSON.parse(raw.toString()) as WsMessage;
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    const client = clients.get(ws);
    if (!client) return;

    // --- AUTH HANDSHAKE ---
    if (msg.type === 'auth') {
      clearTimeout(authTimer);
      try {
        const payload = verifyAccessToken(msg['token'] as string);
        client.userId = payload.sub;
        client.email = payload.email;
        client.role = payload.role ?? 'user';
        send(ws, { type: 'auth_ok' });
      } catch {
        send(ws, { type: 'error', message: 'Invalid token' });
        ws.close(4001, 'Invalid token');
      }
      return;
    }

    // All other messages require auth
    if (!client.userId) {
      send(ws, { type: 'error', message: 'Not authenticated' });
      return;
    }

    switch (msg.type) {
      case 'new_conversation':
        await handleNewConversation(client, msg);
        break;
      case 'chat':
        await handleChat(client, msg);
        break;
      case 'cancel':
        client.abortController?.abort();
        send(ws, { type: 'stream_end', messageId: '', sources: [] });
        break;
      default:
        send(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client?.authTimer) clearTimeout(client.authTimer);
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[ws] Client error:', err.message);
    clients.delete(ws);
  });
}

async function handleNewConversation(
  client: AuthenticatedClient,
  msg: WsMessage
): Promise<void> {
  const mode = (msg['mode'] as ChatMode) ?? 'search';
  const conv = await createConversation(client.userId, mode);
  send(client.ws, {
    type: 'conversation_created',
    conversationId: conv.id,
    title: conv.title,
    mode: conv.mode,
  });
}

async function handleChat(client: AuthenticatedClient, msg: WsMessage): Promise<void> {
  const content = msg['content'] as string | undefined;
  const conversationId = msg['conversationId'] as string | undefined;
  const mode = (msg['mode'] as ChatMode) ?? 'search';

  if (!content?.trim() || !conversationId) {
    send(client.ws, { type: 'error', message: 'content and conversationId are required' });
    return;
  }

  // Verify ownership
  const isOwner = await verifyConversationOwner(conversationId, client.userId);
  if (!isOwner) {
    send(client.ws, { type: 'error', message: 'Conversation not found' });
    return;
  }

  // Save user message
  await saveMessage({
    conversationId,
    role: 'user',
    content,
  });

  // Get history for context
  const history = await getConversationHistory(conversationId);
  const historyMessages = history.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const messageId = uuidv4();

  const llmStart = Date.now();
  let fullContent = '';
  let tokensUsed = 0;

  // Create an AbortController for this chat session
  const abortController = new AbortController();
  client.abortController = abortController;

  try {
    const { stream, sources, intent, retrievalMs } = await runRAGPipeline(
      content,
      historyMessages,
      mode
    );

    send(client.ws, { type: 'stream_start', messageId, intent });

    for await (const chunk of stream) {
      // Check if aborted before processing chunk
      if (abortController.signal.aborted) break;

      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        fullContent += delta;
        send(client.ws, { type: 'stream_chunk', messageId, content: delta });
      }

      // Capture usage if available
      const usage = chunk.usage;
      if (usage) tokensUsed = usage.total_tokens ?? 0;
    }

    // If aborted, send stream_end and return early
    if (abortController.signal.aborted) {
      send(client.ws, { type: 'stream_end', messageId, sources: [] });
      return;
    }

    const llmMs = Date.now() - llmStart;

    const messageSources: MessageSource[] = sources.map((s) => ({
      pineconeId: s.pineconeId,
      file: s.metadata.documentName,
      preview: s.metadata.preview,
      score: s.score,
    }));

    // Save assistant message
    const savedMsg = await saveMessage({
      conversationId,
      role: 'assistant',
      content: fullContent,
      sources: messageSources,
      tokensUsed,
      retrievalMs,
    });

    // Auto-title conversation from first exchange
    if (history.length === 0) {
      const title = content.slice(0, 60) + (content.length > 60 ? '...' : '');
      await updateConversationTitle(conversationId, title);
    }

    send(client.ws, {
      type: 'stream_end',
      messageId,
      dbMessageId: savedMsg.id,
      sources: messageSources,
    });

    // Log analytics (fire-and-forget)
    void logAnalytics({
      userId: client.userId,
      query: content,
      intent,
      mode,
      retrievalMs,
      llmMs,
      tokensUsed,
      chunksUsed: sources.length,
      success: true,
    });

    // Generate follow-up suggestions
    try {
      const followUpRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Generate exactly 3 short follow-up questions the user might ask next. Return ONLY a JSON array of 3 strings.',
          },
          {
            role: 'user',
            content: `Q: ${content}\nA: ${fullContent.slice(0, 600)}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 150,
      });
      const raw = followUpRes.choices[0]?.message.content?.trim() ?? '[]';
      const suggestions = JSON.parse(raw) as string[];
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        send(client.ws, { type: 'follow_up_suggestions', suggestions });
      }
    } catch {
      /* ignore — suggestions are non-critical */
    }
  } catch (err) {
    // If aborted, send stream_end quietly
    if (abortController.signal.aborted) {
      send(client.ws, { type: 'stream_end', messageId, sources: [] });
      return;
    }

    const message = err instanceof Error ? err.message : 'RAG pipeline error';
    send(client.ws, { type: 'stream_end', messageId, sources: [] });
    send(client.ws, { type: 'error', message });

    void logAnalytics({
      userId: client.userId,
      query: content,
      mode,
      success: false,
    });
  } finally {
    client.abortController = undefined;
  }
}

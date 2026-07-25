import { openai, CHAT_MODEL } from '../../config/openai';
import { classifyQueryIntent } from './query-intent.service';
import { hybridSearch } from './hybrid-search.service';
import { buildPrompt } from './prompt-builder.service';
import type { ChatMode, RetrievedChunk } from '../../shared/types';
import type OpenAI from 'openai';

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RAGResult {
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  sources: RetrievedChunk[];
  intent: string;
  retrievalMs: number;
}

export async function runRAGPipeline(
  query: string,
  history: HistoryMessage[],
  mode: ChatMode
): Promise<RAGResult> {
  const retrievalStart = Date.now();

  // Step 1: Classify intent and expand query
  const { intent, expandedQueries, topK } = await classifyQueryIntent(query);

  // Step 2: Hybrid search
  const chunks = await hybridSearch(expandedQueries, topK);

  // Take top 5 for the prompt
  const topChunks = chunks.slice(0, 5);

  const retrievalMs = Date.now() - retrievalStart;

  // Step 3: Build prompt
  const { system, messages } = buildPrompt(query, topChunks, history, mode, intent);

  // Step 4: Stream LLM response
  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: system },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ],
    stream: true,
    temperature: mode === 'creative' ? 0.7 : 0.2,
    max_tokens: 1500,
  });

  return {
    stream,
    sources: topChunks,
    intent,
    retrievalMs,
  };
}

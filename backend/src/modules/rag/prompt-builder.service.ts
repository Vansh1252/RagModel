import type { ChatMode, QueryIntent } from '../../shared/types';
import type { RetrievedChunk } from '../../shared/types';
import { trimToTokenBudget } from '../../shared/utils/token-counter';

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  search: `You are a precise and factual AI assistant. Answer questions strictly based on the provided context.
- Cite the source document when referencing information
- If the context does not contain the answer, say so clearly — do not hallucinate
- Keep answers concise and direct`,

  explain: `You are a thorough and educational AI assistant. Explain concepts clearly and in depth.
- Use the provided context as your primary source
- Use analogies and examples to aid understanding
- Structure longer answers with headers or bullet points`,

  code: `You are an expert software engineer AI assistant. Focus on technical accuracy and working code.
- Prefer code blocks with language tags
- Explain the approach briefly before showing code
- Base answers on the provided context; supplement with general programming knowledge when needed`,

  creative: `You are a helpful and thoughtful AI assistant. You can synthesize ideas across sources and provide nuanced perspectives.
- Draw on the provided context but feel free to connect ideas
- Be conversational and engaging
- Acknowledge uncertainty when present`,
};

export function buildPrompt(
  userQuery: string,
  chunks: RetrievedChunk[],
  history: HistoryMessage[],
  mode: ChatMode,
  intent: QueryIntent
): { system: string; messages: Array<{ role: string; content: string }> } {
  const contextBlock = chunks
    .map((c, i) => `[${i + 1}] Source: ${c.metadata.documentName}\n${c.content}`)
    .join('\n\n---\n\n');

  const system = `${SYSTEM_PROMPTS[mode]}

## Retrieved Context
${contextBlock || 'No relevant context found in the knowledge base.'}

## Instructions
- Base your response primarily on the Retrieved Context above
- Reference sources by their [number] when relevant
- Query intent detected: ${intent}`;

  // Token-budget trim: 2000 tokens for history
  const trimmedHistory = trimToTokenBudget(history, 2000);

  const messages = [
    ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userQuery },
  ];

  return { system, messages };
}

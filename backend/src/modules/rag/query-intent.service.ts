import { openai, CHAT_MODEL } from '../../config/openai';
import type { QueryIntent, ChatMode } from '../../shared/types';

export interface QueryIntentResult {
  intent: QueryIntent;
  expandedQueries: string[];
  topK: number;
}

const SYSTEM_PROMPT = `You are a search query analyzer. Given a user query, respond with ONLY valid JSON in this exact format:
{
  "intent": "factual" | "conversational" | "code" | "exploratory",
  "expandedQueries": ["query1", "query2", "query3"],
  "topK": 5
}

Rules:
- intent: factual = wants a specific fact; conversational = casual chat; code = wants code/technical impl; exploratory = broad research
- expandedQueries: 2-3 semantically expanded versions of the query to improve retrieval. Include the original as first item.
- topK: 5 for short/simple queries, 10 for medium, 15 for long/complex queries
- Respond ONLY with the JSON object, no markdown, no explanation.`;

export async function classifyQueryIntent(query: string): Promise<QueryIntentResult> {
  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      temperature: 0,
      max_tokens: 300,
    });

    const raw = response.choices[0]?.message.content?.trim() ?? '';
    const parsed = JSON.parse(raw) as QueryIntentResult;

    return {
      intent: parsed.intent ?? 'factual',
      expandedQueries:
        Array.isArray(parsed.expandedQueries) && parsed.expandedQueries.length > 0
          ? parsed.expandedQueries
          : [query],
      topK: typeof parsed.topK === 'number' ? Math.min(Math.max(parsed.topK, 3), 15) : 8,
    };
  } catch {
    // Fallback if LLM call fails — don't block the main query
    return {
      intent: 'factual',
      expandedQueries: [query],
      topK: 8,
    };
  }
}

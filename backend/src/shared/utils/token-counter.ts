/**
 * Rough token estimate: ~4 chars per token (OpenAI approximation).
 * For exact counts use tiktoken — this avoids a heavy dependency for MVP.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Trims conversation history to fit within a token budget.
 * Iterates from newest to oldest, stops when budget is exceeded.
 */
export function trimToTokenBudget<T extends { content: string }>(
  messages: T[],
  budgetTokens: number
): T[] {
  let used = 0;
  const result: T[] = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg) continue;
    const tokens = estimateTokens(msg.content);
    if (used + tokens > budgetTokens) break;
    used += tokens;
    result.unshift(msg);
  }

  return result;
}

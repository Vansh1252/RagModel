interface ScoringInput {
  query: string;
  answer: string;
  conversationLength: number;
  previouslyAsked?: boolean;
}

/**
 * Scores whether a Q+A pair is worth storing in Pinecone qa-pairs namespace.
 * Returns a score 0-1. Threshold: > 0.5 gets upserted.
 */
export function scoreImportance(input: ScoringInput): number {
  let score = 0;

  // Long query = likely substantive
  if (input.query.length > 80) score += 0.2;
  else if (input.query.length > 40) score += 0.1;

  // Long answer = detailed response worth keeping
  if (input.answer.length > 500) score += 0.25;
  else if (input.answer.length > 200) score += 0.15;

  // User engaged in a longer conversation (signals usefulness)
  if (input.conversationLength >= 6) score += 0.2;
  else if (input.conversationLength >= 3) score += 0.1;

  // Repeated question type = high demand
  if (input.previouslyAsked) score += 0.2;

  // Always worth storing thumbs-up explicitly confirmed answers
  // (caller adds 0.3 for thumbs-up to push over threshold)

  return Math.min(score, 1);
}

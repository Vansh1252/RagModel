import { openai, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from '../../config/openai';

const cache = new Map<string, number[]>();
const MAX_CACHE = 500;

export async function embedQuery(text: string): Promise<number[]> {
  const key = text.slice(0, 200);
  const cached = cache.get(key);
  if (cached) return cached;

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const embedding = response.data[0]?.embedding ?? [];

  // Simple LRU: evict oldest when full
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  cache.set(key, embedding);
  return embedding;
}

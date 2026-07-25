import { pool } from '../../config/db';
import { getPineconeIndex, PINECONE_NAMESPACES } from '../../config/pinecone';
import { embedQuery } from './embeddings.service';
import type { RetrievedChunk } from '../../shared/types';

async function fetchFullContent(pineconeIds: string[]): Promise<Map<string, string>> {
  if (pineconeIds.length === 0) return new Map();
  const placeholders = pineconeIds.map((_, i) => `$${i + 1}`).join(', ');
  const result = await pool.query<{ pinecone_id: string; content: string }>(
    `SELECT pinecone_id, content FROM document_chunks WHERE pinecone_id IN (${placeholders})`,
    pineconeIds
  );
  return new Map(result.rows.map((r) => [r.pinecone_id, r.content]));
}

interface RawPgResult {
  pinecone_id: string;
  content: string;
  metadata: string;
  rank: number;
}

export async function hybridSearch(
  queries: string[],
  topK: number
): Promise<RetrievedChunk[]> {
  const primaryQuery = queries[0] ?? '';

  // Run both searches in parallel
  const [vectorResults, keywordResults] = await Promise.all([
    vectorSearch(primaryQuery, topK),
    keywordSearch(queries, topK),
  ]);

  return mergeResults(vectorResults, keywordResults, topK);
}

async function vectorSearch(query: string, topK: number): Promise<RetrievedChunk[]> {
  const embedding = await embedQuery(query);
  const index = getPineconeIndex();

  // Search both namespaces in parallel
  const [docResults, qaResults] = await Promise.all([
    index.namespace(PINECONE_NAMESPACES.DOCUMENTS).query({
      vector: embedding,
      topK,
      includeMetadata: true,
    }),
    index.namespace(PINECONE_NAMESPACES.QA_PAIRS).query({
      vector: embedding,
      topK: Math.ceil(topK / 2),
      includeMetadata: true,
    }),
  ]);

  const all = [...(docResults.matches ?? []), ...(qaResults.matches ?? [])];

  // Fetch full chunk content from PostgreSQL — Pinecone only stores a 200-char preview
  const ids = all.map((m) => m.id);
  const contentMap = await fetchFullContent(ids);

  return all.map((match) => {
    const preview = (match.metadata?.['preview'] as string) ?? '';
    const fullContent = contentMap.get(match.id) ?? preview;
    return {
      pineconeId: match.id,
      content: fullContent,
      score: match.score ?? 0,
      metadata: {
        documentId: (match.metadata?.['documentId'] as string) ?? '',
        documentName: (match.metadata?.['documentName'] as string) ?? '',
        sourceType: (match.metadata?.['sourceType'] as string) ?? '',
        chunkIndex: (match.metadata?.['chunkIndex'] as number) ?? 0,
        preview,
        isQaPair: (match.metadata?.['isQaPair'] as boolean) ?? false,
      },
    };
  }) as RetrievedChunk[];
}

async function keywordSearch(queries: string[], topK: number): Promise<RetrievedChunk[]> {
  // Build tsquery from all expanded queries
  const tsQuery = queries
    .flatMap((q) => q.split(/\s+/).filter((w) => w.length > 2))
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .join(' | ');

  if (!tsQuery) return [];

  const sql = `
    SELECT
      pinecone_id,
      content,
      metadata,
      ts_rank(tsv, plainto_tsquery('english', $1)) AS rank
    FROM document_chunks
    WHERE tsv @@ plainto_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT $2
  `;

  try {
    const result = await pool.query<RawPgResult>(sql, [queries[0] ?? '', topK]);

    return result.rows.map((row) => {
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(row.metadata ?? '{}') as Record<string, unknown>;
      } catch {
        // ignore
      }

      return {
        pineconeId: row.pinecone_id ?? '',
        content: row.content,
        score: row.rank,
        metadata: {
          documentId: (meta['documentId'] as string) ?? '',
          documentName: (meta['documentName'] as string) ?? '',
          sourceType: (meta['sourceType'] as string) ?? '',
          chunkIndex: (meta['chunkIndex'] as number) ?? 0,
          preview: row.content.slice(0, 200),
        },
      } as RetrievedChunk;
    });
  } catch {
    return [];
  }
}

function mergeResults(
  vectorResults: RetrievedChunk[],
  keywordResults: RetrievedChunk[],
  topK: number
): RetrievedChunk[] {
  const scoreMap = new Map<string, { chunk: RetrievedChunk; vectorScore: number; keywordScore: number }>();

  // Normalize vector scores (already 0-1 for cosine)
  for (const chunk of vectorResults) {
    scoreMap.set(chunk.pineconeId, {
      chunk,
      vectorScore: chunk.score,
      keywordScore: 0,
    });
  }

  // Normalize keyword scores relative to max
  const maxKeyword = Math.max(...keywordResults.map((r) => r.score), 1);
  for (const chunk of keywordResults) {
    const existing = scoreMap.get(chunk.pineconeId);
    const normalizedKeyword = chunk.score / maxKeyword;

    if (existing) {
      existing.keywordScore = normalizedKeyword;
    } else {
      scoreMap.set(chunk.pineconeId, {
        chunk,
        vectorScore: 0,
        keywordScore: normalizedKeyword,
      });
    }
  }

  // Score fusion
  const ranked = Array.from(scoreMap.values())
    .map(({ chunk, vectorScore, keywordScore }) => {
      const isQaPair = (chunk.metadata as unknown as Record<string, unknown>)['isQaPair'] === true;
      const fusedScore = 0.6 * vectorScore + 0.3 * keywordScore + (isQaPair ? 0.2 : 0);
      return { ...chunk, score: fusedScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return ranked;
}

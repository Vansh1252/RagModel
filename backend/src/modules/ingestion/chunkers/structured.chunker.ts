import { estimateTokens } from '../../../shared/utils/token-counter';

export interface StructuredChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

const MAX_ROW_TOKENS = 400;
const BATCH_SIZE = 8;

/**
 * Chunks CSV-like or JSON array data.
 * Each row/object is kept as a self-contained chunk with headers repeated.
 */
export function chunkStructured(
  data: Record<string, unknown>[],
  sourceName: string
): StructuredChunk[] {
  if (data.length === 0) return [];

  const keys = Object.keys(data[0] ?? {});
  const header = `[Source: ${sourceName}] Fields: ${keys.join(', ')}`;
  const chunks: StructuredChunk[] = [];
  let chunkIndex = 0;

  // Batch small rows, keep large rows solo
  let batch: string[] = [];

  for (const row of data) {
    const rowStr = formatRow(row, keys);
    const rowTokens = estimateTokens(rowStr);

    if (rowTokens > MAX_ROW_TOKENS) {
      // Flush current batch first
      if (batch.length > 0) {
        chunks.push(makeChunk(`${header}\n\n${batch.join('\n---\n')}`, chunkIndex++));
        batch = [];
      }
      chunks.push(makeChunk(`${header}\n\n${rowStr}`, chunkIndex++));
    } else {
      batch.push(rowStr);
      if (batch.length >= BATCH_SIZE) {
        chunks.push(makeChunk(`${header}\n\n${batch.join('\n---\n')}`, chunkIndex++));
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    chunks.push(makeChunk(`${header}\n\n${batch.join('\n---\n')}`, chunkIndex++));
  }

  return chunks;
}

function formatRow(row: Record<string, unknown>, keys: string[]): string {
  return keys.map((k) => `${k}: ${String(row[k] ?? '')}`).join('\n');
}

function makeChunk(content: string, index: number): StructuredChunk {
  return {
    content: content.trim(),
    chunkIndex: index,
    tokenCount: estimateTokens(content),
  };
}

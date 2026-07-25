import { estimateTokens } from '../../../shared/utils/token-counter';

export interface TextChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

const CHUNK_SIZE_TOKENS = 800;
const OVERLAP_TOKENS = 150;

/**
 * Splits text into chunks using recursive character splitting.
 * Split priority: paragraph → newline → sentence → word
 */
export function chunkText(text: string, documentName: string): TextChunk[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const rawChunks = recursiveSplit(normalized);
  const merged = mergeSmallChunks(rawChunks);
  const withOverlap = applyOverlap(merged);

  return withOverlap.map((content, i) => ({
    content: `[Source: ${documentName}]\n\n${content.trim()}`,
    chunkIndex: i,
    tokenCount: estimateTokens(content),
  }));
}

function recursiveSplit(text: string): string[] {
  const separators = ['\n\n', '\n', '. ', ' '];
  return split(text, separators);
}

function split(text: string, separators: string[]): string[] {
  if (estimateTokens(text) <= CHUNK_SIZE_TOKENS) return [text];

  const sep = separators[0];
  if (!sep) return [text]; // no more separators — return as-is

  const parts = text.split(sep);
  const results: string[] = [];

  for (const part of parts) {
    if (!part.trim()) continue;
    if (estimateTokens(part) <= CHUNK_SIZE_TOKENS) {
      results.push(part);
    } else {
      results.push(...split(part, separators.slice(1)));
    }
  }

  return results;
}

function mergeSmallChunks(chunks: string[]): string[] {
  const result: string[] = [];
  let buffer = '';

  for (const chunk of chunks) {
    const combined = buffer ? `${buffer}\n\n${chunk}` : chunk;
    if (estimateTokens(combined) <= CHUNK_SIZE_TOKENS) {
      buffer = combined;
    } else {
      if (buffer) result.push(buffer);
      buffer = chunk;
    }
  }

  if (buffer) result.push(buffer);
  return result;
}

function applyOverlap(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks;

  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;

    const prev = chunks[i - 1];
    if (!prev) return chunk;

    // Take last ~OVERLAP_TOKENS worth of chars from previous chunk
    const overlapChars = OVERLAP_TOKENS * 4;
    const overlapText = prev.slice(-overlapChars);
    return `${overlapText}\n\n${chunk}`;
  });
}

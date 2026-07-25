import { estimateTokens } from '../../../shared/utils/token-counter';

export interface CodeChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  language: string;
}

const MAX_CHUNK_TOKENS = 1200;

/**
 * Splits code files at function/class/method boundaries.
 * Falls back to line-based splitting if a single block is too large.
 */
export function chunkCode(code: string, filePath: string, language: string): CodeChunk[] {
  const header = `[File: ${filePath}] [Language: ${language}]`;
  const blocks = splitAtBoundaries(code, language);
  const chunks: CodeChunk[] = [];

  let buffer = '';
  let chunkIndex = 0;

  for (const block of blocks) {
    const candidate = buffer ? `${buffer}\n\n${block}` : block;

    if (estimateTokens(candidate) <= MAX_CHUNK_TOKENS) {
      buffer = candidate;
    } else {
      if (buffer) {
        chunks.push(makeChunk(`${header}\n\n${buffer}`, chunkIndex++, language));
      }
      // If single block is too big, split by lines
      if (estimateTokens(block) > MAX_CHUNK_TOKENS) {
        const lineChunks = splitByLines(block, MAX_CHUNK_TOKENS);
        for (const lc of lineChunks) {
          chunks.push(makeChunk(`${header}\n\n${lc}`, chunkIndex++, language));
        }
        buffer = '';
      } else {
        buffer = block;
      }
    }
  }

  if (buffer) {
    chunks.push(makeChunk(`${header}\n\n${buffer}`, chunkIndex++, language));
  }

  return chunks;
}

function splitAtBoundaries(code: string, language: string): string[] {
  // Patterns that typically start a new top-level block
  const patterns: Record<string, RegExp> = {
    typescript: /^(export\s+)?(async\s+)?function\s|^(export\s+)?class\s|^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/m,
    javascript: /^(export\s+)?(async\s+)?function\s|^(export\s+)?class\s|^(module\.exports)/m,
    python: /^(async\s+)?def\s+\w+|^class\s+\w+/m,
    default: /^(function|class|def|public|private|protected|async)\s/m,
  };

  const pattern = patterns[language] ?? patterns['default']!;
  const lines = code.split('\n');
  const blocks: string[] = [];
  let current: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (i > 0 && pattern.test(line) && current.length > 0) {
      blocks.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) blocks.push(current.join('\n'));
  return blocks.filter((b) => b.trim().length > 0);
}

function splitByLines(code: string, maxTokens: number): string[] {
  const lines = code.split('\n');
  const chunks: string[] = [];
  let buffer: string[] = [];

  for (const line of lines) {
    buffer.push(line);
    if (estimateTokens(buffer.join('\n')) > maxTokens) {
      if (buffer.length > 1) {
        buffer.pop();
        chunks.push(buffer.join('\n'));
        buffer = [line];
      } else {
        chunks.push(buffer.join('\n'));
        buffer = [];
      }
    }
  }

  if (buffer.length > 0) chunks.push(buffer.join('\n'));
  return chunks;
}

function makeChunk(content: string, index: number, language: string): CodeChunk {
  return {
    content: content.trim(),
    chunkIndex: index,
    tokenCount: estimateTokens(content),
    language,
  };
}

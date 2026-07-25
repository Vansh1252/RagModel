import { Pinecone } from '@pinecone-database/pinecone';
import { env } from './env';

export const pinecone = new Pinecone({
  apiKey: env.PINECONE_API_KEY,
});

export const PINECONE_NAMESPACES = {
  DOCUMENTS: 'documents',
  QA_PAIRS: 'qa-pairs',
} as const;

export function getPineconeIndex() {
  return pinecone.index(env.PINECONE_INDEX);
}

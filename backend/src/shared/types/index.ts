import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'user' | 'admin';
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export type QueryIntent = 'factual' | 'conversational' | 'code' | 'exploratory';
export type ChatMode = 'search' | 'explain' | 'code' | 'creative';
export type MessageRole = 'user' | 'assistant';

export interface ChunkMetadata {
  documentId: string;
  documentName: string;
  sourceType: string;
  chunkIndex: number;
  preview: string;
}

export interface RetrievedChunk {
  pineconeId: string;
  content: string;
  score: number;
  metadata: ChunkMetadata;
}

export interface WsMessage {
  type: string;
  [key: string]: unknown;
}

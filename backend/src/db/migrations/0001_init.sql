-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE chat_mode AS ENUM ('search', 'explain', 'code', 'creative');
CREATE TYPE message_role AS ENUM ('user', 'assistant');
CREATE TYPE source_type AS ENUM ('pdf', 'txt', 'md', 'url', 'qa');
CREATE TYPE document_status AS ENUM ('pending', 'processing', 'indexed', 'failed');

-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(100),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sessions (refresh tokens)
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(512) NOT NULL UNIQUE,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) DEFAULT 'New Conversation',
  mode        chat_mode NOT NULL DEFAULT 'search',
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role                message_role NOT NULL,
  content             TEXT NOT NULL,
  sources             JSONB,
  feedback            SMALLINT,
  tokens_used         INTEGER,
  retrieval_ms        INTEGER,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(500) NOT NULL,
  source_type  source_type NOT NULL,
  chunk_count  INTEGER DEFAULT 0,
  status       document_status NOT NULL DEFAULT 'pending',
  error        TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Document chunks with tsvector for keyword (BM25-style) search
CREATE TABLE document_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  tsv          TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  pinecone_id  VARCHAR(255),
  metadata     TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- GIN index for fast full-text search
CREATE INDEX idx_document_chunks_tsv ON document_chunks USING GIN(tsv);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);

-- Analytics
CREATE TABLE analytics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  query         TEXT NOT NULL,
  intent        VARCHAR(50),
  mode          VARCHAR(20),
  retrieval_ms  INTEGER,
  llm_ms        INTEGER,
  tokens_used   INTEGER,
  chunks_used   INTEGER,
  success       BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for sessions lookup
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);

-- Index for conversations lookup
CREATE INDEX idx_conversations_user_id ON conversations(user_id);

-- Index for messages lookup
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

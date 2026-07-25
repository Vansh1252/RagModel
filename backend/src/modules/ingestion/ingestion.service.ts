import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { documents, documentChunks } from "../../db/schema";
import {
  openai,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from "../../config/openai";
import { getPineconeIndex, PINECONE_NAMESPACES } from "../../config/pinecone";
import { chunkText } from "./chunkers/text.chunker";
import { chunkCode } from "./chunkers/code.chunker";
import { chunkStructured } from "./chunkers/structured.chunker";
import { broadcastToAdmins } from "../chat/chat.gateway";

const EMBED_BATCH_SIZE = 100;

function sanitizeText(text: string): string {
  return text
    .replace(/\x00/g, "") // ❌ remove null bytes (main issue)
    .replace(/[\u0000-\u001F\u007F]/g, "") // remove control chars
    .replace(/\uFFFD/g, "") // remove replacement chars
    .trim();
}

export async function processDocument(
  documentId: string,
  filePath: string,
  fileType: string,
  originalName: string,
): Promise<void> {
  await db
    .update(documents)
    .set({ status: "processing" })
    .where(eq(documents.id, documentId));

  try {
    let rawContent: string;
    if (
      fileType === "application/pdf" ||
      path.extname(originalName).toLowerCase() === ".pdf"
    ) {
      const buffer = fs.readFileSync(filePath);
      // pdf-parse v1 is CJS — require() is the only reliable way to load it
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (
        b: Buffer,
      ) => Promise<{ text: string }>;
      const parsed = await pdfParse(buffer);
      rawContent = sanitizeText(parsed.text);
    } else {
      rawContent = sanitizeText(fs.readFileSync(filePath, "utf8"));
    }
    const chunks = extractChunks(rawContent, originalName, fileType);

    // Embed in batches
    const allEmbeddings = await embedBatches(chunks.map((c) => c.content));

    // Build Pinecone vectors
    const index = getPineconeIndex();
    const ns = index.namespace(PINECONE_NAMESPACES.DOCUMENTS);

    const vectors = chunks.map((chunk, i) => ({
      id: uuidv4(),
      values: allEmbeddings[i] ?? new Array(EMBEDDING_DIMENSIONS).fill(0),
      metadata: {
        documentId,
        documentName: originalName,
        sourceType: fileType,
        chunkIndex: chunk.chunkIndex,
        preview: chunk.content.slice(0, 200),
      },
    }));

    // Upsert to Pinecone in batches of 100
    for (let i = 0; i < vectors.length; i += 100) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ns.upsert as (opts: any) => Promise<void>)({
        records: vectors.slice(i, i + 100),
      });
    }

    // Write chunks to PostgreSQL for keyword search
    const pgChunks = chunks.map((chunk, i) => ({
      documentId,
      content: sanitizeText(chunk.content),
      pineconeId: vectors[i]!.id,
      metadata: JSON.stringify({
        documentName: originalName,
        sourceType: fileType,
        chunkIndex: chunk.chunkIndex,
      }),
    }));

    const BATCH_SIZE = 100;

    for (let i = 0; i < pgChunks.length; i += BATCH_SIZE) {
      const batch = pgChunks.slice(i, i + BATCH_SIZE);
      await db.insert(documentChunks).values(batch);
    }
    
    const chunkCount = chunks.length;
    await db
      .update(documents)
      .set({ status: "indexed", chunkCount })
      .where(eq(documents.id, documentId));

    broadcastToAdmins({
      type: "doc_indexed",
      documentId,
      name: originalName,
      chunkCount,
    });

    // Clean up temp file only after success so retries can still read it
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db
      .update(documents)
      .set({ status: "failed", error: errMsg })
      .where(eq(documents.id, documentId));

    broadcastToAdmins({
      type: "doc_failed",
      documentId,
      name: originalName,
      error: errMsg,
    });

    throw err;
  }
}

function extractChunks(
  content: string,
  name: string,
  fileType: string,
): Array<{ content: string; chunkIndex: number }> {
  const ext = path.extname(name).toLowerCase().slice(1);
  const codeExts = [
    "ts",
    "js",
    "tsx",
    "jsx",
    "py",
    "java",
    "go",
    "rs",
    "cpp",
    "c",
  ];

  if (codeExts.includes(ext)) {
    return chunkCode(content, name, ext);
  }

  if (fileType === "application/json" || ext === "json") {
    try {
      const parsed = JSON.parse(content) as unknown;
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return chunkStructured(arr as Record<string, unknown>[], name);
    } catch {
      return chunkText(content, name);
    }
  }

  return chunkText(content, name);
}

async function embedBatches(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const sorted = response.data.sort((a, b) => a.index - b.index);
    results.push(...sorted.map((e) => e.embedding));
  }

  return results;
}

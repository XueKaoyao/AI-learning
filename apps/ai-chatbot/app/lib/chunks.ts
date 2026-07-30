import { chunkDocument } from '@/app/lib/similarity';
import type { Document } from '@/app/generated/prisma/client';
import {
  deleteChunksByDocumentId,
  dropChunksTable,
  openChunkTable,
  upsertChunkRows,
  type LanceChunkRow,
} from '@/app/lib/lancedb';

// --- 原手动 embed（@xenova/transformers）已停用，改由 LanceDB Embedding Function 自动生成 ---
// import { embed } from '@/app/lib/embedding';

// --- 原 Postgres Chunk + topKSimilar 方案（已停用，改用 LanceDB）---
// import { prisma } from '@/app/lib/prisma';
// import { chunkDocument, topKSimilar } from '@/app/lib/similarity';
// import type { Chunk, Document } from '@/app/generated/prisma/client';

export type SearchHit = {
  id: string;
  documentId: string;
  title: string;
  snippet: string;
  score: number;
  index: number;
};

/** 将文档切分后写入 LanceDB（vector 由 Embedding Function 根据 snippet 自动生成） */
export async function indexDocumentChunks(document: Document): Promise<void> {
  const parts = chunkDocument(document.content, document.id);
  if (parts.length === 0) {
    return;
  }

  const rows: LanceChunkRow[] = parts.map((part, i) => ({
    id: `${document.id}#${i}`,
    documentId: document.id,
    title: document.title,
    snippet: part.text,
    index: i,
  }));

  // --- 原方案：本地 embed 后写入 vector ---
  // const rows: LanceChunkRow[] = [];
  // for (let i = 0; i < parts.length; i++) {
  //   const vector = await embed(parts[i].text);
  //   rows.push({
  //     id: `${document.id}#${i}`,
  //     documentId: document.id,
  //     title: document.title,
  //     snippet: parts[i].text,
  //     index: i,
  //     vector,
  //   });
  // }

  await upsertChunkRows(rows);

  // --- 原方案：写入 Prisma Chunk.embedding ---
  // const data = [];
  // for (let i = 0; i < parts.length; i++) {
  //   const embedding = await embed(parts[i].text);
  //   data.push({
  //     documentId: document.id,
  //     content: parts[i].text,
  //     embedding,
  //     index: i,
  //   });
  // }
  // return prisma.chunk.createManyAndReturn({ data });
}

/** 语义检索：table.search(query) 由 LanceDB 自动 embed query */
export async function searchSnippets(
  query: string,
  k = 5,
): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('query is required');
  }
  if (!Number.isFinite(k) || k < 1) {
    throw new Error('k must be a positive number');
  }

  const table = await openChunkTable();
  if (!table) {
    return [];
  }

  // --- 原方案：手动 embed(query) + vectorSearch ---
  // const queryVec = await embed(trimmed);
  // const results = await table
  //   .vectorSearch(queryVec)
  //   .limit(k)
  //   .select(['id', 'documentId', 'title', 'snippet', 'index', '_distance'])
  //   .toArray();

  const results = await table
    .search(trimmed)
    .limit(k)
    .select(['id', 'documentId', 'title', 'snippet', 'index', '_distance'])
    .toArray();

  return results.map((row) => {
    const distance = Number(row._distance ?? 0);
    return {
      id: String(row.id),
      documentId: String(row.documentId),
      title: String(row.title),
      snippet: String(row.snippet),
      index: Number(row.index),
      // LanceDB 默认 L2 距离：转成 (0,1] 便于前端展示「相似度」
      score: 1 / (1 + distance),
    };
  });

  // --- 原方案：Postgres 全量拉取 + topKSimilar ---
  // const [queryVec, chunks] = await Promise.all([
  //   embed(trimmed),
  //   prisma.chunk.findMany({
  //     include: {
  //       document: { select: { title: true } },
  //     },
  //   }),
  // ]);
  // if (chunks.length === 0) return [];
  // const hits = topKSimilar(
  //   queryVec,
  //   chunks.map((c) => ({ id: c.id, embedding: c.embedding })),
  //   Math.min(k, chunks.length),
  // );
  // const byId = new Map(chunks.map((c) => [c.id, c]));
  // return hits.map((h) => {
  //   const chunk = byId.get(h.id)!;
  //   return {
  //     id: h.id,
  //     documentId: chunk.documentId,
  //     title: chunk.document.title,
  //     snippet: chunk.content,
  //     score: h.score,
  //     index: chunk.index,
  //   };
  // });
}

/** 删除某文档在 LanceDB 中的向量 */
export async function removeDocumentChunks(documentId: string): Promise<void> {
  await deleteChunksByDocumentId(documentId);
}

/** 清空 LanceDB chunks 表 */
export async function clearAllChunks(): Promise<void> {
  await dropChunksTable();
}

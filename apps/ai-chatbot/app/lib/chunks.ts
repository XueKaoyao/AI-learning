import { prisma } from '@/app/lib/prisma';
import { embed } from '@/app/lib/embedding';
import { chunkDocument, topKSimilar } from '@/app/lib/similarity';
import type { Chunk, Document } from '@/app/generated/prisma/client';

export type SearchHit = {
  id: string;
  documentId: string;
  title: string;
  snippet: string;
  score: number;
  index: number;
};

/** 将文档切分并写入 Chunk（含 embedding） */
export async function indexDocumentChunks(
  document: Document,
): Promise<Chunk[]> {
  const parts = chunkDocument(document.content, document.id);
  if (parts.length === 0) {
    return [];
  }

  const data = [];
  for (let i = 0; i < parts.length; i++) {
    const embedding = await embed(parts[i].text);
    data.push({
      documentId: document.id,
      content: parts[i].text,
      embedding,
      index: i,
    });
  }

  return prisma.chunk.createManyAndReturn({ data });
}

/** 语义检索：只对 query embed，与已存 Chunk 向量做 Top-K */
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

  const [queryVec, chunks] = await Promise.all([
    embed(trimmed),
    prisma.chunk.findMany({
      include: {
        document: { select: { title: true } },
      },
    }),
  ]);

  if (chunks.length === 0) {
    return [];
  }

  const hits = topKSimilar(
    queryVec,
    chunks.map((c) => ({ id: c.id, embedding: c.embedding })),
    Math.min(k, chunks.length),
  );

  const byId = new Map(chunks.map((c) => [c.id, c]));

  return hits.map((h) => {
    const chunk = byId.get(h.id)!;
    return {
      id: h.id,
      documentId: chunk.documentId,
      title: chunk.document.title,
      snippet: chunk.content,
      score: h.score,
      index: chunk.index,
    };
  });
}

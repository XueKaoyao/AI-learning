import { CandidateResult } from '../types/RetrievalType';

/** 余弦相似度，返回 [-1, 1]，越接近 1 越相似 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`向量维度不一致: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  return dot / denom;
}

/**
 * 若 embedding 已 L2 归一化（normalize: true），
 * 余弦相似度 = 点积，更快
 */
export function cosineSimilarityNormalized(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * 按段落空行切片。支持真实换行与转义串（\\r\\n / \\n）。
 * 分隔符：\\r\\n\\r\\n 或 \\n\\n（一段空行）。
 */
export function chunkDocument(content: string, documentId: string) {
  const normalized = content
    // 若正文里是转义后的字面量 \r\n / \n，先还原成真实换行
    .replace(/\\r\\n/g, '\r\n')
    .replace(/\\n/g, '\n')
    // 统一成 \n，便于按空行切
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  return normalized
    .split(/\n{2,}/) // 对应原文中的 \r\n\r\n 或 \n\n
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((text, i) => ({
      id: `${documentId}#${i}`,
      documentId,
      text,
    }));
}

/** 在候选库中找最相似的 Top-K */
export function topKSimilar(
  query: number[],
  candidates: { id: string; embedding: number[] }[],
  k = 5,
): CandidateResult[] {
  return candidates
    .map((c) => ({
      id: c.id,
      score: cosineSimilarityNormalized(query, c.embedding),
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k);
}

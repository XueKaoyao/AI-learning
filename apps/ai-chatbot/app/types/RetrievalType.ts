export interface EmbedResType {
  embedding: number[];
  dimensions: number;
  similarity?: number;
}

export interface CandidateResult {
  id: string;
  score: number;
}

export interface DocumentType {
  id: string;
  createdAt: string;
  content: string;
  title: string;
  filename?: string;
  updatedAt: string;
}

export interface SearchHit {
  id: string;
  documentId: string;
  title: string;
  filename: string;
  page: number;
  snippet: string;
  score: number;
  index: number;
}

/**
 * RAG/检索各阶段耗时（毫秒，墙钟时间）。
 *
 * 边界约定：
 * - total：进入 POST handler 到构造完响应体之前
 * - validate：解析 body + 参数校验
 * - openTable：打开/检查 LanceDB chunks 表
 * - search：从 table.search 到 toArray（含 query embed + 向量检索）
 * - map：原始行映射为 SearchHit
 *
 * 说明：LanceDB 的 embed 与 ANN 检索在同一 search 调用内，无法再拆时合并记入 search。
 */
export interface RetrievalTimings {
  totalMs: number;
  validateMs: number;
  openTableMs: number;
  searchMs: number;
  mapMs: number;
}

export interface SearchResponse {
  query: string;
  count: number;
  results: SearchHit[];
  /** 分段耗时（毫秒），由 POST /api/retrieval 写入 */
  timings?: RetrievalTimings;
}

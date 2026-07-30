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
  updatedAt: string;
}

export interface SearchHit {
  id: string;
  documentId: string;
  title: string;
  snippet: string;
  score: number;
  index: number;
}

export interface SearchResponse {
  query: string;
  count: number;
  results: SearchHit[];
}

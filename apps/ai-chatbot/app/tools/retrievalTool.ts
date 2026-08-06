import { tool } from 'ai';
import { z } from 'zod';
import { searchSnippets, type SearchHit } from '@/app/lib/chunks';

export type RetrievalToolResult = {
  count: number;
  titles: string[];
  results: Array<
    Pick<SearchHit, 'title' | 'filename' | 'page' | 'snippet' | 'score'>
  >;
};

const DEFAULT_K = 3;

/**
 * 知识库检索 tool：供 streamText 挂载。
 * 仅接收 question；内部固定 Top-K = 3。
 */
export const getInformation = tool({
  description:
    '从知识库检索与用户问题相关的文档片段。回答事实性问题前应先调用本工具。',
  inputSchema: z.object({
    question: z.string().describe('用户的问题或检索关键词'),
  }),
  execute: async ({ question }): Promise<RetrievalToolResult> => {
    const { hits } = await searchSnippets(question, DEFAULT_K);
    const titles = [...new Set(hits.map((h) => h.title))];
    return {
      count: hits.length,
      titles,
      results: hits.map((h) => ({
        title: h.title,
        filename: h.filename,
        page: h.page,
        snippet: h.snippet,
        score: h.score,
      })),
    };
  },
});

export const retrievalTools = {
  getInformation,
};

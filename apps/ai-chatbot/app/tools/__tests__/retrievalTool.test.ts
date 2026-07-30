// cd apps/ai-chatbot
// pnpm exec jest --config jest.config.ts --testPathPatterns=retrievalTool

const mockSearchSnippets = jest.fn();

jest.mock('@/app/lib/chunks', () => ({
  searchSnippets: (...args: unknown[]) => mockSearchSnippets(...args),
}));

/** 将 tool() 做成透传，便于直接测 execute 逻辑 */
jest.mock('ai', () => ({
  tool: <T>(definition: T) => definition,
}));

jest.mock('zod', () => {
  const chain = {
    describe: () => chain,
  };
  return {
    z: {
      object: (shape: unknown) => shape,
      string: () => chain,
    },
  };
});

import { getInformation, retrievalTools } from '../retrievalTool';
import type { SearchHit } from '@/app/lib/chunks';

function hit(
  overrides: Partial<SearchHit> & Pick<SearchHit, 'title' | 'snippet'>,
): SearchHit {
  return {
    id: 'doc#0',
    documentId: 'doc',
    score: 0.9,
    index: 0,
    ...overrides,
  };
}

type ExecuteFn = (
  input: { question: string },
  options: { toolCallId: string; messages: unknown[] },
) => Promise<{
  count: number;
  titles: string[];
  results: Array<{ title: string; snippet: string; score: number }>;
}>;

const execute = getInformation.execute as ExecuteFn;

describe('retrievalTool', () => {
  beforeEach(() => {
    mockSearchSnippets.mockReset();
  });

  it('exports getInformation on retrievalTools', () => {
    expect(retrievalTools.getInformation).toBe(getInformation);
    expect(typeof getInformation.execute).toBe('function');
  });

  it('calls searchSnippets with question and k=3', async () => {
    mockSearchSnippets.mockResolvedValueOnce([]);

    await execute(
      { question: '什么是向量检索' },
      { toolCallId: 'call-1', messages: [] },
    );

    expect(mockSearchSnippets).toHaveBeenCalledTimes(1);
    expect(mockSearchSnippets).toHaveBeenCalledWith('什么是向量检索', 3);
  });

  it('maps hits to count, unique titles, and results', async () => {
    mockSearchSnippets.mockResolvedValueOnce([
      hit({
        id: 'a#0',
        documentId: 'a',
        title: 'RAG 简介',
        snippet: 'RAG 是检索增强生成',
        score: 0.95,
        index: 0,
      }),
      hit({
        id: 'a#1',
        documentId: 'a',
        title: 'RAG 简介',
        snippet: '常用于知识库问答',
        score: 0.88,
        index: 1,
      }),
      hit({
        id: 'b#0',
        documentId: 'b',
        title: '向量检索',
        snippet: '用 embedding 找相似片段',
        score: 0.8,
        index: 0,
      }),
    ]);

    const result = await execute(
      { question: 'RAG' },
      { toolCallId: 'call-2', messages: [] },
    );

    expect(result).toEqual({
      count: 3,
      titles: ['RAG 简介', '向量检索'],
      results: [
        {
          title: 'RAG 简介',
          snippet: 'RAG 是检索增强生成',
          score: 0.95,
        },
        {
          title: 'RAG 简介',
          snippet: '常用于知识库问答',
          score: 0.88,
        },
        {
          title: '向量检索',
          snippet: '用 embedding 找相似片段',
          score: 0.8,
        },
      ],
    });
  });

  it('returns empty payload when knowledge base has no hits', async () => {
    mockSearchSnippets.mockResolvedValueOnce([]);

    const result = await execute(
      { question: '不存在的主题' },
      { toolCallId: 'call-3', messages: [] },
    );

    expect(result).toEqual({
      count: 0,
      titles: [],
      results: [],
    });
  });

  it('propagates searchSnippets errors', async () => {
    mockSearchSnippets.mockRejectedValueOnce(new Error('LanceDB unavailable'));

    await expect(
      execute({ question: '任意问题' }, { toolCallId: 'call-4', messages: [] }),
    ).rejects.toThrow('LanceDB unavailable');
  });
});

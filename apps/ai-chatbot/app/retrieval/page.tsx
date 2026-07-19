'use client';

import { useState } from 'react';
import { Button, Empty, Input, InputNumber, Tag, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { apiFetch } from '@myworkspace/fetch';
import type { SearchHit, SearchResponse } from '../types/RetrievalType';

const SUGGESTED_QUERIES = [
  '忘记密码怎么办',
  '出门要不要带伞',
  '晚餐想煮面吃',
  '接口 500 如何定位',
  '紧张时怎么让自己平静',
];

function scoreColor(score: number): string {
  if (score >= 0.8) return '#52c41a';
  if (score >= 0.65) return '#1677ff';
  if (score >= 0.5) return '#faad14';
  return '#8c8c8c';
}

export default function RetrievalPage() {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(3);
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  const hasSearched = submittedQuery !== null;

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    try {
      const data = await apiFetch<SearchResponse>('/api/retrieval', {
        method: 'POST',
        data: { query: q, k: topK },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(data);
      setSubmittedQuery(q);
      setHits(data.results ?? []);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '检索失败，请稍后重试',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-4xl px-10 mx-auto overflow-y-auto scrollbar-none my-6">
      <div className="shrink-0 pb-4">
        <h1 className="text-2xl font-semibold text-[var(--color-font)] m-0">
          知识库检索测试
        </h1>
        <p className="mt-2 mb-0 text-sm text-[var(--color-placeholder)]">
          输入查询语句，预览命中的文档片段与相似度
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-[var(--color-secondary)] bg-[var(--skeleton-shine)] p-4">
          <label className="block text-sm mb-2 text-[var(--color-font)]">
            查询内容
          </label>
          <Input.TextArea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoSize={{ minRows: 3, maxRows: 6 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSearch();
              }
            }}
            styles={{
              textarea: {
                backgroundColor: 'var(--color-fontbg)',
                color: 'var(--color-font)',
                borderColor: 'var(--color-third)',
                padding: '10px',
              },
            }}
          />

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-font)]">Top K</span>
              <InputNumber
                min={1}
                max={20}
                value={topK}
                onChange={(v) => setTopK(typeof v === 'number' ? v : 3)}
                styles={{
                  root: {
                    backgroundColor: 'var(--color-fontbg)',
                    borderColor: 'var(--color-third)',
                  },
                  input: {
                    color: 'var(--color-font)',
                  },
                }}
              />
            </div>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              disabled={!query.trim()}
              loading={loading}
              styles={{
                root: {
                  backgroundColor: 'var(--color-fontbg)',
                  borderColor: 'var(--color-third)',
                  color: 'var(--color-font)',
                },
              }}
            >
              检索
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_QUERIES.map((q) => (
              <Tag
                key={q}
                className="retrieval-suggest-tag cursor-pointer m-0!"
                onClick={() => setQuery(q)}
                styles={{
                  root: {
                    backgroundColor: 'var(--color-fontbg)',
                    borderColor: 'var(--color-third)',
                    color: 'var(--color-font)',
                    padding: '5px 10px',
                    borderRadius: '10px',
                  },
                }}
              >
                {q}
              </Tag>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 py-5">
          {hasSearched && (
            <>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <p className="m-0 text-sm text-[var(--color-font)]">
                  查询：「
                  <span className="font-medium">{submittedQuery}</span>」
                </p>
              </div>

              {hits.length === 0 ? (
                <Empty description="未命中文档（请先 seed 写入带向量的文档）" />
              ) : (
                <ul className="list-none m-0 p-0 flex flex-col gap-5">
                  {hits.map((hit, index) => (
                    <li
                      key={hit.id}
                      className="rounded-xl border border-[var(--color-third)] bg-[var(--color-fontbg)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {`${index + 1}. ${hit.title}`}
                          </div>
                          <p className="m-0 text-sm leading-6 text-[var(--color-font)] whitespace-pre-wrap">
                            {hit.snippet}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div
                            className="text-lg font-semibold tabular-nums"
                            style={{ color: scoreColor(hit.score) }}
                          >
                            {(hit.score * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-[var(--color-placeholder)] mb-1">
                            相似度
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';
import { memo, useMemo, useCallback, type ReactNode } from 'react';
import { Actions, Bubble } from '@ant-design/x';
import type { BubbleProps, BubbleItemType } from '@ant-design/x';
import { Avatar } from 'antd';
import {
  OpenAIOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useThemeStore } from '../store/useThemeStore';
import XMarkdown from '@ant-design/x-markdown';
import type { UIMessage, ChatRequestOptions } from 'ai';
import { ChatStatus } from '../types/ChatStatusType';
import type { RetrievalToolResult } from '../tools/retrievalTool';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';

interface Props {
  messages: UIMessage[];
  status: string;
  regenerate: (options?: ChatRequestOptions) => Promise<void>;
}

function isRetrievalOutput(value: unknown): value is RetrievalToolResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'count' in value &&
    'titles' in value &&
    Array.isArray((value as RetrievalToolResult).titles)
  );
}

/** 简洁展示：已检索知识库 + 命中条数 + 文档标题列表 */
function RetrievalCallSummary({
  state,
  output,
}: {
  state: string;
  output: unknown;
}) {
  if (state === 'input-streaming' || state === 'input-available') {
    return (
      <div data-testid="retrieval-call" className="text-xs opacity-70 mb-2">
        正在检索知识库…
      </div>
    );
  }

  if (state === 'output-error') {
    return (
      <div data-testid="retrieval-call" className="text-xs opacity-70 mb-2">
        知识库检索失败
      </div>
    );
  }

  if (state === 'output-available' && isRetrievalOutput(output)) {
    const titles =
      output.titles.length > 0 ? output.titles.join('、') : '无匹配文档';
    return (
      <div data-testid="retrieval-call" className="text-xs opacity-70 mb-2">
        已检索知识库（{output.count} 条）
        {output.count > 0 ? `：${titles}` : ''}
      </div>
    );
  }

  return null;
}

function ChatBubble({ messages, status, regenerate }: Props) {
  const { theme } = useThemeStore();
  const isIdle =
    status !== ChatStatus.Submitted && status !== ChatStatus.Streaming;
  const className = theme === 'light' ? 'x-markdown-light' : 'x-markdown-dark';
  const isStreaming = status === ChatStatus.Streaming;

  const renderMarkdown = useCallback(
    (content: string) => {
      return (
        <XMarkdown
          className={className}
          content={content}
          paragraphTag="div"
          streaming={{
            hasNextChunk: isStreaming,
            enableAnimation: false,
            incompleteMarkdownComponentMap: {
              link: 'loading-link',
              image: 'loading-image',
            },
          }}
        />
      );
    },
    [className, isStreaming],
  );

  const items: BubbleItemType[] = useMemo(() => {
    const actionItems = (content: string, showRegenerate: boolean) => {
      const items = [
        {
          key: 'copy',
          label: 'copy',
          actionRender: () => {
            return (
              <Actions.Copy
                text={content}
                styles={{ root: { color: 'var(--color-font)' } }}
              />
            );
          },
        },
      ];

      if (showRegenerate && isIdle) {
        items.push({
          key: 'regenerate',
          label: 'regenerate',
          actionRender: () => {
            return (
              <ReloadOutlined
                style={{ color: 'var(--color-font)', cursor: 'pointer' }}
                onClick={() => {
                  regenerate().catch((err) => {
                    console.error('Regenerate failed:', err);
                  });
                }}
              />
            );
          },
        });
      }

      return items;
    };

    const lastAssistantIndex = messages.reduce(
      (lastIdx, msg, idx) => (msg.role === 'assistant' ? idx : lastIdx),
      -1,
    );

    const bubbleItems: BubbleItemType[] = messages.map((msg, i) => {
      let text = '';
      const retrievalSummaries: ReactNode[] = [];
      for (let j = 0; j < msg.parts.length; j++) {
        const part = msg.parts[j];
        if (part.type === 'text') {
          text += part.text;
          continue;
        }
        if (part.type === 'tool-getInformation') {
          retrievalSummaries.push(
            <RetrievalCallSummary
              key={part.toolCallId}
              state={part.state}
              output={'output' in part ? part.output : undefined}
            />,
          );
        }
      }

      const isUser = msg.role === 'user';
      const isLastAssistant = !isUser && i === lastAssistantIndex;

      const content: string | ReactNode = isUser ? (
        text
      ) : (
        <div>
          {retrievalSummaries}
          {text ? renderMarkdown(text) : null}
        </div>
      );

      return {
        key: msg.id,
        role: msg.role as string,
        content,
        shape: 'corner' as const,
        placement: (isUser ? 'end' : 'start') as BubbleProps['placement'],
        avatar: (
          <Avatar icon={isUser ? <UserOutlined /> : <OpenAIOutlined />} />
        ),
        extra: <Actions items={actionItems(text, isLastAssistant)} />,
        contentRender: undefined,
        styles: {
          content: {
            backgroundColor: 'var(--color-default)',
            color: 'var(--color-font)',
          },
        },
      };
    });

    if (
      status === ChatStatus.Submitted &&
      messages.length > 0 &&
      messages[messages.length - 1]?.role !== 'assistant'
    ) {
      bubbleItems.push({
        key: 'thinking',
        role: 'assistant' as string,
        content: (
          <span className="inline-flex items-center gap-1">
            <span className="animate-pulse-dot w-2 h-2 rounded-full bg-current opacity-50" />
            <span
              className="animate-pulse-dot w-2 h-2 rounded-full bg-current opacity-50"
              style={{ animationDelay: '0.2s' }}
            />
            <span
              className="animate-pulse-dot w-2 h-2 rounded-full bg-current opacity-50"
              style={{ animationDelay: '0.4s' }}
            />
          </span>
        ),
        shape: 'corner' as const,
        placement: 'start' as BubbleProps['placement'],
        avatar: <Avatar icon={<OpenAIOutlined />} />,
        contentRender: undefined,
        styles: {
          content: {
            backgroundColor: 'var(--color-default)',
            color: 'var(--color-font)',
            minWidth: 52,
            display: 'flex',
            justifyContent: 'center',
          },
        },
      });
    }

    return bubbleItems;
  }, [messages, status, renderMarkdown, isIdle, regenerate]);

  return (
    <Bubble.List
      items={items}
      autoScroll={true}
      className={'h-full'}
      styles={{ scroll: { scrollbarWidth: 'none' } }}
    />
  );
}

export default memo(ChatBubble);

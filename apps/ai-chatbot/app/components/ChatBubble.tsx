'use client';
import { useMemo, useCallback, useRef, useEffect } from 'react';
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
import { ChatStatus } from '../types/chatStatus';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';

interface Props {
  messages: UIMessage[];
  status: string;
  regenerate: (options?: ChatRequestOptions) => Promise<void>;
}

export default function ChatBubble({ messages, status, regenerate }: Props) {
  const { theme } = useThemeStore();
  const isIdle =
    status !== ChatStatus.Submitted && status !== ChatStatus.Streaming;
  const statusRef = useRef(status);
  const className = theme === 'light' ? 'x-markdown-light' : 'x-markdown-dark';

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const renderMarkdown: BubbleProps['contentRender'] = useCallback(
    (content) => {
      const isStreaming = statusRef.current === ChatStatus.Streaming;

      return (
        <XMarkdown
          className={className}
          content={content as string}
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
    [className],
  );

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

  const items: BubbleItemType[] = useMemo(() => {
    const lastAssistantIndex = messages.reduce(
      (lastIdx, msg, idx) => (msg.role === 'assistant' ? idx : lastIdx),
      -1,
    );

    const bubbleItems: BubbleItemType[] = messages.map((msg, i) => {
      let text = '';
      for (let j = 0; j < msg.parts.length; j++) {
        const part = msg.parts[j];
        if (part.type === 'text') text += part.text;
      }

      const isUser = msg.role === 'user';
      const isLastAssistant = !isUser && i === lastAssistantIndex;

      return {
        key: msg.id,
        role: msg.role as string,
        content: text,
        shape: 'corner' as const,
        placement: (isUser ? 'end' : 'start') as BubbleProps['placement'],
        avatar: (
          <Avatar icon={isUser ? <UserOutlined /> : <OpenAIOutlined />} />
        ),
        extra: <Actions items={actionItems(text, isLastAssistant)} />,
        contentRender: isUser ? undefined : renderMarkdown,
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
  }, [messages, status, renderMarkdown]);

  return (
    <Bubble.List
      items={items}
      autoScroll={true}
      className={'h-full'}
      styles={{ scroll: { scrollbarWidth: 'none' } }}
    />
  );
}

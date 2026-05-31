'use client';
import { useMemo, useCallback, useRef, useEffect } from 'react';
import { Actions, Bubble } from '@ant-design/x';
import type { BubbleProps, BubbleItemType } from '@ant-design/x';
import { Avatar } from 'antd';
import { OpenAIOutlined, UserOutlined } from '@ant-design/icons';
import { useThemeStore } from '../store/useThemeStore';
import XMarkdown from '@ant-design/x-markdown';
import type { UIMessage } from 'ai';
import { ChatStatus } from '../types/chatStatus';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';

interface Props {
  messages: UIMessage[];
  status: string;
}

export default function ChatBubble({ messages, status }: Props) {
  const { theme } = useThemeStore();
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

  const actionItems = (content: string) => [
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

  const items: BubbleItemType[] = useMemo(() => {
    const bubbleItems: BubbleItemType[] = messages.map((msg) => {
      let text = '';
      for (let i = 0; i < msg.parts.length; i++) {
        const part = msg.parts[i];
        if (part.type === 'text') text += part.text;
      }

      const isUser = msg.role === 'user';

      return {
        key: msg.id,
        role: msg.role as string,
        content: text,
        shape: 'corner' as const,
        placement: (isUser ? 'end' : 'start') as BubbleProps['placement'],
        avatar: (
          <Avatar icon={isUser ? <UserOutlined /> : <OpenAIOutlined />} />
        ),
        extra: (content) => <Actions items={actionItems(content)} />,
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
        content: '思考中...',
        shape: 'corner' as const,
        placement: 'start' as BubbleProps['placement'],
        avatar: <Avatar icon={<OpenAIOutlined />} />,
        contentRender: undefined,
        styles: {
          content: {
            backgroundColor: 'var(--color-default)',
            color: 'var(--color-font)',
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

'use client';
import { UIMessage } from 'ai';
import { Bubble } from '@ant-design/x';
import { Avatar, Typography } from 'antd';
import { OpenAIOutlined, UserOutlined } from '@ant-design/icons';
import type { BubbleProps } from '@ant-design/x';
import XMarkdown from '@ant-design/x-markdown';

export default function ChatBubble({ msg }: { msg: UIMessage }) {
  const renderMarkdown: BubbleProps['contentRender'] = (content) => {
    return (
      <Typography>
        <XMarkdown content={content} />
      </Typography>
    );
  };
  return (
    <div className="my-5 mx-auto w-2/3">
      {msg.role === 'user' ? (
        <Bubble
          content={msg.parts
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('')}
          shape="corner"
          placement="end"
          avatar={<Avatar icon={<UserOutlined />} />}
        />
      ) : (
        <Bubble
          content={msg.parts
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('')}
          contentRender={renderMarkdown}
          shape="corner"
          typing={true}
          avatar={<Avatar icon={<OpenAIOutlined />} />}
        />
      )}
    </div>
  );
}

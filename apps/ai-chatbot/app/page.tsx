'use client';
import { useEffect, useCallback, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import dynamic from 'next/dynamic';
import ErrorCard from './components/ErrorCard';
import ChatBubble from './components/ChatBubble';
import WelcomeCard from './components/WelcomeCard';
import { Switch } from 'antd';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useThemeStore } from './store/useThemeStore';

const InputTab = dynamic(() => import('./components/InputTab'), { ssr: false });

export default function Home() {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const onError = useCallback((err: Error) => {
    console.error('Chat error:', err);
  }, []);

  const { messages, sendMessage, error, status, stop, regenerate } = useChat({
    onError,
  });

  const visibleError = error && error.message !== dismissedError ? error : null;

  return (
    <div className="relative flex h-full flex-1 flex-col">
      <header className="flex items-center border-b border-secondary px-4 py-5 bg-primary">
        <span className="font-semibold text-lg mx-auto text-[var(--color-font)]">
          AI Chatbot
        </span>
        <Switch
          checked={theme === 'dark'}
          onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />
      </header>

      <div className="flex-1 min-h-0 px-5 w-full bg-major flex flex-col">
        {visibleError && (
          <ErrorCard
            message={visibleError.message}
            onRetry={() => regenerate()}
            onDismiss={() => setDismissedError(visibleError.message)}
          />
        )}
        {messages.length === 0 && !visibleError && (
          <div className="my-5">
            <WelcomeCard />
          </div>
        )}
        <div className="w-2/3 mx-auto h-full">
          <ChatBubble
            messages={messages}
            status={status}
            regenerate={regenerate}
          />
        </div>
      </div>

      <div className="w-full bg-major py-5">
        <InputTab sendMessage={sendMessage} stop={stop} status={status} />
      </div>
    </div>
  );
}

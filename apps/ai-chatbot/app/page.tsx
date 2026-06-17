'use client';
import { useEffect, useCallback, useState } from 'react';
import type { UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import dynamic from 'next/dynamic';
import ErrorCard from './components/ErrorCard';
import ChatBubble from './components/ChatBubble';
import WelcomeCard from './components/WelcomeCard';
import { Button, Switch, Upload } from 'antd';
import {
  ExportOutlined,
  ImportOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { useThemeStore } from './store/useThemeStore';
import {
  setMessageHistory,
  loadMessageHistory,
} from './store/useMessageHistory';
import Sider from './components/Sider';
import { useSessionList } from './store/useSessionList';
import { useChatInput } from './store/useChatInput';
import useHandleFiles from './hooks/useHandleFiles';
import { useSystemOption } from './store/useSystemOption';

const InputTab = dynamic(() => import('./components/InputTab'), { ssr: false });

export default function Home() {
  const { theme, setTheme } = useThemeStore();
  const {
    currentSessionId,
    setCurrentSessionId,
    sessionList,
    setSessionList,
    hydrateFromStorage,
  } = useSessionList();
  const { lastSubmittedInput } = useChatInput();
  const { temperature, systemPrompt } = useSystemOption();
  const { exportChat, importChat } = useHandleFiles();

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const onError = useCallback((err: Error) => {
    console.error('Chat error:', err);
  }, []);

  const onFinish = useCallback(
    async ({ messages: newMsgs }: { messages: UIMessage[] }) => {
      const now = currentSessionId ?? Date.now();
      if (currentSessionId === null) {
        setSessionList([
          {
            id: now,
            title:
              lastSubmittedInput.trim().length > 20
                ? `${lastSubmittedInput.trim().substring(0, 20)}...`
                : lastSubmittedInput.trim() || 'New Chat',
            temperature,
            systemPrompt,
          },
          ...sessionList,
        ]);
      }
      const latestMessages = [...newMsgs.slice(-2)];
      await setMessageHistory(latestMessages, now);
      setCurrentSessionId(now);
    },
    [
      currentSessionId,
      sessionList,
      lastSubmittedInput,
      setCurrentSessionId,
      setSessionList,
      temperature,
      systemPrompt,
    ],
  );

  const {
    messages,
    setMessages,
    sendMessage,
    error,
    status,
    stop,
    regenerate,
  } = useChat({
    onError,
    onFinish,
  });

  useEffect(() => {
    loadMessageHistory(currentSessionId).then((savedHistory) => {
      setMessages(savedHistory);
      setHistoryLoaded(true);
    });
  }, [currentSessionId, setMessages]);

  const visibleError = error && error.message !== dismissedError ? error : null;

  return (
    <div className="flex flex-row h-full">
      {sessionList.length > 0 && (
        <div className="shrink-0 h-full w-3xs">
          <Sider />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <header className="shrink-0 flex items-center border-b border-secondary px-4 py-5 bg-primary">
          <span className="font-semibold text-lg mx-auto text-[var(--color-font)]">
            AI Chatbot
          </span>
          <div className="flex justify-center items-center gap-5">
            <Upload
              accept=".json"
              beforeUpload={importChat}
              showUploadList={false}
            >
              <Button
                icon={<ImportOutlined />}
                styles={{
                  root: {
                    backgroundColor: 'var(--color-default)',
                    border: '1px solid var(--color-third)',
                    color: 'var(--color-font)',
                  },
                }}
              >
                导入会话
              </Button>
            </Upload>
            <Button
              icon={<ExportOutlined />}
              styles={{
                root: {
                  backgroundColor: 'var(--color-default)',
                  border: '1px solid var(--color-third)',
                  color: 'var(--color-font)',
                },
              }}
              onClick={() => exportChat(messages)}
            >
              导出会话
            </Button>
            <Switch
              checked={theme === 'dark'}
              onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
            />
          </div>
        </header>

        <div
          className={`flex flex-col flex-1 min-h-0 ${sessionList.length > 0 ? 'w-full' : 'w-3/4'} px-10 mx-auto`}
        >
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
            {visibleError && (
              <ErrorCard
                message={visibleError.message}
                onRetry={() => regenerate()}
                onDismiss={() => setDismissedError(visibleError.message)}
              />
            )}
            {historyLoaded && messages.length === 0 && !visibleError && (
              <div className="w-full my-5 mx-auto">
                <WelcomeCard />
              </div>
            )}
            {messages.length > 0 && (
              <div className="w-full mx-auto h-full ">
                <ChatBubble
                  messages={messages}
                  status={status}
                  regenerate={regenerate}
                />
              </div>
            )}
          </div>
          <div className="shrink-0 mb-5">
            <InputTab sendMessage={sendMessage} stop={stop} status={status} />
          </div>
        </div>
      </div>
    </div>
  );
}

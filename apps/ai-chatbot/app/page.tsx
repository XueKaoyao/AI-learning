'use client';
import { useEffect, useCallback, useRef, useState } from 'react';
import type { UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import dynamic from 'next/dynamic';
import ErrorCard from './components/ErrorCard';
import ChatBubble from './components/ChatBubble';
import WelcomeCard from './components/WelcomeCard';
import Header from './components/Header';
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
import LRUCache from '@myworkspace/LRUCache';

const InputTab = dynamic(() => import('./components/InputTab'), { ssr: false });

export default function Home() {
  const { theme } = useThemeStore();
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

  const exportChatRef = useRef(exportChat);
  const importChatRef = useRef(importChat);
  const messagesRef = useRef<UIMessage[]>([]);

  const messageCacheRef = useRef<LRUCache<UIMessage[]>>(
    new LRUCache<UIMessage[]>(3),
  );

  useEffect(() => {
    exportChatRef.current = exportChat;
  }, [exportChat]);

  useEffect(() => {
    importChatRef.current = importChat;
  }, [importChat]);

  const handleExport = useCallback(() => {
    exportChatRef.current(messagesRef.current);
  }, []);

  const handleImport = useCallback((file: File) => {
    importChatRef.current(file);
  }, []);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const prevSessionListRef = useRef(sessionList);
  useEffect(() => {
    const prev = prevSessionListRef.current;
    for (const s of prev) {
      if (!sessionList.some((ns) => ns.id === s.id)) {
        messageCacheRef.current.delete(String(s.id));
      }
    }
    prevSessionListRef.current = sessionList;
  }, [sessionList]);

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
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const cache = messageCacheRef.current;
    const key = String(currentSessionId);
    if (cache.has(key)) {
      setMessages(cache.get(key) ?? []);
      setHistoryLoaded(true);
      return;
    }
    loadMessageHistory(currentSessionId).then((savedHistory) => {
      if (currentSessionId) cache.set(key, savedHistory);
      setMessages(savedHistory);
      setHistoryLoaded(true);
    });
  }, [currentSessionId, setMessages]);

  const visibleError = error && error.message !== dismissedError ? error : null;

  const handleRetry = useCallback(() => {
    regenerate();
  }, [regenerate]);

  const handleDismissError = useCallback(() => {
    if (visibleError) setDismissedError(visibleError.message);
  }, [visibleError]);

  return (
    <div className="flex flex-row h-full">
      {sessionList.length > 0 && (
        <div className="shrink-0 h-full w-3xs">
          <Sider />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <Header onImport={handleImport} onExport={handleExport} />

        <div
          className={`flex flex-col flex-1 min-h-0 ${sessionList.length > 0 ? 'w-full' : 'w-3/4'} px-10 mx-auto`}
        >
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
            {visibleError && (
              <ErrorCard
                message={visibleError.message}
                onRetry={handleRetry}
                onDismiss={handleDismissError}
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

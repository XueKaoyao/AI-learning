'use client';

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import type { UIMessage } from 'ai';
import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import dynamic from 'next/dynamic';
import ErrorCard from './components/ErrorCard';
import ChatBubble from './components/ChatBubble';
import WelcomeCard from './components/WelcomeCard';
// import {
//   setMessageHistory,
//   loadMessageHistory,
// } from './store/useMessageHistory';
import { useSessionList } from './store/useSessionList';
import { useChatInput } from './store/useChatInput';
import { useSystemOption } from './store/useSystemOption';
import { useActiveMessages } from './store/useActiveMessages';
import { useUserStore } from './store/useUserStore';
import LRUCache from '@myworkspace/LRUCache';
import { RequestSessionType } from './types/SessionManageType';
import useSessionsCrud from './hooks/useSessionsCrud';
import useMessageCrud from './hooks/useMessageCrud';

const InputTab = dynamic(() => import('./components/InputTab'), { ssr: false });

export default function Home() {
  const {
    currentSessionId,
    setCurrentSessionId,
    sessionList,
    fetchSessionList,
  } = useSessionList();
  const { createSession } = useSessionsCrud();
  const { lastSubmittedInput } = useChatInput();
  const { temperature, systemPrompt } = useSystemOption();
  const setActiveMessages = useActiveMessages((s) => s.setActiveMessages);
  const { createMessage, getMessages } = useMessageCrud();
  const { user } = useUserStore();
  const messageCacheRef = useRef<LRUCache<UIMessage[]>>(
    new LRUCache<UIMessage[]>(3),
  );

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

  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const onError = useCallback((err: Error) => {
    console.error('Chat error:', err);
  }, []);

  const onFinish = useCallback(
    async ({ messages: newMsgs }: { messages: UIMessage[] }) => {
      try {
        let sessionId = currentSessionId;
        if (sessionId === null) {
          const data: RequestSessionType = {
            userId: user?.id ?? '',
            title:
              lastSubmittedInput.trim().length > 20
                ? `${lastSubmittedInput.trim().substring(0, 20)}...`
                : lastSubmittedInput.trim() || 'New Chat',
            temperature,
            systemPrompt,
          };
          const session = await createSession(data);
          await fetchSessionList(user?.id ?? '');
          sessionId = session.id;
        }
        const latestMessages = [...newMsgs.slice(-2)];
        for (const message of latestMessages) {
          await createMessage({
            sessionId: sessionId,
            message: {
              id: message.id,
              parts: message.parts as unknown as JSON[],
              role: message.role,
            },
          });
        }
        // 写路径：只负责落库 + 更新本地缓存，不触发 getMessages
        messageCacheRef.current.set(sessionId, newMsgs);
        if (currentSessionId === null) {
          setCurrentSessionId(sessionId);
        }
        // 原逻辑（IndexedDB）：
        // await setMessageHistory(latestMessages, now);
        // setCurrentSessionId(now);
      } catch (error) {
        console.error('Chat error:', error);
      }
    },
    [
      user,
      currentSessionId,
      lastSubmittedInput,
      setCurrentSessionId,
      createSession,
      temperature,
      systemPrompt,
      createMessage,
      fetchSessionList,
    ],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        headers: () => {
          const token = useUserStore.getState().token;
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          return headers;
        },
      }),
    [],
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
    transport,
    onError,
    onFinish,
  });

  useEffect(() => {
    setActiveMessages(messages);
  }, [messages, setActiveMessages]);

  // 读路径：仅在切换会话时加载历史；首次发消息走 onFinish 写缓存，不在此 GET
  useEffect(() => {
    let cancelled = false;
    const cache = messageCacheRef.current;
    const key = String(currentSessionId);

    if (currentSessionId === null) {
      queueMicrotask(() => {
        if (cancelled) return;
        setMessages([]);
        setHistoryLoaded(true);
      });
      return () => {
        cancelled = true;
      };
    }

    if (cache.has(key)) {
      queueMicrotask(() => {
        if (cancelled) return;
        setMessages(cache.get(key) ?? []);
        setHistoryLoaded(true);
      });
      return () => {
        cancelled = true;
      };
    }

    getMessages(currentSessionId).then((savedHistory) => {
      if (cancelled) return;
      cache.set(key, savedHistory);
      setMessages(savedHistory);
      setHistoryLoaded(true);
    });
    // 原逻辑（IndexedDB）：
    // loadMessageHistory(currentSessionId).then((savedHistory) => {
    //   if (currentSessionId) cache.set(key, savedHistory);
    //   setMessages(savedHistory);
    //   setHistoryLoaded(true);
    // });

    return () => {
      cancelled = true;
    };
  }, [currentSessionId, setMessages, getMessages]);

  const visibleError = error && error.message !== dismissedError ? error : null;

  const handleRetry = useCallback(() => {
    regenerate();
  }, [regenerate]);

  const handleDismissError = useCallback(() => {
    if (visibleError) setDismissedError(visibleError.message);
  }, [visibleError]);

  return (
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
  );
}

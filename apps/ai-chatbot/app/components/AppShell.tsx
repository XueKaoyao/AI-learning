'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { UIMessage } from 'ai';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Sider from './Sider';
import useHandleFiles from '../hooks/useHandleFiles';
import { useThemeStore } from '../store/useThemeStore';
import { useSessionList } from '../store/useSessionList';
import { useActiveMessages } from '../store/useActiveMessages';
// import { loadMessageHistory } from '../store/useMessageHistory';
import { useUserStore } from '../store/useUserStore';
import useMessageCrud from '../hooks/useMessageCrud';
// import useSessionsCrud from '../hooks/useSessionsCrud';
// import { SessionType } from '../types/SessionManageType';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const { theme } = useThemeStore();
  const { sessionList, currentSessionId, fetchSessionList } = useSessionList();
  const activeMessages = useActiveMessages((s) => s.messages);
  const { exportChat, importChat } = useHandleFiles();
  const { user } = useUserStore();
  // const { getSession } = useSessionsCrud();
  const { getMessages } = useMessageCrud();
  const exportChatRef = useRef(exportChat);
  const importChatRef = useRef(importChat);
  const messagesRef = useRef<UIMessage[]>(activeMessages);
  const sessionIdRef = useRef(currentSessionId);

  useEffect(() => {
    if (user?.id) {
      fetchSessionList(user.id);
    }
  }, [fetchSessionList, user?.id]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    exportChatRef.current = exportChat;
  }, [exportChat]);

  useEffect(() => {
    importChatRef.current = importChat;
  }, [importChat]);

  useEffect(() => {
    messagesRef.current = activeMessages;
  }, [activeMessages]);

  useEffect(() => {
    sessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const handleExport = useCallback(async () => {
    let messages = messagesRef.current;
    const sessionId = sessionIdRef.current;
    if (messages.length === 0 && sessionId !== null) {
      messages = await getMessages(sessionId);
      // messages = await loadMessageHistory(sessionId);
    }
    exportChatRef.current(messages);
  }, [getMessages]);

  const handleImport = useCallback((file: File) => {
    importChatRef.current(file);
  }, []);

  if (isLogin) {
    return children;
  }

  return (
    <div className="flex flex-row h-full">
      {sessionList.length > 0 && (
        <div className="shrink-0 h-full w-3xs">
          <Sider />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <Header onImport={handleImport} onExport={handleExport} />
        {children}
      </div>
    </div>
  );
}

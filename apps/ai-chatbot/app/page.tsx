'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import InputTab from './components/InputTab';
import ErrorCard from './components/ErrorCard';
import ChatBubble from './components/ChatBubble';
import WelcomeCard from './components/WelcomeCard';
import { Bubble } from '@ant-design/x';
import { Avatar } from 'antd';
import { OpenAIOutlined } from '@ant-design/icons';

export default function Home() {
  const [input, setInput] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, error, status, stop } = useChat({
    onError: (err) => console.error('Chat error:', err),
  });
  const isLoading = status === 'submitted' || status === 'streaming';

  const isNearBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    });
  }, []);

  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom();
    }
  }, [messages, isNearBottom, scrollToBottom]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const handleScroll = () => setShowScrollBtn(!isNearBottom());
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [isNearBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput('');
  };

  return (
    <div className="relative flex h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 px-4 py-3 text-center font-semibold dark:border-zinc-800 dark:text-zinc-100">
        AI Chatbot
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-5">
        {error && <ErrorCard message={error.message} />}
        {messages.length === 0 && !error && <WelcomeCard />}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}
        {status === 'submitted' &&
          messages.length > 0 &&
          messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="my-5 mx-auto w-2/3">
              <Bubble
                content={'思考中...'}
                shape="corner"
                typing={true}
                avatar={<Avatar icon={<OpenAIOutlined />} />}
              />
            </div>
          )}
      </div>

      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1.5 text-xs text-white shadow-lg transition-opacity hover:bg-blue-700"
        >
          回到底部
        </button>
      )}

      <InputTab
        handleSubmit={handleSubmit}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        status={status}
        stop={stop}
      />
    </div>
  );
}

'use client';
import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';

export default function Home() {
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, error, status, stop } = useChat({
    onError: (err) => console.error('Chat error:', err),
  });
  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput('');
  };
  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-zinc-900 h-full">
      <header className="border-b border-zinc-200 px-4 py-3 text-center font-semibold dark:border-zinc-800 dark:text-zinc-100">
        AI Chatbot
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error.message}
          </div>
        )}
        {messages.length === 0 && (
          <p className="text-center text-zinc-400 dark:text-zinc-500 mt-20">
            输入问题，开始对话
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-zinc-800 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
              }`}
            >
              {msg.parts
                .filter((part) => part.type === 'text')
                .map((part, idx) => (
                  <span key={idx}>{part.text}</span>
                ))}
            </div>
          </div>
        ))}
        {status === 'submitted' &&
          messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="mb-4 flex justify-start">
              <div className="rounded-xl bg-white px-4 py-3 text-sm text-zinc-400 shadow-sm dark:bg-zinc-800">
                思考中...
              </div>
            </div>
          )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题..."
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            disabled={isLoading}
          />
          {status === 'streaming' ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              发送
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

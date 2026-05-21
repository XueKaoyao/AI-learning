export default function InputTab({
  handleSubmit,
  input,
  setInput,
  isLoading,
  status,
  stop,
}: {
  handleSubmit: (e: React.FormEvent) => void;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  status: string;
  stop: () => void;
}) {
  return (
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
  );
}

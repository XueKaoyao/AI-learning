import { useEffect, useState } from 'react';
import { SystemPromptOption } from '../types/systemPromptType';
import { apiFetch, FetchError } from '@myworkspace/fetch';
import { loadCustomPrompts } from '../store/useCustomPrompts';

interface FetchState<T> {
  results: T;
  setResults: React.Dispatch<React.SetStateAction<T>>;
  loading: boolean;
  error: FetchError | null;
}

export default function useFetchPrompts(): FetchState<SystemPromptOption[]> {
  const [results, setResults] = useState<SystemPromptOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FetchError | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await apiFetch<SystemPromptOption[]>('/api/systemprompt', {
          cacheConfig: { revalidate: true },
        });
        const customPrompt = await loadCustomPrompts();
        if (!cancelled) setResults([...data, ...customPrompt]);
      } catch (err: unknown) {
        if (cancelled) return;

        const fetchError =
          err instanceof FetchError
            ? err
            : new FetchError(String(err), {
                status: 0,
                statusText: 'Unknown',
                url: '/api/systemprompt',
                category: 'network',
              });

        console.error(`[${fetchError.category}] ${fetchError.message}`);
        setError(fetchError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { results, setResults, loading, error };
}

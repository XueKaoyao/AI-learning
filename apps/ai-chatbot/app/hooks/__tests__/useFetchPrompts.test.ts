import { renderHook, act, waitFor } from '@testing-library/react';

// Define mock fn FIRST (before jest.mock, which is hoisted but captures references)
const mockApiFetch = jest.fn();
const mockLoadCustomPrompts = jest.fn().mockResolvedValue([]);

// Must be called before jest.mock accesses the mock
jest.mock('@myworkspace/fetch', () => {
  class MockFetchError extends Error {
    status: number;
    statusText: string;
    url: string;
    category: string;
    constructor(
      message: string,
      opts: {
        status: number;
        statusText: string;
        url: string;
        category: string;
      },
    ) {
      super(message);
      this.name = 'FetchError';
      this.status = opts.status;
      this.statusText = opts.statusText;
      this.url = opts.url;
      this.category = opts.category;
    }
  }
  return {
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
    FetchError: MockFetchError,
  };
});

jest.mock('../../store/useCustomPrompts', () => ({
  loadCustomPrompts: () => mockLoadCustomPrompts(),
}));

// Dynamic import of mocked FetchError for test assertions
import { FetchError } from '@myworkspace/fetch';
import useFetchPrompts from '../useFetchPrompts';

describe('useFetchPrompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockReset();
    mockLoadCustomPrompts.mockReset().mockResolvedValue([]);
  });

  describe('initial state', () => {
    it('starts with loading true and empty results', () => {
      mockApiFetch.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useFetchPrompts());

      expect(result.current.loading).toBe(true);
      expect(result.current.results).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('successful fetch', () => {
    it('fetches prompts and updates results', async () => {
      const mockPrompts = [
        { id: '1', description: 'Prompt 1', content: 'Content 1' },
        { id: '2', description: 'Prompt 2', content: 'Content 2' },
      ];
      mockApiFetch.mockResolvedValueOnce(mockPrompts);

      const { result } = renderHook(() => useFetchPrompts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.results).toEqual(mockPrompts);
      expect(result.current.error).toBeNull();
    });

    it('calls apiFetch with correct URL and options', async () => {
      mockApiFetch.mockResolvedValueOnce([]);

      renderHook(() => useFetchPrompts());

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalled();
      });

      expect(mockApiFetch).toHaveBeenCalledWith('/api/systemprompt', {
        cacheConfig: { revalidate: true },
      });
    });

    it('merges built-in prompts with custom prompts', async () => {
      const builtIn = [
        { id: '1', description: 'Built-in', content: 'Built-in' },
      ];
      const custom = [
        {
          id: 'custom-1',
          description: 'Custom',
          content: 'Custom',
          tag: 'custom',
        },
      ];

      mockApiFetch.mockResolvedValueOnce(builtIn);
      mockLoadCustomPrompts.mockResolvedValueOnce(custom);

      const { result } = renderHook(() => useFetchPrompts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.results).toEqual([...builtIn, ...custom]);
      expect(result.current.results).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('handles FetchError', async () => {
      const fetchError = new FetchError('Not Found', {
        status: 404,
        statusText: 'Not Found',
        url: '/api/systemprompt',
        category: 'http',
      });
      mockApiFetch.mockRejectedValueOnce(fetchError);

      const { result } = renderHook(() => useFetchPrompts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.status).toBe(404);
      expect(result.current.error?.category).toBe('http');
      expect(result.current.results).toEqual([]);
    });

    it('wraps generic errors as FetchError with network category', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Network down'));

      const { result } = renderHook(() => useFetchPrompts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.status).toBe(0);
      expect(result.current.error?.category).toBe('network');
    });
  });

  describe('setResults', () => {
    it('allows manual updates via setResults', async () => {
      mockApiFetch.mockResolvedValueOnce([
        { id: '1', description: 'P1', content: 'C1' },
      ]);

      const { result } = renderHook(() => useFetchPrompts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setResults([
          { id: '2', description: 'New', content: 'New content' },
        ]);
      });

      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0].id).toBe('2');
    });
  });

  describe('cleanup on unmount', () => {
    it('cancels state updates when unmounted before fetch completes', () => {
      let resolvePromise!: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApiFetch.mockReturnValueOnce(pendingPromise);

      const { unmount } = renderHook(() => useFetchPrompts());

      unmount();

      // Should not throw when promise resolves after unmount
      resolvePromise([{ id: '1', description: 'Late', content: 'Too late' }]);
    });
  });
});

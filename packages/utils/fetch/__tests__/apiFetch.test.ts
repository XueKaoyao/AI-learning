import {
  apiFetch,
  clearCache,
  clearCacheByTag,
  getCacheStats,
  FetchError,
  setAuthTokenGetter,
} from '../index';

describe('apiFetch', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    clearCache();
  });

  describe('basic GET requests', () => {
    it('makes a GET request and returns parsed JSON data from wrapped response', async () => {
      const mockData = { body: { items: [1, 2, 3] }, message: 'ok' };
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await apiFetch<{ items: number[] }>(
        'https://api.example.com/data',
      );
      expect(result).toEqual({ items: [1, 2, 3] });
    });

    it('returns unwrapped JSON when response has no "body" field', async () => {
      const mockData = { items: ['a', 'b'] };
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await apiFetch<{ items: string[] }>(
        'https://api.example.com/data',
      );
      expect(result).toEqual({ items: ['a', 'b'] });
    });

    it('handles empty response body (204 No Content)', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(null, { status: 204 }));

      // The fetch package parses an empty body as empty text
      const result = await apiFetch('https://api.example.com/empty');
      expect(result).toBeDefined();
    });
  });

  describe('HTTP methods', () => {
    it('makes a POST request with JSON body', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ body: 'ok', message: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await apiFetch('https://api.example.com/create', {
        method: 'POST',
        data: { name: 'Test' },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const callArgs = fetchSpy.mock.calls[0];
      expect(callArgs[1]?.method).toBe('POST');
      expect(callArgs[1]?.body).toBe(JSON.stringify({ name: 'Test' }));
    });

    it('sets Content-Type header for POST requests', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ body: 'ok', message: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await apiFetch('https://api.example.com/create', {
        method: 'POST',
        data: {},
      });

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('makes a PUT request', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ body: 'updated', message: 'ok' }), {
          status: 200,
        }),
      );

      await apiFetch('https://api.example.com/update', {
        method: 'PUT',
        data: { name: 'Updated' },
      });

      expect(fetchSpy.mock.calls[0][1]?.method).toBe('PUT');
    });

    it('makes a DELETE request without body', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ body: null, message: 'ok' }), {
          status: 200,
        }),
      );

      await apiFetch('https://api.example.com/delete', {
        method: 'DELETE',
      });

      expect(fetchSpy.mock.calls[0][1]?.method).toBe('DELETE');
    });
  });

  describe('caching', () => {
    it('caches GET responses and returns cached data on subsequent calls', async () => {
      const mockData = { body: 'cached', message: 'ok' };
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await apiFetch('https://api.example.com/cached');
      await apiFetch('https://api.example.com/cached');

      // Only one actual HTTP call; second uses cache
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('does not cache non-GET requests', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ body: 'data', message: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await apiFetch('https://api.example.com/data', {
        method: 'POST',
        data: {},
      });
      await apiFetch('https://api.example.com/data', {
        method: 'POST',
        data: {},
      });

      // Two calls for non-GET
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('caches GET requests by default (DEFAULT_TTL = 5 min)', async () => {
      const mockData = { body: 'cached', message: 'ok' };
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      // GET requests use DEFAULT_TTL (5 min) caching by default
      await apiFetch('https://api.example.com/auto-cached');
      await apiFetch('https://api.example.com/auto-cached');

      // Cache hit — only 1 HTTP request
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('cache management', () => {
    it('clearCache removes all cached entries', async () => {
      const mockData = { body: 'data', message: 'ok' };
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await apiFetch('https://api.example.com/data', {
        cacheConfig: {},
      });
      clearCache();
      await apiFetch('https://api.example.com/data', {
        cacheConfig: {},
      });

      // Cache was cleared, so second call fetches again
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('clearCacheByTag removes specific cached entries', async () => {
      const mockData = { body: 'data', message: 'ok' };
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await apiFetch('https://api.example.com/data', {
        cacheConfig: { tags: ['user'] },
      });
      clearCacheByTag('user');
      await apiFetch('https://api.example.com/data', {
        cacheConfig: { tags: ['user'] },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('getCacheStats returns cache size and keys', () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(typeof stats.size).toBe('number');
      expect(Array.isArray(stats.keys)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('throws FetchError for 404 responses', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Not Found' }), {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(apiFetch('https://api.example.com/missing')).rejects.toThrow(
        FetchError,
      );
    });

    it('throws FetchError for 500 responses', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      );

      await expect(apiFetch('https://api.example.com/error')).rejects.toThrow(
        FetchError,
      );
    });

    it('FetchError includes status and category', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Forbidden' }), {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      try {
        await apiFetch('https://api.example.com/forbidden');
        fail('Expected apiFetch to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(FetchError);
        const fetchErr = err as FetchError;
        expect(fetchErr.status).toBe(403);
        expect(fetchErr.url).toBe('https://api.example.com/forbidden');
      }
    });

    it('handles network errors', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(apiFetch('https://api.example.com/data')).rejects.toThrow(
        'Failed to fetch',
      );
    });
  });

  describe('request deduplication', () => {
    it('deduplicates concurrent identical GET requests', async () => {
      const mockData = { body: 'shared', message: 'ok' };
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      // Launch 3 concurrent requests to the same URL
      const results = await Promise.all([
        apiFetch('https://api.example.com/shared'),
        apiFetch('https://api.example.com/shared'),
        apiFetch('https://api.example.com/shared'),
      ]);

      // All should succeed with same data
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual('shared');
      expect(results[1]).toEqual('shared');
      expect(results[2]).toEqual('shared');

      // Only one actual network request
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('auth token', () => {
    beforeEach(() => {
      // Reset auth token getter
      setAuthTokenGetter(() => null);
    });

    it('includes Authorization header when auth token is set', async () => {
      setAuthTokenGetter(() => 'test-token-123');

      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ body: 'ok', message: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await apiFetch('https://api.example.com/auth');

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers['Authorization']).toBe('Bearer test-token-123');
    });

    it('does not include Authorization header when no auth token', async () => {
      setAuthTokenGetter(() => null);

      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ body: 'ok', message: 'ok' }), {
          status: 200,
        }),
      );

      await apiFetch('https://api.example.com/noauth');

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers?.['Authorization']).toBeUndefined();
    });
  });
});

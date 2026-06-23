// Must import before any IndexedDB code runs
import 'fake-indexeddb/auto';

import {
  opts,
  withStore,
  withStoreResult,
  getAllByIds,
  clearMessageHistory,
  dbOptions,
} from '../index';

// Use a unique DB name per test run to avoid conflicts
let testCounter = 0;
function getTestOptions(): dbOptions {
  testCounter++;
  return {
    dbName: `test-db-${testCounter}-${Date.now()}`,
    dbVersion: 1,
    storeName: 'testStore',
    storeKey: 'meta',
  };
}

// openDB is a private helper, not exported. Tested indirectly via
// withStore / withStoreResult, which call openDB internally.

describe('indexedDB utilities', () => {
  describe('opts', () => {
    it('returns the same options object', () => {
      const options = getTestOptions();
      const result = opts(options);
      expect(result.dbName).toBe(options.dbName);
      expect(result.dbVersion).toBe(options.dbVersion);
      expect(result.storeName).toBe(options.storeName);
      expect(result.storeKey).toBe(options.storeKey);
    });
  });

  describe('database lifecycle (via withStore)', () => {
    it('creates and opens a database with object store', async () => {
      const options = getTestOptions();
      await withStore(options, 'readwrite', (store) => {
        store.put({ test: true }, 'init');
      });

      const result = await withStoreResult<{ test: boolean }>(
        opts(options),
        'readonly',
        (store) => store.get('init'),
      );
      expect(result).toEqual({ test: true });
    });

    it('reopens an existing database without error', async () => {
      const options = getTestOptions();
      await withStore(options, 'readwrite', () => {});
      await expect(
        withStore(options, 'readonly', () => {}),
      ).resolves.toBeUndefined();
    });
  });

  describe('withStore', () => {
    it('executes a function with a store handle in readwrite mode', async () => {
      const options = getTestOptions();
      await withStore(options, 'readwrite', (store) => {
        store.put({ id: '1', value: 'test' }, '1');
      });

      const result = await withStoreResult<{ id: string; value: string }>(
        opts(options),
        'readonly',
        (store) => store.get('1'),
      );
      expect(result).toEqual({ id: '1', value: 'test' });
    });

    it('handles void return from store function', async () => {
      const options = getTestOptions();
      await expect(
        withStore(options, 'readwrite', () => {}),
      ).resolves.toBeUndefined();
    });
  });

  describe('withStoreResult', () => {
    it('returns the result of a store request', async () => {
      const options = getTestOptions();
      await withStore(options, 'readwrite', (store) => {
        store.put({ name: 'Alice' }, 'user-1');
      });

      const result = await withStoreResult<{ name: string }>(
        opts(options),
        'readonly',
        (store) => store.get('user-1'),
      );

      expect(result).toEqual({ name: 'Alice' });
    });

    it('returns null/undefined for non-existent keys', async () => {
      const options = getTestOptions();
      await withStore(options, 'readwrite', () => {});

      const result = await withStoreResult<unknown>(
        opts(options),
        'readonly',
        (store) => store.get('nonexistent'),
      );

      // fake-indexeddb may return undefined or null for missing keys
      expect(result).toBeFalsy();
    });
  });

  describe('getAllByIds', () => {
    it('returns all items by their IDs in order', async () => {
      const options = getTestOptions();
      await withStore(options, 'readwrite', (store) => {
        store.put({ id: 'a', value: 'A' }, 'a');
        store.put({ id: 'b', value: 'B' }, 'b');
        store.put({ id: 'c', value: 'C' }, 'c');
      });

      const results = await getAllByIds<{ id: string; value: string }>(
        opts(options),
        ['a', 'b', 'c'],
      );

      expect(results).toHaveLength(3);
      expect(results[0].value).toBe('A');
      expect(results[1].value).toBe('B');
      expect(results[2].value).toBe('C');
    });

    it('returns items in the requested order', async () => {
      const options = getTestOptions();
      await withStore(options, 'readwrite', (store) => {
        store.put({ id: 'a', value: 'A' }, 'a');
        store.put({ id: 'b', value: 'B' }, 'b');
        store.put({ id: 'c', value: 'C' }, 'c');
      });

      const results = await getAllByIds<{ id: string; value: string }>(
        opts(options),
        ['c', 'a', 'b'],
      );

      expect(results).toHaveLength(3);
      expect(results[0].value).toBe('C');
      expect(results[1].value).toBe('A');
      expect(results[2].value).toBe('B');
    });

    it('filters out non-existent keys', async () => {
      const options = getTestOptions();
      await withStore(options, 'readwrite', (store) => {
        store.put({ id: 'a', value: 'A' }, 'a');
        store.put({ id: 'c', value: 'C' }, 'c');
      });

      const results = await getAllByIds<{ id: string; value: string }>(
        opts(options),
        ['a', 'nonexistent', 'c'],
      );

      expect(results).toHaveLength(2);
      expect(results[0].value).toBe('A');
      expect(results[1].value).toBe('C');
    });

    it('returns empty array for empty IDs list', async () => {
      const options = getTestOptions();
      const results = await getAllByIds(opts(options), []);
      expect(results).toEqual([]);
    });

    it('returns empty array when none of the IDs exist', async () => {
      const options = getTestOptions();
      await withStore(options, 'readwrite', () => {});

      const results = await getAllByIds<{ id: string; value: string }>(
        opts(options),
        ['x', 'y', 'z'],
      );
      expect(results).toEqual([]);
    });
  });

  describe('clearMessageHistory', () => {
    it('deletes the meta key from the store', async () => {
      const options = getTestOptions();
      await withStore(options, 'readwrite', (store) => {
        store.put({ version: 1, data: 'test' }, options.storeKey);
      });

      await clearMessageHistory(opts(options));

      const result = await withStoreResult<unknown>(
        opts(options),
        'readonly',
        (store) => store.get(options.storeKey),
      );
      // fake-indexeddb may return undefined or null for deleted keys
      expect(result).toBeFalsy();
    });

    it('does not throw when called on empty store', async () => {
      const options = getTestOptions();
      await expect(clearMessageHistory(opts(options))).resolves.toBeUndefined();
    });
  });
});

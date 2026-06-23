import LRUCache from '../index';

describe('LRUCache', () => {
  describe('constructor', () => {
    it('creates a cache with the given capacity', () => {
      const cache = new LRUCache<string>(3);
      expect(cache).toBeInstanceOf(LRUCache);
    });

    it('creates a cache with capacity 1', () => {
      const cache = new LRUCache<number>(1);
      cache.set('key', 42);
      expect(cache.get('key')).toBe(42);
    });

    it('creates a cache with capacity 0 (evicts on second insert)', () => {
      const cache = new LRUCache<string>(0);
      cache.set('a', 'value');
      // First insert succeeds (nothing to evict yet)
      expect(cache.get('a')).toBe('value');
      cache.set('b', 'value2');
      // Second insert evicts the first (new size >= capacity 0)
      expect(cache.has('a')).toBe(false);
      expect(cache.get('b')).toBe('value2');
    });
  });

  describe('set and get', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(3);
    });

    it('stores and retrieves a value', () => {
      cache.set('a', 'value-a');
      expect(cache.get('a')).toBe('value-a');
    });

    it('returns undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('returns undefined for evicted keys', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.set('d', '4'); // evicts 'a'
      expect(cache.get('a')).toBeUndefined();
    });

    it('stores multiple values within capacity', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      expect(cache.get('a')).toBe('1');
      expect(cache.get('b')).toBe('2');
      expect(cache.get('c')).toBe('3');
    });
  });

  describe('LRU eviction', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(3);
    });

    it('evicts the least recently used item when capacity is exceeded', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.set('d', '4'); // exceeds capacity 3; 'a' should be evicted

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('2');
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
    });

    it('promotes accessed items to most recently used on get', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      // Access 'a' to make it MRU, making 'b' the LRU
      cache.get('a');
      cache.set('d', '4'); // evicts 'b' (the LRU), not 'a'

      expect(cache.get('a')).toBe('1'); // survived because MRU-promoted
      expect(cache.get('b')).toBeUndefined(); // evicted
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
    });

    it('maintains correct LRU order across multiple accesses', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      // Access order: a, b, c (MRU: c, LRU: a)
      cache.get('a'); // MRU: a, LRU: b
      cache.get('b'); // MRU: b, LRU: c
      cache.set('d', '4'); // evicts 'c'

      expect(cache.get('c')).toBeUndefined();
      expect(cache.get('a')).toBe('1');
      expect(cache.get('b')).toBe('2');
      expect(cache.get('d')).toBe('4');
    });
  });

  describe('duplicate keys', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(3);
    });

    it('overwrites existing key value', () => {
      cache.set('a', '1');
      cache.set('a', 'updated');
      expect(cache.get('a')).toBe('updated');
    });

    it('overwriting does not affect other keys', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.set('a', 'updated');
      expect(cache.get('a')).toBe('updated');
      expect(cache.get('b')).toBe('2');
      expect(cache.get('c')).toBe('3');
    });

    it('updating an existing key does not evict anything', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('a', 'updated');
      cache.set('c', '3');

      // All 3 keys should still exist
      expect(cache.get('a')).toBe('updated');
      expect(cache.get('b')).toBe('2');
      expect(cache.get('c')).toBe('3');
    });

    it('updating promotes the key to MRU', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      // 'a' is currently LRU. Updating it makes it MRU.
      cache.set('a', 'updated');
      cache.set('d', '4'); // should evict 'b' (now the LRU)

      expect(cache.get('a')).toBe('updated');
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
    });
  });

  describe('has', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(3);
    });

    it('returns true for existing keys', () => {
      cache.set('a', '1');
      expect(cache.has('a')).toBe(true);
    });

    it('returns false for missing keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('returns false for evicted keys', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.set('d', '4'); // evicts 'a'

      expect(cache.has('a')).toBe(false);
      expect(cache.has('d')).toBe(true);
    });

    it('does not affect LRU order (unlike get)', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      cache.has('a'); // should NOT promote 'a'
      cache.set('d', '4'); // 'a' is still LRU, should be evicted

      expect(cache.has('a')).toBe(false);
      expect(cache.get('b')).toBe('2');
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
    });
  });

  describe('delete', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(3);
    });

    it('removes a key and returns true', () => {
      cache.set('a', '1');
      expect(cache.delete('a')).toBe(true);
      expect(cache.has('a')).toBe(false);
      expect(cache.get('a')).toBeUndefined();
    });

    it('returns false for nonexistent keys', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('deleting a key frees up space', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.delete('a');
      cache.set('d', '4'); // should not evict anything

      expect(cache.get('b')).toBe('2');
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
      expect(cache.has('a')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles many insertions and accesses', () => {
      const cache = new LRUCache<number>(5);
      for (let i = 0; i < 100; i++) {
        cache.set(`key-${i}`, i);
      }
      // Only the last 5 inserted keys should remain
      expect(cache.has('key-0')).toBe(false);
      expect(cache.has('key-94')).toBe(false);
      expect(cache.get('key-99')).toBe(99);
      expect(cache.get('key-98')).toBe(98);
      expect(cache.get('key-97')).toBe(97);
      expect(cache.get('key-96')).toBe(96);
      expect(cache.get('key-95')).toBe(95);
    });

    it('works with object values', () => {
      const cache = new LRUCache<{ name: string }>(2);
      cache.set('user1', { name: 'Alice' });
      cache.set('user2', { name: 'Bob' });

      expect(cache.get('user1')).toEqual({ name: 'Alice' });
      expect(cache.get('user2')).toEqual({ name: 'Bob' });
    });

    it('get on an empty cache returns undefined', () => {
      const cache = new LRUCache<string>(3);
      expect(cache.get('anything')).toBeUndefined();
    });

    it('delete on an empty cache returns false', () => {
      const cache = new LRUCache<string>(3);
      expect(cache.delete('anything')).toBe(false);
    });
  });
});

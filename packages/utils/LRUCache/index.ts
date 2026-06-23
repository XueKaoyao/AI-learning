export default class LRUCache<T> {
  private cache: Map<string, T>;
  private capability: number;
  constructor(capability: number) {
    this.cache = new Map();
    this.capability = capability;
  }
  has(key: string): boolean {
    return this.cache.has(key);
  }
  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value === undefined) return undefined;
    // 存在则提升为 MRU（delete + re-set 移到末尾）
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capability) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
}

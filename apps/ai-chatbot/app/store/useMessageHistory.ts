import { UIMessage } from 'ai';
import { withStore, withStoreResult } from '@myworkspace/indexedDB';

const DB_NAME = 'ai-chatbot';
const DB_VERSION = 1;
const STORE_NAME = 'messageHistory';
const META_KEY = 'meta';
const DATA_VERSION = 1;

interface StoredMeta {
  version: number;
  /** 消息 ID 插入顺序，用于 load 时排序 */
  order: string[];
}

function opts() {
  return {
    dbName: DB_NAME,
    dbVersion: DB_VERSION,
    storeName: STORE_NAME,
    storeKey: META_KEY,
  };
}

/**
 * 增量存储：每条消息以自身 id 为 key 独立写入 IndexedDB，
 * 不覆盖已有消息。同时更新 meta.order 维护插入顺序。
 */
export async function setMessageHistory(
  newMessages: UIMessage[],
): Promise<void> {
  if (newMessages.length === 0) return;
  try {
    // 1. 读取当前 meta（获取已有 order）
    const meta = await withStoreResult<StoredMeta>(
      opts(),
      'readonly',
      (store) => store.get(META_KEY),
    );
    const order = meta?.order ?? [];

    // 2. 写入新消息 + 更新 order
    await withStore(opts(), 'readwrite', (store) => {
      for (const msg of newMessages) {
        store.put(msg, msg.id);
        if (!order.includes(msg.id)) {
          order.push(msg.id);
        }
      }
      store.put(
        { version: DATA_VERSION, order } satisfies StoredMeta,
        META_KEY,
      );
    });
  } catch (error) {
    console.error('Error saving message history to IndexedDB:', error);
  }
}

/**
 * 读取全部已存储消息，按 meta.order 排序后返回。
 */
export async function loadMessageHistory(): Promise<UIMessage[]> {
  try {
    // 1. 读取 meta + 全部记录
    const meta = await withStoreResult<StoredMeta>(
      opts(),
      'readonly',
      (store) => store.get(META_KEY),
    );

    // 版本检查
    if (meta && meta.version !== DATA_VERSION) {
      console.warn(
        `Message history version mismatch: stored=${meta.version}, current=${DATA_VERSION}. Discarding old data.`,
      );
      await clearMessageHistory();
      return [];
    }

    const all = await withStoreResult<(UIMessage | StoredMeta)[]>(
      opts(),
      'readonly',
      (store) => store.getAll(),
    );
    if (!all) return [];

    // 2. 过滤出消息，按 order 排序
    const orderMap = new Map((meta?.order ?? []).map((id, i) => [id, i]));
    const messages = all
      .filter((r): r is UIMessage => 'id' in r && 'role' in r)
      .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    return messages;
  } catch (error) {
    console.error('Error loading message history from IndexedDB:', error);
    return [];
  }
}

/**
 * 清空全部消息历史。
 */
export async function clearMessageHistory(): Promise<void> {
  try {
    await withStore(opts(), 'readwrite', (store) => store.clear());
  } catch (error) {
    console.error('Error clearing message history:', error);
  }
}

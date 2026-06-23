import { UIMessage } from 'ai';
import {
  withStore,
  withStoreResult,
  opts,
  getAllByIds,
} from '@myworkspace/indexedDB';
import { StoredMeta } from '../types/chatStatus';

const DATA_VERSION = 1;

const options = {
  dbName: 'ai-chatbot-messages',
  dbVersion: 1,
  storeName: 'messageHistory',
  storeKey: 'meta',
};
/**
 * 增量存储：每条消息以自身 id 为 key 独立写入 IndexedDB，
 * 不覆盖已有消息。同时更新 meta.order 维护插入顺序。
 */
export async function setMessageHistory(
  newMessages: UIMessage[],
  currentSessionId: number,
): Promise<void> {
  if (newMessages.length === 0) return;
  try {
    // 1. 读取当前 meta（获取已有 order）
    const meta = await withStoreResult<StoredMeta<Map<string, number | null>>>(
      opts(options),
      'readonly',
      (store) => store.get(options.storeKey),
    );
    const order = meta?.order || new Map<string, number>();

    // 2. 写入新消息 + 更新 order
    await withStore(opts(options), 'readwrite', (store) => {
      for (const msg of newMessages) {
        store.put(msg, msg.id);
        if (!order.has(msg.id)) {
          order.set(msg.id, currentSessionId);
        }
      }
      store.put(
        { version: DATA_VERSION, order } satisfies StoredMeta<
          Map<string, number | null>
        >,
        options.storeKey,
      );
    });
  } catch (error) {
    console.error('Error saving message history to IndexedDB:', error);
  }
}

/**
 * 读取当前会话的消息历史，按 meta.order 的插入顺序返回。
 * 只查询属于当前会话的消息，不再全表扫描。
 */
export async function loadMessageHistory(
  currentSessionId: number | null,
): Promise<UIMessage[]> {
  if (currentSessionId === null) return Promise.resolve([]);
  try {
    // 1. 读取 meta
    const metaArr = await getAllByIds<StoredMeta<Map<string, number | null>>>(
      opts(options),
      [options.storeKey],
    );
    const meta = metaArr[0] ?? null;

    // 版本检查
    if (meta && meta.version !== DATA_VERSION) {
      console.warn(
        `Message history version mismatch: stored=${meta.version}, current=${DATA_VERSION}. Discarding old data.`,
      );
      await clearMessageHistory();
      return [];
    }

    // 2. 提取当前会话的消息 ID（按插入顺序排列）
    const msgIds: string[] = [];
    for (const [msgId, sessionId] of meta?.order ?? new Map()) {
      if (sessionId === currentSessionId) {
        msgIds.push(msgId);
      }
    }

    if (msgIds.length === 0) return [];

    // 3. 只查询当前会话的消息（getAllByIds 保持传入顺序，无需再排序）
    const messages = await getAllByIds<UIMessage>(opts(options), msgIds);

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
    await withStore(opts(options), 'readwrite', (store) => store.clear());
  } catch (error) {
    console.error('Error clearing message history:', error);
  }
}

/**
 * 删除指定会话的全部消息，同时清理 meta.order 中的对应条目。
 */
export async function deleteSessionMessages(sessionId: number): Promise<void> {
  try {
    const meta = await withStoreResult<StoredMeta<Map<string, number | null>>>(
      opts(options),
      'readonly',
      (store) => store.get(options.storeKey),
    );
    if (!meta) return;

    // 找出属于该会话的所有消息 ID
    const keysToDelete: string[] = [];
    for (const [msgId, sid] of meta.order) {
      if (sid === sessionId) {
        keysToDelete.push(msgId);
      }
    }
    if (keysToDelete.length === 0) return;

    await withStore(opts(options), 'readwrite', (store) => {
      for (const key of keysToDelete) {
        store.delete(key);
        meta.order.delete(key);
      }
      store.put(meta, options.storeKey);
    });
  } catch (error) {
    console.error('Error deleting session messages:', error);
  }
}

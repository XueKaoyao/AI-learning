import { withStore, withStoreResult, opts } from '@myworkspace/indexedDB';
import { SystemPromptOption } from '../types/systemPromptType';
import { StoredMeta } from '../types/chatStatus';

const DATA_VERSION = 1;

const options = {
  dbName: 'ai-chatbot-prompt',
  dbVersion: 1,
  storeName: 'customPrompts',
  storeKey: 'meta',
};
/**
 * 保存自定义提示词到 IndexedDB。
 * 每条提示词以自身 id 为 key 独立写入，不覆盖已有记录。
 * 同时更新 meta.order 维护插入顺序。
 */
export async function addCustomPrompt(
  prompt: SystemPromptOption,
): Promise<void> {
  try {
    // 1. 读取当前 meta（获取已有 order）
    const meta = await withStoreResult<StoredMeta<Set<string>>>(
      opts(options),
      'readonly',
      (store) => store.get(options.storeKey),
    );
    const order = meta?.order || new Set<string>();

    // 2. 写入新提示词 + 更新 order
    await withStore(opts(options), 'readwrite', (store) => {
      store.put(prompt, prompt.id);
      order.add(prompt.id);
      store.put(
        { version: DATA_VERSION, order } satisfies StoredMeta<Set<string>>,
        options.storeKey,
      );
    });
  } catch (error) {
    console.error('Error saving custom prompt to IndexedDB:', error);
  }
}

/**
 * 从 IndexedDB 加载全部自定义提示词，按 meta.order 排序后返回。
 */
export async function loadCustomPrompts(): Promise<SystemPromptOption[]> {
  try {
    // 1. 读取 meta
    const meta = await withStoreResult<StoredMeta<Set<string>>>(
      opts(options),
      'readonly',
      (store) => store.get(options.storeKey),
    );

    // 版本检查
    if (meta && meta.version !== DATA_VERSION) {
      console.warn(
        `Custom prompts version mismatch: stored=${meta.version}, current=${DATA_VERSION}. Discarding old data.`,
      );
      await clearCustomPrompts();
      return [];
    }

    // 2. 读取全部记录
    const all = await withStoreResult<
      (SystemPromptOption | StoredMeta<Set<string>>)[]
    >(opts(options), 'readonly', (store) => store.getAll());
    if (!all) return [];

    // 3. 过滤出提示词并按 order 排序
    const order = meta?.order ?? new Set<string>();
    const orderMap = new Map([...order].map((id, i) => [id, i]));

    const prompts = all
      .filter(
        (item): item is SystemPromptOption =>
          'id' in item && 'description' in item,
      )
      .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    return prompts;
  } catch (error) {
    console.error('Error loading custom prompts from IndexedDB:', error);
    return [];
  }
}

/**
 * 清空全部自定义提示词。
 */
export async function clearCustomPrompts(): Promise<void> {
  try {
    await withStore(opts(options), 'readwrite', (store) => store.clear());
  } catch (error) {
    console.error('Error clearing custom prompts:', error);
  }
}

/**
 * 更新 IndexedDB 中指定自定义提示词的内容（保持 id 和 order 不变）。
 */
export async function updateCustomPrompt(
  id: string,
  updates: Partial<Pick<SystemPromptOption, 'description' | 'content'>>,
): Promise<void> {
  try {
    // 1. 读取现有记录
    const existing = await withStoreResult<SystemPromptOption>(
      opts(options),
      'readonly',
      (store) => store.get(id),
    );
    if (!existing || typeof existing !== 'object') return;

    // 2. 合并并写回
    const merged: SystemPromptOption = {
      ...existing,
      description: updates.description ?? existing.description,
      content: updates.content ?? existing.content,
    };
    await withStore(opts(options), 'readwrite', (store) => {
      store.put(merged, id);
    });
  } catch (error) {
    console.error('Error updating custom prompt in IndexedDB:', error);
  }
}

/**
 * 从 IndexedDB 删除指定自定义提示词，同时清理 meta.order 中的对应条目。
 */
export async function deleteCustomPrompt(id: string): Promise<void> {
  try {
    const meta = await withStoreResult<StoredMeta<Set<string>>>(
      opts(options),
      'readonly',
      (store) => store.get(options.storeKey),
    );

    await withStore(opts(options), 'readwrite', (store) => {
      store.delete(id);
      if (meta) {
        meta.order.delete(id);
        store.put(meta, options.storeKey);
      }
    });
  } catch (error) {
    console.error('Error deleting custom prompt from IndexedDB:', error);
  }
}

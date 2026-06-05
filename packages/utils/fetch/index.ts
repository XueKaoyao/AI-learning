// ============================================================
// 自定义 Fetch 错误类
// ============================================================

export class FetchError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly category: 'network' | 'http' | 'json-parse' | 'timeout';

  constructor(
    message: string,
    opts: {
      status: number;
      statusText: string;
      url: string;
      category: FetchError['category'];
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

// ============================================================
// 可替换的 token 获取函数 — 接入项目后替换实现即可
// ============================================================

let getAuthToken: () => string | null = () => null;

export function setAuthTokenGetter(fn: () => string | null): void {
  getAuthToken = fn;
}

// ============================================================
// 类型定义
// ============================================================

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  /** 请求体 — 兼容常见类型，优先使用 body */
  data?: unknown;
  /** 超时时间 (ms)，默认 30_000。传 0 禁用超时 */
  timeout?: number;
  /** 缓存配置 */
  cacheConfig?: {
    /** 过期时间 (ms)，默认 5 分钟。传 0 跳过缓存 */
    ttl?: number;
    /** 自定义缓存 key（默认由 method + url + body 生成） */
    key?: string;
    /** 标签，配合 clearCacheByTag() 做分组失效 */
    tags?: string[];
    /** 开启 SWR：立即返回陈旧数据，后台静默刷新 */
    revalidate?: boolean;
  };
}

interface ResponseData<T = unknown> {
  success: boolean;
  code: number;
  data: T;
  message: string;
  /** 304 协商缓存命中 */
  notModified?: boolean;
}

// ============================================================
// 缓存层
// ============================================================

/** 默认 TTL：5 分钟 */
const DEFAULT_TTL = 5 * 60 * 1000;

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  tags: string[];
  /** 服务端返回的 ETag，用于协商缓存 */
  etag?: string;
  /** 服务端返回的 Last-Modified，用于协商缓存 */
  lastModified?: string;
}

const store = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<unknown>>();

/** 生成缓存 key */
function cacheKey(url: string, options: FetchOptions): string {
  const cfg = options.cacheConfig;
  if (cfg?.key) return cfg.key;

  const { method = 'GET', data } = options;
  const bodyPart = data !== undefined ? `:${JSON.stringify(data)}` : '';
  return `${method}:${url}${bodyPart}`;
}

/** 查询缓存条目（含元数据），不做过期判断 */
function cacheGetEntry<T>(key: string): CacheEntry<T> | undefined {
  return store.get(key) as CacheEntry<T> | undefined;
}

/** 写入缓存（自动提取响应中的 ETag / Last-Modified） */
function cacheSet<T>(
  key: string,
  data: T,
  tags: string[],
  response?: Response,
): void {
  store.set(key, {
    data,
    timestamp: Date.now(),
    tags,
    etag:
      response?.headers.get('ETag') ??
      response?.headers.get('Etag') ??
      undefined,
    lastModified: response?.headers.get('Last-Modified') ?? undefined,
  });
}

/** 刷新缓存时间戳（304 时续期） */
function cacheRefresh(key: string): void {
  const entry = store.get(key);
  if (entry) {
    entry.timestamp = Date.now();
  }
}

/** 清空全部缓存 */
export function clearCache(): void {
  store.clear();
}

/** 按 tag 批量清除缓存 */
export function clearCacheByTag(tag: string): void {
  for (const [key, entry] of store) {
    if (entry.tags.includes(tag)) {
      store.delete(key);
    }
  }
}

/** 获取缓存统计信息（调试用） */
export function getCacheStats(): { size: number; keys: string[] } {
  return { size: store.size, keys: [...store.keys()] };
}

// ============================================================
// 请求拦截器：设置请求头（token + Content-Type）
// ============================================================

const setRequestHeaders = (
  requestOptions: FetchOptions,
): Record<string, string> => {
  const { headers, method, data } = requestOptions;
  const hasContentType = ['POST', 'PUT', 'PATCH'];
  const obj: Record<string, string> = {};

  if (hasContentType.includes((method ?? 'GET').toUpperCase())) {
    obj['Content-Type'] = 'application/json';
  }

  // FormData 不需要 Content-Type，浏览器自动设置 multipart/form-data
  if (data instanceof FormData) {
    delete obj['Content-Type'];
  }

  const token = getAuthToken();
  if (token) {
    obj['Authorization'] = `Bearer ${token}`;
  }

  // 用户自定义 headers 优先级最高
  if (headers) {
    Object.assign(obj, headers);
  }

  return obj;
};

// ============================================================
// 请求拦截器：处理请求体序列化
// ============================================================

const handleData = (
  options: FetchOptions,
  headers: Record<string, string>,
): BodyInit | null => {
  const { data } = options;

  if (data === undefined || data === null) {
    delete headers['Content-Type'];
    return null;
  }

  if (typeof data === 'string') {
    headers['Content-Type'] = 'text/plain';
    return data;
  }

  // object 类型分支
  if (data instanceof FormData) {
    delete headers['Content-Type'];
    return data;
  }
  if (data instanceof Blob || data instanceof File) {
    return data;
  }
  if (data instanceof URLSearchParams) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    return data;
  }

  // 普通对象 → JSON
  return JSON.stringify(data);
};

// ============================================================
// 响应解析
// ============================================================

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return response.json();
  }

  // 兜底：尝试将文本当作 JSON 解析
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

// ============================================================
// 响应拦截器：HTTP 状态码 → 统一 ResponseData 或抛出 FetchError
// ============================================================

/**
 * 判断响应体是否为标准包装格式 `{ data/body, message, success }`。
 * 如果不是（如直接返回数组、字符串），说明响应体本身就是数据。
 */
function isWrappedResponse(body: unknown): body is Record<string, unknown> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return false;
  }
  const obj = body as Record<string, unknown>;
  return (
    'data' in obj ||
    'body' in obj ||
    'message' in obj ||
    'success' in obj ||
    'error' in obj
  );
}

const handleApiResponse = async <T>(
  response: Response,
): Promise<ResponseData<T>> => {
  const { status } = response;

  // 解析响应体
  let rawBody: unknown;
  try {
    rawBody = await parseResponseBody(response);
  } catch {
    rawBody = { error: 'Failed to parse response' };
  }

  // -------- 区分包装格式 vs 原始数据 --------
  let extractedData: T;
  let responseMessage: string;

  if (isWrappedResponse(rawBody)) {
    // 标准包装格式: { data/body, message, ... }
    extractedData = (rawBody.body ?? rawBody.data) as T;
    responseMessage =
      (rawBody.message as string) || response.statusText || '请求失败';
  } else {
    // 响应体本身就是数据（数组、字符串、数字等）
    extractedData = rawBody as T;
    responseMessage = response.statusText || 'success';
  }

  // 304 协商缓存 — 数据未变，使用客户端缓存
  if (status === 304) {
    return {
      success: true,
      code: 304,
      data: null as T,
      message: 'Not Modified',
      notModified: true,
    };
  }

  // 成功响应
  if (status >= 200 && status < 300) {
    return {
      success: true,
      code: status,
      data: extractedData ?? (null as T),
      message: responseMessage || 'success',
    };
  }

  // 错误响应 — 按状态码给出中文提示
  let userMessage = responseMessage;
  switch (status) {
    case 400:
      userMessage = `请求参数错误：${responseMessage}`;
      break;
    case 401:
      userMessage = '登录已过期，请重新登录';
      break;
    case 403:
      userMessage = '没有权限执行此操作';
      break;
    case 404:
      userMessage = '请求的资源不存在';
      break;
    case 408:
      userMessage = '请求超时，请重试';
      break;
    case 429:
      userMessage = '请求过于频繁，请稍后再试';
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      userMessage = '服务器繁忙，请稍后重试';
      break;
  }

  return {
    success: false,
    code: status,
    data: extractedData ?? (null as T),
    message: userMessage,
  };
};

// ============================================================
// 核心导出：apiFetch
// ============================================================

/**
 * 执行实际 HTTP 请求的内部函数（不含缓存逻辑）。
 */
async function doFetch<T>(
  url: string,
  options: FetchOptions,
): Promise<{ data: T; response: Response }> {
  const { method = 'GET', timeout = 30_000, ...fetchInit } = options;

  const headers = setRequestHeaders(options);
  const body = handleData(options, headers);

  const controller = new AbortController();
  const timeoutId: ReturnType<typeof setTimeout> | undefined =
    timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined;

  let response: Response;

  try {
    response = await fetch(url, {
      ...fetchInit,
      method,
      headers,
      body,
      signal: controller.signal,
      // 禁用浏览器 HTTP 缓存，搭建自己的应用级缓存层
      cache: 'no-store',
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new FetchError(`请求超时: ${url}`, {
        status: 0,
        statusText: 'Timeout',
        url,
        category: 'timeout',
      });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('Request failed:', url, message);
    throw new FetchError(`网络请求失败: ${message}`, {
      status: 0,
      statusText: 'Network Error',
      url,
      category: 'network',
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const result = await handleApiResponse<T>(response);

  if (!result.success) {
    throw new FetchError(result.message, {
      status: result.code,
      statusText: response.statusText,
      url,
      category: 'http',
    });
  }
  return { data: result.data, response };
}

export async function apiFetch<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const cfg = options.cacheConfig;
  const ttl = cfg?.ttl ?? DEFAULT_TTL;
  const key = cacheKey(url, options);

  // 仅 GET 默认启用缓存；ttl=0 或非 GET + 未显式配置 ttl 则跳过
  const shouldCache = ttl > 0 && (method === 'GET' || cfg?.ttl !== undefined);

  // -------- 协商缓存：注入 If-None-Match / If-Modified-Since --------
  const cachedEntry = shouldCache ? cacheGetEntry<T>(key) : undefined;
  if (cachedEntry?.etag) {
    options.headers = { ...options.headers, 'If-None-Match': cachedEntry.etag };
  } else if (cachedEntry?.lastModified) {
    options.headers = {
      ...options.headers,
      'If-Modified-Since': cachedEntry.lastModified,
    };
  }

  // -------- 缓存命中（未过期）--------
  if (cachedEntry && Date.now() - cachedEntry.timestamp <= ttl) {
    // SWR：返回陈旧数据，后台静默刷新
    if (cfg?.revalidate) {
      doFetch<T>(url, options)
        .then(({ data: fresh, response: res }) => {
          // 304 — 数据未变，仅续期时间戳，不覆盖缓存
          if (res.status === 304) {
            cacheRefresh(key);
            return;
          }
          cacheSet(key, fresh, cfg?.tags ?? [], res);
        })
        .catch(() => {}); // 静默失败，下次请求再试
    }
    return cachedEntry.data;
  }

  // -------- 请求去重（合并并发请求）--------
  const pending = inflightRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  // -------- 发起请求 --------
  const promise = doFetch<T>(url, options)
    .then(({ data, response }) => {
      // 304 — 用缓存数据，刷新时间戳
      if (response.status === 304) {
        if (cachedEntry) {
          cacheRefresh(key);
          return cachedEntry.data;
        }
        // 安全兜底：304 但应用缓存丢失 → 降级重试（不带条件头，不走缓存）
        console.warn(`[fetch] 收到 304 但缓存缺失，降级重试: ${url}`);
        return apiFetch<T>(url, {
          ...options,
          headers: undefined,
          cacheConfig: { ttl: 0 },
        });
      }

      // 200 — 写入缓存
      if (shouldCache) {
        cacheSet(key, data, cfg?.tags ?? [], response);
      }
      return data;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, promise);
  return promise;
}

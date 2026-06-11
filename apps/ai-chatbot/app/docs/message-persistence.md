# 消息持久化方案

## 概览

聊天消息通过 **IndexedDB** 进行客户端持久化，支持页面刷新后恢复历史对话。核心原则：

- **增量写入**：每条消息以自身 `id` 为 key 独立存储，不覆盖已有消息
- **异步非阻塞**：全部 I/O 操作基于 Promise，不阻塞 UI 渲染
- **版本管理**：通过元数据版本号实现向前兼容，版本不匹配时自动清理

## 涉及文件

| 文件 | 职责 |
|------|------|
| `app/store/useMessageHistory.ts` | IndexedDB 读写封装：`setMessageHistory` / `loadMessageHistory` / `clearMessageHistory` |
| `app/page.tsx` | 调用方：mount 时恢复历史、AI 响应完成时持久化 |
| `packages/utils/indexedDB/index.ts` | 通用 IndexedDB 事务包装器：`withStore` / `withStoreResult` |

## IndexedDB 数据结构

```
Database: ai-chatbot (v1)
└── ObjectStore: messageHistory (无 keyPath, 无 autoIncrement)
    ├── key: "meta"     →  { version: number, order: string[] }
    ├── key: "<msg-id>" →  UIMessage
    ├── key: "<msg-id>" →  UIMessage
    └── ...
```

每条消息以 `UIMessage.id` 作为 key 独立存储，无需包裹额外的容器结构。

### 元数据（meta）

```ts
interface StoredMeta {
  version: number;  // 数据格式版本（当前 = 1）
  order: string[];  // 消息 ID 按插入先后排列，用于加载时排序
}
```

`order` 数组是消息排序的唯一依据。因为 `UIMessage` 不含 `createdAt` 字段，而 `getAll()` 不保证返回顺序，所以在 meta 中显式记录插入顺序。

## 数据流

### 写入：`setMessageHistory(newMessages)`

```
setMessageHistory([msgA, msgB])
  │
  ├─ 1. 读 meta → 获取当前 order 数组
  │
  └─ 2. 事务写入:
       ├─ store.put(msgA, msgA.id)    // 增量：不影响其他 key
       ├─ store.put(msgB, msgB.id)
       ├─ order.push(msgA.id)         // 去重后追加
       ├─ order.push(msgB.id)
       └─ store.put({ version, order }, "meta")
```

**关键设计**：每个消息独立 key，`put` 操作只影响自身。与其他消息完全解耦。

### 读取：`loadMessageHistory()`

```
loadMessageHistory()
  │
  ├─ 1. store.get("meta") → 检查 version，不匹配则 clear() 返回 []
  │
  ├─ 2. store.getAll() → 拉取 objectStore 全部记录
  │
  └─ 3. 过滤 + 排序:
       ├─ 过滤: 保留有 id + role 的对象（排除 meta 等辅助记录）
       └─ 排序: 按 meta.order 中 id 的位置排列
```

### 清空：`clearMessageHistory()`

```
clearMessageHistory()
  └─ store.clear()  // 清空整个 objectStore（meta + 所有消息）
```

## 页面集成（page.tsx）

```
    首次加载                           AI 响应完成
       │                                   │
       ▼                                   ▼
  useEffect([])                     onFinish 回调
       │                                   │
       ├─ loadMessageHistory()             ├─ 取 messages 末尾 2 条
       ├─ setMessages(saved)              └─ await setMessageHistory()
       └─ setHistoryLoaded(true)
```

### 加载守卫

`historyLoaded` 状态确保 IndexedDB 异步读取完成前，WelcomeCard 不会闪现：

```tsx
{historyLoaded && messages.length === 0 && !visibleError && (
  <WelcomeCard />
)}
```

### 保存时机

- **触发点**：`useChat` 的 `onFinish` 回调，即每次 AI 回复完成
- **保存范围**：`messages.slice(-2)` — 当前轮次的 user + assistant 两条
- **异步处理**：`await setMessageHistory()` 确保写入完成

## 错误处理

| 层级 | 策略 |
|------|------|
| `withStore` / `withStoreResult` | 事务 `onerror` / `onabort` → Promise reject |
| `setMessageHistory` | catch 后 `console.error`，静默失败不抛到 UI |
| `loadMessageHistory` | catch 后 `console.error`，返回 `[]`（空历史） |
| 版本检查 | `meta.version ≠ DATA_VERSION` → `clear()` + 返回 `[]` |
| IndexedDB 不可用 | `openDB` reject → 上层 catch，降级为空历史 |
| `onblocked` | 数据库被其他连接阻塞 → reject，记录日志 |

所有持久化失败都**不影响聊天功能本身** — 消息仍在 React state 中，仅丢失跨会话恢复能力。

## 版本迁移

当 `DATA_VERSION` 递增时：

1. `loadMessageHistory` 检测到 `meta.version` 不匹配
2. 调用 `clearMessageHistory()` 清空整个 store
3. 返回 `[]`，页面以空白状态启动
4. 下次 `setMessageHistory` 会写入新版本 meta + 新消息

不需要编写迁移脚本 — 旧数据直接丢弃，由新对话重建。

## 设计权衡

| 决策 | 选择 | 原因 |
|------|------|------|
| 存储引擎 | IndexedDB | 异步、容量大（50MB+）、原生支持结构化数据 |
| 不做 | localStorage | 同步阻塞、~5MB 上限 |
| key 策略 | 每条消息独立 key | 增量写入，不需要先读全量再合并回写 |
| 不做 | 单 key 存整个数组 | 每次写入要序列化/反序列化全量数据 |
| 排序方式 | `meta.order` 数组 | `UIMessage` 无时间戳字段，`getAll()` 不保证顺序 |
| 不做 | autoIncrement key | 需改造共享包 `@myworkspace/indexedDB`，改动面过大 |
| 版本号 | meta 中嵌入 `version` | 未来 SDK 升级导致类型变化时可自动清理 |

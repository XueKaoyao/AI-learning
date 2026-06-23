# next.config.ts 配置说明

> 最后更新：2026-06-22 | Next.js 16.2.6 | Turbopack

本文件详细说明 `next.config.ts` 中每一项配置的**目的、原理、预期效果和测试方法**。

---

## 配置总览

| 分类 | 配置项 | 值 | 作用 |
|------|--------|-----|------|
| Monorepo | `transpilePackages` | `['@myworkspace/*']` | 转译 workspace 源码包 |
| Monorepo | `turbopack.root` | monorepo 根路径 | Turbopack 文件解析与 HMR |
| 优化 | `experimental.optimizePackageImports` | `['lodash']` | Tree-shaking lodash |
| 安全 | `poweredByHeader` | `false` | 隐藏技术栈 |
| 安全 | `headers()` | 5 个安全头 | 防点击劫持/MIME嗅探等 |
| 运行时 | `compress` | `true` | Gzip 压缩 |
| 运行时 | `productionBrowserSourceMaps` | `false` | 禁止源码泄露 |
| 运行时 | `reactStrictMode` | `true` | React 严格模式 |
| 开发 | `logging.fetches.fullUrl` | `true` | 终端打印完整 fetch URL |

---

## 1. `transpilePackages` — Workspace 包转译

### 目的

项目使用 pnpm monorepo，3 个 workspace 包以 TypeScript 源文件形式存在：

```
packages/utils/
├── LRUCache/index.ts      → @myworkspace/LRUCache
├── fetch/index.ts         → @myworkspace/fetch
└── indexedDB/index.ts     → @myworkspace/indexedDB
```

这些包未经预编译（`package.json` 的 `main` 指向 `.ts` 源文件），Next.js/Turbopack 默认**不转译 `node_modules`**，直接使用会报语法错误。

### 原理

`transpilePackages` 告诉 Next.js 对这些包走完整的编译管线（TypeScript → JavaScript → bundle），就像处理项目自己的源代码一样。

### 预期效果

- 消除 `Unexpected token 'export'` 类错误
- workspace 包中的 TypeScript 语法被正确编译

### 测试方法

```bash
# 如果缺少此配置，build 会报错
pnpm build

# 开发模式验证 HMR
# 1. pnpm dev
# 2. 修改 packages/utils/LRUCache/index.ts 中的代码
# 3. 浏览器应自动热更新
```

---

## 2. `turbopack.root` — Monorepo 根目录

### 目的

在 monorepo 中，Turbopack 需要知道"根目录"在哪里，才能正确：

1. 解析 workspace 包之间的符号链接
2. 监听 `packages/` 目录的文件变更，触发 HMR
3. 计算缓存键（包含根目录外的 workspace 文件）

### 原理

Turbopack 默认只解析根目录内的文件，外部文件会被忽略。`root` 将监控范围扩展到 monorepo 根，使 `packages/` 中的变更能够被检测。

```
apps/ai-chatbot/          ← Next.js 项目目录
packages/utils/           ← workspace 包源码
pnpm-lock.yaml            ← 自动检测的根标记（显式指定更安全）
```

### 测试方法

```bash
# 1. 启动开发服务器
pnpm dev

# 2. 修改 packages/utils/LRUCache/index.ts，添加一行 console.log
# 3. 终端应输出 "Turbopack: HMR update" → 浏览器自动刷新

# 如果 HMR 不生效 → 检查 root 路径是否正确
```

---

## 3. `experimental.optimizePackageImports` — lodash Tree-Shaking

### 目的

项目使用 `lodash`（非 `lodash-es`），Next.js 默认优化列表只包含 `lodash-es`。

### 原理

正常情况下：

```typescript
// 这样导入会打包整个 lodash（~530KB）
import { debounce } from 'lodash'

// 手动按路径导入才能 tree-shake
import debounce from 'lodash/debounce'
```

开启 `optimizePackageImports` 后，第一种写法也会被自动转换为按需导入，只打包实际用到的函数。

### 预期效果

| 场景 | lodash 相关体积 |
|------|----------------|
| 未优化（全量导入） | ~530KB gzipped |
| 手动路径导入 | ~10-60KB（取决于使用量） |
| 开启 optimizePackageImports | 同手动路径导入 |

### 测试方法

```bash
# 1. 构建并分析产物
pnpm build

# 2. 检查 lodash 相关 chunk 体积
ls -lh .next/static/chunks/*.js | sort -k5 -h

# 3. 使用 bundle-analyzer 可视化确认
# npx @next/bundle-analyzer  # 需要额外安装
```

---

## 4. `poweredByHeader` — 隐藏技术栈

### 目的

默认响应头中包含 `X-Powered-By: Next.js`，攻击者可以据此针对 Next.js 已知漏洞发起攻击。

### 测试方法

```bash
# 生产模式
pnpm build && pnpm start

# 新终端
curl -I http://localhost:3000 | grep -i x-powered-by
# 预期：无输出（头不存在）

# 开发模式也适用
pnpm dev
curl -I http://localhost:3000 | grep -i x-powered-by
# 预期：无输出
```

---

## 5. `headers()` — 安全响应头

### 5 个安全头的作用

| Header | 设值 | 防护类型 |
|--------|------|----------|
| `X-Frame-Options: DENY` | 禁止所有 iframe 嵌入 | 点击劫持 (Clickjacking) |
| `X-Content-Type-Options: nosniff` | 禁止 MIME 类型嗅探 | MIME 混淆攻击 |
| `Referrer-Policy: strict-origin-when-cross-origin` | 同源发送完整 URL，跨域仅发送 origin | 敏感信息泄露 |
| `X-DNS-Prefetch-Control: on` | 允许浏览器预解析 DNS | 性能优化（非安全项） |
| `Permissions-Policy: camera/mic/geolocation=()` | 禁用摄像头/麦克风/定位 API | 隐私保护 |

### 测试方法

```bash
# 启动服务器
pnpm dev

# 检查响应头
curl -I http://localhost:3000 2>&1 | grep -E 'X-Frame|X-Content|Referrer|X-DNS|Permissions'

# 预期输出：
# x-frame-options: DENY
# x-content-type-options: nosniff
# referrer-policy: strict-origin-when-cross-origin
# x-dns-prefetch-control: on
# permissions-policy: camera=(), microphone=(), geolocation=()
```

或者在浏览器 DevTools → Network → 任意请求 → Headers → Response Headers 中查看。

---

## 6. `compress` — Gzip 压缩

### 目的

对文本类 HTTP 响应（HTML、CSS、JS、JSON、SVG）启用 Gzip 压缩。

### 预期效果

| 资源类型 | 压缩前 | 压缩后 | 减少 |
|----------|--------|--------|------|
| JavaScript bundle | ~300KB | ~90KB | ~70% |
| HTML 页面 | ~30KB | ~5KB | ~83% |
| API JSON 响应 | ~10KB | ~2KB | ~80% |

### 测试方法

```bash
pnpm dev

# 检查 Content-Encoding 头
curl -H "Accept-Encoding: gzip" -I http://localhost:3000 2>&1 | grep content-encoding
# 预期：content-encoding: gzip

# 或在浏览器 DevTools → Network → 任意请求 → Response Headers 中查看
```

---

## 7. `productionBrowserSourceMaps` — 禁止生产环境 Source Map

### 目的

Source Map 在生产环境会暴露源码路径、结构甚至敏感注释，应关闭。仅在线上紧急调试时临时开启。

### 测试方法

```bash
pnpm build

# 检查 .next/static/chunks/ 下是否存在 .map 文件
ls .next/static/chunks/*.map 2>/dev/null
# 预期：无 .map 文件（No such file or directory）
```

---

## 8. `reactStrictMode` — React 严格模式

### 目的

开发模式下的额外检查机制：

- 组件函数/constructor/render 会被**额外调用一次**，检测副作用
- 检测过时的 API（如 `componentWillMount`）
- 为未来的 React 特性做准备（如可中断渲染）

App Router 从 Next.js 13.5.1 起默认开启，此处显式声明。

### 测试方法

```bash
pnpm dev

# 在浏览器控制台中观察
# Strict Mode 下，useEffect 会执行两次（仅开发模式）
# 如果看到两次相同的 console.log，说明 Strict Mode 生效
```

---

## 9. `logging.fetches.fullUrl` — 开发日志

### 目的

开发时在终端打印完整的 `fetch` URL，方便调试 API 调用。

### 测试方法

```bash
pnpm dev

# 访问页面，触发 fetch 请求（如切换会话加载历史）
# 终端应输出类似：
# GET http://localhost:3000/api/systemprompt 200 in 3ms
```

---

## 快速验证清单

运行以下命令进行全量验证：

```bash
# 1. 类型检查
pnpm exec tsc --noEmit

# 2. 生产构建
pnpm build
# 预期：无报错，输出构建摘要

# 3. 检查构建产物大小
du -sh .next/static/chunks/
ls -lhS .next/static/chunks/*.js | head -10

# 4. 启动生产服务器
pnpm start &
sleep 2

# 5. 安全头检查
curl -sI http://localhost:3000 | grep -E 'x-frame|x-content|x-powered|x-dns|referrer|permissions'

# 6. Gzip 检查
curl -s -H "Accept-Encoding: gzip" -o /dev/null -w "%{size_download}" http://localhost:3000
echo " (gzip)"

# 7. 停止服务器
kill %1
```

所有项目通过即表示配置生效。

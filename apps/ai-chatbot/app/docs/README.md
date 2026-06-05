# AI Chatbot

基于 **Next.js 16 + React 19 + TypeScript** 构建的 AI 聊天应用，使用 **DeepSeek** 大语言模型提供流式对话能力。

## 项目介绍

这是一个功能完整的 AI 聊天机器人单页应用，支持：

- **流式对话** — 基于 Vercel AI SDK，实时流式渲染 AI 回复
- **Markdown 渲染** — AI 回复支持 Markdown 格式，含流式动画效果
- **6 个预设角色** — 每种角色拥有专属的系统提示，切换角色即可改变 AI 的回复风格：

| 角色 | 说明 |
|------|------|
| 资深专业主厨 | 烹饪指导，含食材清单、步骤详解 |
| 资深开发工程师 | 编程问答、技术方案、代码示例 |
| 古典诗人 | 古诗词创作，押韵讲究 |
| 心理咨询师 | 共情倾听，CBT 与正念引导 |
| 风水命理师 | 风水、命理、运势分析 |
| 周公解梦 | 梦境解析（荣格心理学 + 传统解梦） |

- **温度调节** — 滑块控制 AI 回复的随机性（0 ~ 1，步长 0.01）
- **语音输入** — 支持语音转文字输入
- **亮色 / 暗色主题** — 一键切换，偏好自动持久化到本地存储
- **复制与重新生成** — 每条 AI 回复支持一键复制和重新生成
- **错误处理** — 网络异常或 API 出错时显示可关闭的提示卡片，支持重试

### 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router)、React 19 |
| 语言 | TypeScript |
| AI SDK | Vercel AI SDK (`ai` + `@ai-sdk/deepseek` + `@ai-sdk/react`) |
| 大语言模型 | DeepSeek (`deepseek-chat`) |
| UI 组件库 | Ant Design 6 + `@ant-design/x` + `@ant-design/x-markdown` |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand v5 |

### 目录结构

```
apps/ai-chatbot/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # POST — AI 聊天流式接口
│   │   └── systemprompt/route.ts  # GET  — 获取预设系统提示
│   ├── components/
│   │   ├── ChatBubble.tsx         # 对话气泡列表
│   │   ├── ErrorCard.tsx          # 错误提示卡片
│   │   ├── InputTab.tsx           # 输入区域（文本、温度、系统提示）
│   │   ├── PromptCards.tsx        # 预设角色卡片
│   │   ├── SystemPromptItems.tsx  # 系统提示选择弹窗
│   │   └── WelcomeCard.tsx        # 欢迎页横幅
│   ├── hooks/
│   │   └── useFetchPrompts.ts     # 获取系统提示列表
│   ├── store/
│   │   ├── useChatInput.ts        # 输入状态
│   │   ├── useSystemprompt.ts     # 当前系统提示
│   │   └── useThemeStore.ts       # 主题（持久化）
│   ├── types/
│   │   ├── chatStatus.ts          # 聊天状态常量
│   │   └── systemPromptType.ts    # 类型定义
│   ├── globals.css                # 全局样式 + 主题变量
│   ├── layout.tsx                 # 根布局
│   └── page.tsx                   # 主页面
├── public/                        # 静态资源（角色图标 SVG）
├── package.json
└── .env                           # 环境变量
```

## 启动方法

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 安装依赖

项目位于 monorepo 中，从仓库根目录安装所有依赖：

```bash
cd d:/AI-learning
npm install
```

### 配置环境变量

在 `apps/ai-chatbot/` 目录下创建 `.env` 文件（参考下方 [环境变量](#环境变量) 章节）。

### 启动开发服务器

```bash
# 从 monorepo 根目录启动
npm run dev -w apps/ai-chatbot

# 或直接从子项目启动
cd apps/ai-chatbot
npm run dev
```

启动后访问 **http://localhost:3000** 即可使用。

### 构建生产版本

```bash
npm run build -w apps/ai-chatbot
npm run start -w apps/ai-chatbot
```

## 环境变量

在 `apps/ai-chatbot/.env` 中配置以下变量：

```bash
# DeepSeek API Key（必填）
# 获取地址：https://platform.deepseek.com/api_keys
DEEPSEEK_API_KEY=sk-your-api-key-here
```

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | 是 | DeepSeek 开放平台的 API 密钥，用于调用 `deepseek-chat` 模型 |

> `.env` 文件已被 `.gitignore` 忽略，不会被提交到版本控制。

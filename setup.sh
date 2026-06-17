#!/usr/bin/env bash
#
# setup.sh — AI Learning 项目一键安装脚本
#
# 用法:
#   bash setup.sh          # 交互式安装
#   bash setup.sh --ci     # CI / 非交互式安装

set -euo pipefail

# ── 颜色 ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── 参数 ──────────────────────────────────────────────────
CI_MODE=false
if [[ "${1:-}" == "--ci" ]]; then
  CI_MODE=true
fi

# ── 工具函数 ──────────────────────────────────────────────
log()  { printf "${GREEN}[✓]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[!]${NC} %s\n" "$*"; }
err()  { printf "${RED}[✗]${NC} %s\n" "$*"; }
info() { printf "${BLUE}[i]${NC} %s\n" "$*"; }
step() { printf "\n${CYAN}▶ %s${NC}\n" "$*"; }

# ── 标题 ──────────────────────────────────────────────────
echo ""
printf "${CYAN}╔══════════════════════════════════════╗${NC}\n"
printf "${CYAN}║   AI Learning — 项目初始化安装       ║${NC}\n"
printf "${CYAN}╚══════════════════════════════════════╝${NC}\n"
echo ""

# ── Step 1: 检查 Node.js ─────────────────────────────────
step "1/6  检查 Node.js 环境"

if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v)
  log "Node.js 已安装: ${NODE_VERSION}"
else
  err "未检测到 Node.js，请先安装 Node.js >= 18"
  echo "  下载地址: https://nodejs.org/"
  echo "  推荐使用 fnm / nvm 管理 Node 版本:"
  echo "    fnm:  https://github.com/Schniz/fnm"
  echo "    nvm:  https://github.com/nvm-sh/nvm"
  exit 1
fi

# ── Step 2: 检查 / 安装 pnpm ──────────────────────────────
step "2/6  检查 pnpm 包管理器"

# 要求的 pnpm 版本（与 package.json 中 packageManager 字段一致）
REQUIRED_PNPM_VERSION="10.32.1"

if command -v pnpm &>/dev/null; then
  PNPM_VERSION=$(pnpm -v)
  log "pnpm 已安装: ${PNPM_VERSION}"
else
  warn "未检测到 pnpm，正在通过 corepack 安装..."
  if command -v corepack &>/dev/null; then
    corepack enable
    corepack prepare pnpm@${REQUIRED_PNPM_VERSION} --activate
    log "pnpm ${REQUIRED_PNPM_VERSION} 安装完成"
  else
    err "未找到 corepack，请确保 Node.js 版本 >= 16.13"
    exit 1
  fi
fi

# ── Step 3: 安装依赖 ─────────────────────────────────────
step "3/6  安装项目依赖"

if [ -f "pnpm-lock.yaml" ]; then
  info "检测到 pnpm-lock.yaml，使用 pnpm install --frozen-lockfile 确保一致性"
  pnpm install --frozen-lockfile
else
  info "首次安装，生成 lockfile..."
  pnpm install
fi
log "依赖安装完成"

# ── Step 4: 配置环境变量 ─────────────────────────────────
step "4/6  配置环境变量"

ENV_FILE="apps/ai-chatbot/.env"
ENV_EXAMPLE="apps/ai-chatbot/.env.example"

if [ -f "$ENV_FILE" ]; then
  log "已存在 .env 文件，跳过创建"
else
  if [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    log "已从 .env.example 复制到 .env"
  else
    cat > "$ENV_FILE" << 'EOF'
# DeepSeek API Key — 从 https://platform.deepseek.com/api_keys 获取
DEEPSEEK_API_KEY=your_api_key_here
EOF
    log "已创建默认 .env 文件"
    warn "请编辑 apps/ai-chatbot/.env 填入你的 DEEPSEEK_API_KEY"
  fi
fi

# ── Step 5: 初始化 Git Hooks ─────────────────────────────
step "5/6  初始化 Git Hooks"

if [ -d ".git" ]; then
  pnpm prepare
  log "Git hooks (husky) 初始化完成"
else
  warn "未检测到 .git 目录，跳过 git hooks 初始化"
fi

# ── Step 6: 验证安装 ─────────────────────────────────────
step "6/6  验证安装"

# 检查 TypeScript 编译
info "检查 TypeScript 编译..."
if npx tsc --noEmit 2>/dev/null; then
  log "TypeScript 编译通过"
else
  warn "TypeScript 编译有警告（可能不影响运行）"
fi

echo ""
printf "${GREEN}╔══════════════════════════════════════╗${NC}\n"
printf "${GREEN}║   🎉 安装完成！                     ║${NC}\n"
printf "${GREEN}╚══════════════════════════════════════╝${NC}\n"
echo ""
echo "  快速开始:"
echo ""
echo "    cd apps/ai-chatbot"
echo "    pnpm dev          # 启动开发服务器 → http://localhost:3000"
echo ""
echo "  其他命令:"
echo ""
echo "    pnpm build        # 构建生产版本"
echo "    pnpm lint         # 运行 ESLint 检查"
echo "    pnpm start        # 启动生产服务器"
echo ""

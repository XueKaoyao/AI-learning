# Next.js 接口报错排查步骤

当页面请求返回 500 或控制台出现 `fetch failed` 时，先打开终端查看服务端完整堆栈。

确认环境变量是否加载（例如 API Key、数据库连接串），并检查对应的 Route Handler 是否抛出未捕获异常。

开发模式下可在 `next.config` 中打开 `logging.fetches.fullUrl`，核对实际请求路径。改完代码后重启 `next dev`，再复现一次请求以验证是否修复。

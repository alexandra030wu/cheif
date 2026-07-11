@AGENTS.md

## 交付前必做检查（每次功能开发完成后执行）

### 1. Schema 一致性
- 所有新增/修改的 Zod schema 字段，除非有绝对理由，默认标记 .optional()
- 前端发送的请求体 vs 后端 schema：字段名、类型、必填/可选 必须完全匹配
- 新增字段在所有调用方都有 fallback/默认值处理（?? null, ?? [], ?? {} 等）

### 2. LLM 输出约束
- 对 AI 生成内容的 Zod schema，所有字段用 .optional()（LLM 输出不可靠，硬约束会导致整个请求失败）
- Prompt 中用文字要求提供这些字段（软约束），但 schema 不强制

### 3. 编译检查
- npx tsc --noEmit 通过，0 error

### 4. 集成测试
- 本地 npm run dev 启动
- 手动或 curl 测试核心流程：发消息 → 生成菜谱 → 收藏 → 食材操作
- 确认不影响已有功能（回归测试）

### 5. 环境兼容
- .env.local 中的代理变量（HTTPS_PROXY）不影响功能（代理不可用时 graceful fallback）
- 新增环境变量需在 CLAUDE.md 中记录
- 列出所有需要执行的 migration 文件

### 6. 提交规范
- 按功能拆分 commit，不混提
- commit message 格式：feat/fix/refactor: 中文描述
- push 前确认所有改动已 add

## 环境变量清单（Vercel）

| 变量 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 连接 |
| `SUPABASE_SERVICE_ROLE_KEY` | admin client（封面上传、DanOS 端点） |
| `ANTHROPIC_API_KEY` | Claude（默认 provider） |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` | DeepSeek 可选 provider |
| `GOOGLE_API_KEY` 或 `GEMINI_API_KEY` | Imagen 封面/图标生成 |
| `AI_PROVIDER` | 默认 provider id（可被用户设置覆盖） |
| `DANOS_API_TOKEN` | DanOS 桌面端拉菜谱卡的 Bearer token（自生成随机长串） |
| `DANOS_USER_ID` | 上述 token 绑定的 Supabase user uuid（个人账号） |

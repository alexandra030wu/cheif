# Cheif — 智能厨房助手 PRD

> 最后更新：2026-03-30

---

## 1. 项目概述

Cheif 是一款面向个人用户的智能厨房管理应用。用户可以管理冰箱中的食材库存，并基于现有食材通过 AI 自动生成菜谱。

### 核心价值

- **食材管理**：记录家中食材，追踪保质期，减少浪费
- **AI 智能录入**：通过自然语言或语音快速批量录入食材
- **AI 菜谱生成**：根据已有食材自动推荐菜谱，流式输出

### 目标用户

个人/家庭用户，希望高效管理厨房食材并获取烹饪灵感。

---

## 2. 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js (App Router) | 16.2.1 |
| UI 层 | React | 19.2.4 |
| 语言 | TypeScript | 5.x |
| 样式 | Tailwind CSS | 4.x |
| 后端/数据库 | Supabase (PostgreSQL + Auth + RLS) | — |
| Supabase SDK | @supabase/ssr | 0.9.0 |
| AI SDK | Vercel AI SDK (ai) | 6.0.141 |
| AI 提供商 | @ai-sdk/openai, @ai-sdk/anthropic | 3.x |
| Schema 验证 | Zod | 4.3.6 |
| 客户端状态 | Zustand | 5.0.12 |
| 构建工具 | Turbopack | 内置于 Next.js 16 |

### 环境变量

| 变量 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `AI_PROVIDER` | AI 提供商选择 (`openai` / `anthropic` / `ollama`) |
| `OPENAI_API_KEY` | OpenAI API 密钥 |
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 |
| `OLLAMA_BASE_URL` | Ollama 服务地址（默认 `http://localhost:11434/v1`） |
| `HTTPS_PROXY` | HTTP 代理地址（可选，用于 Anthropic） |

---

## 3. 已完成功能

### 3.1 用户认证

**路由：** `/login`、`/signup`、`/callback`

- 邮箱 + 密码注册和登录，基于 Supabase Auth
- Server Actions (`login` / `signup` / `logout`) 处理认证逻辑
- `useActionState` 管理表单状态，显示加载态和错误信息
- 登录/注册成功后 `redirect("/kitchen")`
- OAuth 回调路由 (`/callback`) 支持第三方登录扩展

**认证守卫（双重保护）：**

1. **Proxy 层**（`src/proxy.ts`）：拦截所有请求，未登录用户访问受保护路由重定向到 `/login`，已登录用户访问 auth 页面重定向到 `/kitchen`
2. **Layout 层**（Dashboard Layout）：服务端 `getUser()` 检查，未登录 `redirect("/login")`

**侧边栏：** 底部显示当前用户邮箱 + 退出登录按钮。

### 3.2 食材管理

**路由：** `/kitchen`、`/kitchen/add`

#### 食材列表页 (`/kitchen`)

- 服务端组件，直接查询 Supabase `ingredients` 表
- 按 `created_at` 倒序展示
- 每条食材显示：分类标签（彩色 badge）、名称、数量+单位、保质期
- 保质期状态：正常（灰色）、3 天内过期（橙色）、已过期（红色）
- 支持单条删除（`deleteIngredient` Server Action）
- 空状态引导

#### 手动录入 (`/kitchen/add` → 手动录入 Tab)

- 表单字段：食材名称*、分类*、数量、单位、保质期
- 分类枚举：蔬菜、水果、蛋白质、乳制品、谷物、香料、调味品、其他
- Zod Schema 验证（`IngredientFormSchema`）
- `addIngredient` Server Action，成功后跳转回列表

#### 智能录入 (`/kitchen/add` → 智能录入 Tab)

- 文本输入框 + 语音输入（Web Speech API，支持中文）
- 调用 `/api/ingredients/parse` 接口，AI 解析自然语言为结构化食材数据
- 解析结果以可编辑表格展示（名称、数量、单位、分类均可修改）
- 支持删除单条解析结果
- 确认后调用 `bulkAddIngredients` 批量保存

### 3.3 AI 菜谱生成

**路由：** `/recipes/generate`

- 服务端获取当前用户食材列表，传入客户端组件
- 展示当前食材库摘要（标签云形式）
- 点击生成按钮，POST `/api/recipes/generate`
- 流式输出（`ReadableStream`），逐字展示生成结果
- 带光标动画的打字机效果
- 错误处理 + 空食材库引导

### 3.4 食材分析

**API：** `POST /api/recipes/analyze`

- 输入食材名称，返回 AI 分析结果
- 输出：分类、保质期天数、储存建议、常见搭配、替代品
- 使用 `generateObject` + `IngredientInfoSchema` 结构化输出

---

## 4. 数据库结构

所有表均启用 Row Level Security (RLS)。

### 4.1 profiles

用户档案，注册时自动创建（trigger `on_auth_user_created`）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (PK) | 关联 `auth.users(id)`，级联删除 |
| display_name | text | 显示名称 |
| avatar_url | text | 头像 URL |
| dietary_restrictions | text[] | 饮食限制 |
| preferred_cuisine | text[] | 偏好菜系 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

**RLS 策略：** 用户只能查看和更新自己的档案。

### 4.2 ingredients

食材库存。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (PK) | 自动生成 |
| user_id | uuid (FK → auth.users) | 所属用户，级联删除，NOT NULL |
| name | text | 食材名称，NOT NULL |
| category | text | 分类，NOT NULL |
| quantity | numeric | 数量 |
| unit | text | 单位 |
| expiry_date | date | 保质期 |
| notes | text | 备注 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

**索引：** `user_id`、`category`、`expiry_date`

**RLS 策略：** `auth.uid() = user_id`，用户只能管理自己的食材（SELECT / INSERT / UPDATE / DELETE）。

### 4.3 recipes

AI 生成的菜谱。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (PK) | 自动生成 |
| title | text | 菜谱标题，NOT NULL |
| description | text | 描述 |
| cuisine | text | 菜系 |
| servings | integer | 份数 |
| prep_time_minutes | integer | 准备时间（分钟） |
| cook_time_minutes | integer | 烹饪时间（分钟） |
| difficulty | text | 难度 (`easy` / `medium` / `hard`) |
| ingredients | jsonb | 食材列表（结构化），NOT NULL |
| steps | jsonb | 步骤列表（结构化），NOT NULL |
| nutrition_estimate | jsonb | 营养估算 |
| tags | text[] | 标签 |
| generated_by | text | 生成该菜谱的 AI 提供商 |
| created_by | uuid (FK → auth.users) | 创建者 |
| created_at | timestamptz | 创建时间 |

**索引：** `created_by`、`tags`（GIN）

**RLS 策略：** 所有认证用户可查看；只有创建者可插入。

### 4.4 saved_recipes

用户收藏的菜谱。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (PK) | 自动生成 |
| user_id | uuid (FK → auth.users) | 所属用户，级联删除，NOT NULL |
| recipe_id | uuid (FK → recipes) | 菜谱 ID，级联删除，NOT NULL |
| saved_at | timestamptz | 收藏时间 |

**唯一约束：** `(user_id, recipe_id)`

**RLS 策略：** `auth.uid() = user_id`，用户只能管理自己的收藏。

---

## 5. API 接口

### 5.1 `POST /api/ingredients/parse`

AI 智能解析自然语言中的食材信息。

**请求体：**
```json
{ "text": "鸡胸肉500克、西红柿3个、盐一袋" }
```

**响应：**
```json
{
  "items": [
    { "name": "鸡胸肉", "quantity": 500, "unit": "克", "category": "protein" },
    { "name": "西红柿", "quantity": 3, "unit": "个", "category": "vegetable" },
    { "name": "盐", "quantity": 1, "unit": "袋", "category": "condiment" }
  ]
}
```

**实现：** `generateObject` + Zod Schema，temperature 0.2。

### 5.2 `POST /api/recipes/generate`

根据食材生成菜谱（流式输出）。

**请求体：**
```json
{
  "ingredients": ["鸡胸肉", "西红柿", "盐"],
  "cuisine": "中式",
  "servings": 2,
  "difficulty": "easy"
}
```

**响应：** `Content-Type: text/plain; charset=utf-8`，流式文本。

**验证：** `RecipeGenerationRequestSchema`（Zod），至少 1 种食材。

### 5.3 `POST /api/recipes/analyze`

分析单个食材的详细信息。

**请求体：**
```json
{ "name": "鸡胸肉", "description": "冷冻的" }
```

**响应：**
```json
{
  "name": "鸡胸肉",
  "category": "protein",
  "shelfLifeDays": 180,
  "storageTip": "冷冻保存，解冻后尽快食用",
  "commonPairings": ["西兰花", "蘑菇", "青椒"],
  "substitutes": ["鸡腿肉", "猪里脊", "豆腐"]
}
```

---

## 6. AI 抽象层设计

位于 `src/lib/ai-service/`，统一封装多个 LLM 提供商。

### 架构

```
src/lib/ai-service/
├── types.ts          # AIService 接口 + Zod Schema + 领域类型
├── registry.ts       # 提供商注册表 + 模型实例化
├── index.ts          # createAIService() 工厂 + getAIService() 单例
└── prompts/
    ├── recipe-generation.ts     # 菜谱生成 prompt 模板
    └── ingredient-analysis.ts   # 食材分析 prompt 模板
```

### AIService 接口

```typescript
interface AIService {
  generateRecipe(input: RecipeGenerationInput): Promise<Recipe>;
  streamRecipe(input: RecipeGenerationInput): Promise<ReadableStream<string>>;
  analyzeIngredient(input: IngredientAnalysisInput): Promise<IngredientInfo>;
  getProvider(): AIProviderID;
}
```

### 支持的提供商

| 提供商 | 默认模型 | 说明 |
|--------|----------|------|
| OpenAI | gpt-4o | 通过 `@ai-sdk/openai` |
| Anthropic | claude-sonnet-4-20250514 | 通过 `@ai-sdk/anthropic`，支持 HTTPS 代理 |
| Ollama | llama3 | 复用 OpenAI 兼容 API，本地部署 |

### 切换方式

设置环境变量 `AI_PROVIDER=openai|anthropic|ollama` 即可切换，无需修改代码。也可通过 `createAIService({ id: "anthropic", model: "..." })` 在代码中覆盖配置。

### 结构化输出

- **菜谱生成**：`generateObject` + `RecipeSchema`（标题、食材、步骤、营养等）
- **菜谱流式**：`streamText` 返回 `ReadableStream`
- **食材分析**：`generateObject` + `IngredientInfoSchema`（分类、保质期、搭配等）
- **食材解析**：`generateObject` + `ParsedIngredientListSchema`

---

## 7. 待开发功能

### 7.1 菜谱保存与管理

- 将 AI 生成的菜谱结构化保存到 `recipes` 表
- 菜谱收藏功能（利用已有的 `saved_recipes` 表）
- 菜谱列表页 `/recipes` 展示已保存/收藏的菜谱
- 菜谱详情页

### 7.2 菜谱生成增强

- 支持指定菜系、份数、难度、烹饪时间等参数（Schema 已就绪）
- 饮食限制过滤（素食、无麸质等）
- 自由备注输入
- 生成结果从纯文本流改为结构化卡片展示

### 7.3 食材管理增强

- 食材编辑功能（目前只有新增和删除）
- 按分类筛选和搜索
- 保质期提醒通知
- 食材用量扣减（做菜后自动减少库存）

### 7.4 用户档案

- 个人设置页面（利用已有的 `profiles` 表）
- 饮食偏好设置（影响菜谱生成）
- 偏好菜系设置

### 7.5 社交功能

- 菜谱分享（公开/私密）
- 浏览其他用户的公开菜谱（RLS 已支持认证用户可读所有菜谱）

### 7.6 移动端适配

- 响应式布局优化
- PWA 支持
- 移动端语音输入体验优化

---

## 8. 项目结构

```
src/
├── app/
│   ├── (auth)/                  # 认证路由组
│   │   ├── actions.ts           # login / signup / logout Server Actions
│   │   ├── login/page.tsx       # 登录页
│   │   ├── signup/page.tsx      # 注册页
│   │   └── callback/route.ts    # OAuth 回调
│   ├── (dashboard)/             # 受保护的主应用路由组
│   │   ├── layout.tsx           # 侧边栏布局 + 认证守卫
│   │   ├── _components/         # Dashboard 共享组件
│   │   ├── kitchen/             # 食材管理
│   │   │   ├── page.tsx         # 食材列表
│   │   │   ├── actions.ts       # CRUD Server Actions
│   │   │   ├── add/page.tsx     # 添加食材
│   │   │   └── _components/     # 表单、智能输入、删除按钮
│   │   └── recipes/             # 菜谱
│   │       ├── page.tsx         # 菜谱列表（待完善）
│   │       └── generate/        # AI 菜谱生成
│   ├── api/                     # API 路由
│   │   ├── ingredients/parse/   # 食材智能解析
│   │   └── recipes/             # 菜谱生成 + 食材分析
│   ├── layout.tsx               # 根布局
│   └── page.tsx                 # 首页（重定向到 /kitchen）
├── lib/
│   ├── ai-service/              # AI 抽象层
│   ├── supabase/                # Supabase 客户端（browser / server / types）
│   ├── validators/              # Zod 验证 Schema
│   └── utils.ts                 # 工具函数
├── stores/                      # Zustand 状态管理
├── components/                  # 全局共享组件
└── proxy.ts                     # Next.js 16 Proxy（原 Middleware）
```

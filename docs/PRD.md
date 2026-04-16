# Cheif — 智能厨房助手 PRD

> 最后更新：2026-04-03

---

## 1. 项目概述

Cheif 是一款面向个人用户的智能厨房管理应用。以 AI 对话式界面为核心入口，用户可以管理冰箱中的食材库存，通过对话获取基于现有食材的智能菜谱推荐，并在沉浸式 Cooking Mode 中跟随步骤完成烹饪。

### 核心价值

- **AI 对话式菜谱推荐**：基于用户食材库存、饮食偏好、时段智能推荐 2-3 道菜谱，结构化卡片展示
- **食材管理**：Grid 网格展示食材，AI 生成食材图标，追踪保质期，临期食材优先推荐
- **Cooking Mode**：沉浸式分步做菜模式，语音朗读 + 计时器，适合湿手操作
- **AI 智能录入**：通过自然语言或语音快速批量录入食材
- **个性化**：用户偏好（饮食限制、过敏原、厨艺水平、厨具）融入 AI 推荐

### 目标用户

个人/家庭用户，希望高效管理厨房食材并获取个性化烹饪灵感。

---

## 2. 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js (App Router) | 16.2.1 |
| UI 层 | React | 19.2.4 |
| 语言 | TypeScript | 5.x |
| 样式 | Tailwind CSS | 4.x |
| 后端/数据库 | Supabase (PostgreSQL + Auth + RLS + Storage) | — |
| Supabase SDK | @supabase/ssr | 0.9.0 |
| AI SDK | Vercel AI SDK (ai) | 6.0.141 |
| AI 提供商（菜谱） | @ai-sdk/openai, @ai-sdk/anthropic | 3.x |
| AI 提供商（图像） | Google Gemini Imagen 4.0 Fast | REST API |
| Schema 验证 | Zod | 4.3.6 |
| 客户端状态 | Zustand（persist 中间件） | 5.0.12 |
| 构建工具 | Turbopack | 内置于 Next.js 16 |

### 环境变量

| 变量 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端管理密钥（图标/封面上传） |
| `AI_PROVIDER` | AI 提供商选择 (`openai` / `anthropic` / `ollama`) |
| `OPENAI_API_KEY` | OpenAI API 密钥 |
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 |
| `OLLAMA_BASE_URL` | Ollama 服务地址（默认 `http://localhost:11434/v1`） |
| `GEMINI_API_KEY` | Google Gemini API 密钥（Imagen 图像生成） |
| `HTTPS_PROXY` | HTTP 代理地址（可选，用于 Anthropic） |

---

## 3. 已完成功能

### 3.1 用户认证

**路由：** `/login`、`/signup`、`/callback`

- 邮箱 + 密码注册和登录，基于 Supabase Auth
- Server Actions (`login` / `signup` / `logout`) 处理认证逻辑
- `useActionState` 管理表单状态，显示加载态和错误信息
- 登录/注册成功后 `redirect("/chat")`
- OAuth 回调路由 (`/callback`) 支持第三方登录扩展

**认证守卫（双重保护）：**

1. **Proxy 层**（`src/proxy.ts`）：拦截所有请求，未登录用户 → `/login`，已登录用户访问 auth 页面 → `/chat`
2. **Layout 层**（Dashboard Layout）：服务端 `getUser()` 检查，未登录 `redirect("/login")`

**导航：** 左上角汉堡菜单（滑出抽屉），包含聊天、食材库、菜谱、个人设置 + 用户邮箱 + 退出登录。

### 3.2 AI 对话式首页

**路由：** `/chat`（应用主入口，`/` 重定向至此）

#### 对话界面

- 顶部标题栏「🍳 Cheif」+ 「清空对话」按钮
- 中间消息区：用户消息右对齐深色气泡，AI 消息左对齐 + 结构化菜谱卡片
- 底部输入框：自动伸缩 textarea + 发送按钮，safe-area 适配
- 加载动画：三点跳动 + 「正在翻菜谱…」

#### 时段提示词卡片

- 初始状态（无消息时）显示欢迎页 + 可点击提示词
- 根据时段自动切换：早餐（5-10点）/ 午餐（11-14点）/ 晚餐（15-20点）/ 夜宵
- 通用提示词：「惊喜菜谱」「HOT 热门菜」「健身餐」「快手10分钟」
- 点击自动作为用户消息发送

#### 意图分类 + 流式响应

**意图分类（关键词规则，零延迟）：**
- **recipe 意图**：消息包含"做/吃/菜/推荐/饿了/来个/快手"等烹饪关键词
- **chat 意图**：其他所有消息（问好/闲聊/烹饪知识/情绪表达）

**流式输出（SSE `text/event-stream`）：**
- `text` 事件：逐块文字流式追加（用户立刻看到回复，无需等 15-30 秒）
- `recipes` 事件：完整菜谱 JSON 一次性发送
- `[DONE]`：流结束信号
- chat 意图只发 text 事件；recipe 意图先发 text 再发 recipes

**recipe 意图流程（两阶段）：**
1. `streamText` 流式生成蛋厨过渡回复（"看到你冰箱有XX…"），1-3 秒出字
2. `generateObject` 生成结构化菜谱（10-20 秒，但用户已在看文字）

**chat 意图流程：**
- `streamText` 直接流式回复，蛋厨人设保持
- 可回答烹饪知识、共情用户情绪、适度引导回烹饪话题

#### AI 菜谱响应（蛋厨 Prompt 系统）

- **蛋厨人设（dan.chef）**：温暖有个性的烹饪助手，说话自然、有趣、偶尔调皮
- 返回 2-3 道结构化菜谱卡片，风格差异化（快手 + 稍复杂 + 创意）
- 每张卡片：封面图（AI 生成或渐变占位）、菜名、时间、难度 badge、食材摘要
- 临期食材标签：使用了临期食材的菜谱显示「🔥 消耗临期食材」徽章

**Prompt 注入内容：**
- 用户画像：昵称、厨艺水平、默认份数、饮食偏好、过敏原、常用厨具
- 食材列表：带数量/单位/过期状态标记（🔴🟠🟡），按过期紧急度排序，上限 30 种
- 口味画像：从 `taste_profile` 注入偏好/不喜欢的菜、菜系、食材、口味、风格
- 时段感知：早晨/中午/傍晚/深夜

**菜谱质量约束：**
- 食材用量精确到数值+单位，禁止"适量""少许"
- 每步有 `durationSeconds`（秒级计时）和感官指标描述
- 火候标注（大火爆炒/中小火焖煮/小火慢熬）
- 营养估算（calories/proteinG/carbsG/fatG）
- 新手模式（≤8步/≤10种食材/每步tip小贴士）

**对话智能：**
- 模糊请求 → 追问1个关键问题 + 同时给推荐
- 情绪感知 → 累了→快手菜，开心→仪式感，健身→高蛋白
- 非烹饪话题 → 友善引导回烹饪场景
- few-shot 示例（番茄炒蛋 + 红烧排骨）嵌入 prompt

#### 对话持久化

- Zustand `persist` 中间件缓存消息到 `localStorage`
- 页面切换/刷新后自动恢复对话记录
- 「清空对话」按钮重置

### 3.3 菜谱详情页

点击菜谱卡片打开全屏 Sheet：

- **封面图**：顶部全宽展示（移动端 h-48，桌面端 h-300px，object-cover）
- **透明导航栏**：有封面图时叠在图片上方，白色文字 + 渐变遮罩；无封面图保留白色导航
- **动态 theme-color**：打开时改为 #000000 融入封面图，关闭时恢复
- **内容区**：标题、描述、菜系/份数/时间/难度、标签、完整食材清单、分步骤说明（含💡小贴士）、营养估算（千卡/蛋白质g/碳水g/脂肪g）
- **底部操作栏**：「开始制作」（进入 Cooking Mode）+「收藏」按钮（成功后变绿色禁用态）

### 3.4 Cooking Mode（沉浸式做菜模式）

从菜谱详情页点击「开始制作」进入：

- **全屏深色界面**（`bg-gray-950`），z-index 60
- **进度条**：顶部白色进度条 + 当前步/总步数
- **步骤展示**：每步占满屏，圆形步骤编号 + 大字指令居中 + 💡小贴士（如有）
- **左右滑动 / 箭头按钮**切换上一步/下一步
- **计时器**：步骤有 `durationSeconds` 时自动显示倒计时按钮，支持开始/暂停/重置
- **语音朗读**：Web Speech Synthesis API，切换步骤自动中文朗读，计时结束语音提醒
- **完成烹饪**：最后一步显示「完成烹饪」全宽按钮，返回详情页
- **移动端优先**：大触摸区域（`py-4` 按钮），适合湿手操作

### 3.5 菜谱保存与收藏

**路由：** `/recipes`

- 收藏菜谱列表：左图右文横向卡片布局，封面缩略图/渐变占位 + 菜名/难度/时间/食材
- **搜索**：实时关键字过滤（标题+描述），带清除按钮
- **多维度筛选 Chip 标签栏**：
  - 菜系（动态从已收藏食谱提取，单选）
  - 难度（简单/中等/困难，单选）
  - 时间预设（15分钟内/30分钟内/1小时内，单选）
  - 标签（动态提取，多选 OR 逻辑）
  - 多维度之间 AND 叠加，搜索+筛选可组合
- 结果计数："找到 N 道食谱" / "共 N 道收藏菜谱"
- 无结果空状态 + "清除所有筛选"按钮
- 点击卡片打开详情 Sheet（复用聊天页组件，`alreadySaved` 模式）
- 支持删除收藏（`deleteSavedRecipe` Server Action，同时删除 recipes + saved_recipes 记录）
- 空状态引导去聊天页生成菜谱

### 3.6 菜谱封面图

- 收藏菜谱时自动调用 Gemini Imagen 生成封面（fire-and-forget）
- Prompt：`"A beautiful plated dish of [菜名], top-down food photography, natural lighting, white plate, restaurant quality, appetizing"`
- 存储到 Supabase Storage `recipe-covers` bucket
- 菜谱卡片顶部展示封面图，无图时显示渐变色占位

### 3.7 食材管理

**路由：** `/kitchen`、`/kitchen/add`

#### 食材库 Grid 网格展示 (`/kitchen`)

- **Grid 布局**：3 列手机 / 4 列 sm / 5 列 md
- **食材瓷砖**：AI 生成图标（64x64）或分类 emoji 回退 + 名称 + 数量/过期状态
- **搜索框**：实时关键字过滤
- **分类筛选标签栏**：全部/蔬菜/水果/蛋白质/乳制品/谷物/香料/调味品/其他，横向滚动
- **搜索 + 筛选叠加**，空结果友好提示 + 清除筛选按钮
- **保质期排序**：默认按保质期升序，最紧急排最前，无保质期排最后
- **三级过期标记**：已过期（红色边框）、3 天内（橙色）、7 天内（黄色）
- **过期横幅**：有过期食材时顶部显示「⚠️ 你有 N 个食材已过期，建议尽快处理」
- **批量管理模式**：右上角「管理」按钮进入，卡片出现圆形勾选框，底部固定操作栏（全选/取消全选 + 已选计数 + 删除），勾选时卡片高亮+缩放反馈，删除需 inline 确认
- **点击查看详情**：底部 Sheet（90vh），包含：
  - 大图展示（160×160 圆角卡片，AI 图标或 emoji 回退）
  - 名称（大字）+ 分类·数量·过期状态色标（红/橙/黄/绿/灰）
  - 详情字段（数量/分类/保质期），只读展示
  - 编辑模式：点击「编辑」按钮切换为表单
  - 删除功能：inline 确认弹窗（"确定要删除「番茄」吗？此操作不可撤销"），不删共享图标

#### AI 食材图标（共享图标库）

- **全局共享库**：同名食材只生成一次图标，所有用户共享（节省 90%+ API 调用）
- 添加食材时先查 `ingredient_icons` 表 → 命中直接用（0 API 调用） → 未命中生成并缓存
- 食材名称标准化（`normalizeIngredientName`：去空格/括号/统一小写）用于去重
- Prompt：`"A realistic food icon of exactly [名称], on a pure white background, centered, no text, no shadow, product photography style, high definition"`
- 存储到 Supabase Storage `ingredient-icons` bucket，文件名用标准化食材名（如 `番茄.webp`）
- 无图标时用分类 emoji 回退（🥬🍎🥩🧀🌾🧂🫙📦）

#### 食材录入系统 (`/kitchen/add`)

**模式选择入口**（2×2 卡片网格）：
- 📝 手动输入 — 安静环境，一个个添加
- 🎤 语音添加（推荐） — 说出食材，实时识别
- 📷 拍照识别 — 即将推出（灰显）
- 📹 视频录入 — 即将推出（灰显）

**手动模式：**
- 表单字段：食材名称*、分类*、数量、单位、保质期
- 连续添加模式：成功后清空表单不跳转，显示"已添加 N 个"计数器
- `addIngredient` Server Action，入库时按名称去重合并（累加数量 + 取较晚保质期）

**语音模式（实时识别）：**
- 进入自动开麦（Web Speech API，zh-CN，continuous 模式）
- 顶部紧凑 Mic 状态区（🔴脉冲=录音中 / ⚪=停止）+ 单行实时转写
- 主区域：统一食材确认列表（边说边出现）
- 每个识别片段实时 POST 到 `/api/ingredients/parse-voice`（带当前列表上下文）
- AI 智能意图检测：添加（"鸡蛋三个"）/ 修改（"鸡蛋改成五个"）/ 删除（"牛奶不要了"）
- 保质期自动估算：用户说了日期直接解析，没说按分类默认天数（鸡蛋14天/鲜奶7天/肉类3天等）

**统一食材确认列表组件（`IngredientConfirmList`）：**
- 所有模式共享，checkbox + 名称/数量/单位/分类/保质期 可编辑 + 删除
- 底部"全部入库 (N)"按钮，只保存勾选项
- 入库去重合并：同名食材累加数量 + 取较晚保质期（`normalizeIngredientName` 标准化匹配）

### 3.8 食材分析

**API：** `POST /api/recipes/analyze`

- 输入食材名称，返回 AI 分析结果
- 输出：分类、保质期天数、储存建议、常见搭配、替代品

### 3.9 用户个人资料

**路由：** `/settings`

- **头像**：emoji 头像选择（12 种 emoji）
- **昵称**
- **默认人份**：1人食 / 2人食 / 一家三口 / 聚餐4-6人
- **饮食偏好**：多选（素食/清真/无麸质/低碳水/低脂/无乳糖）
- **过敏原**：多选（花生/坚果/海鲜/鸡蛋/牛奶/大豆/小麦/芝麻），AI 自动避开
- **厨艺水平**：单选（新手/进阶/大厨），AI 匹配难度
- **常用厨具**：多选（烤箱/空气炸锅/微波炉/电饭煲/面包机/搅拌机/蒸锅）
- 保存到 Supabase `profiles` 表（upsert）
- AI 菜谱生成时自动读取偏好并注入 prompt

#### 口味画像（蛋厨对你的了解）

- **被动学习**：每次对话后异步提取口味信号（用 cheap model：GPT-4o-mini / Claude Haiku）
- **行为学习**：收藏菜谱时自动生成 like_dish(0.6) + like_cuisine(0.5) + like_ingredient(0.4) 信号
- **主动设置**：Settings 页标签云 UI，支持手动添加/删除口味偏好
- **信号类型**：like/dislike_dish、like/dislike_cuisine、like/dislike_ingredient、like/dislike_flavor、cooking_style、dietary_goal
- **置信度分级**：显式表达=1.0、强烈暗示=0.8、收藏行为=0.4-0.6、推断=0.5
- **聚合算法**：按 (出现次数 × 平均置信度) 排序，取 Top N 写入 `profiles.taste_profile`
- **Prompt 注入**：偏好菜/菜系/食材/口味作为软约束，不喜欢的食材默认避免（过敏原=硬约束）
- **展示**：Settings 页分类标签云（菜品/菜系/食材/口味/风格/目标），支持删除 + 清空
- 学习进度显示："已学习 N 条信号"

### 3.10 PWA 支持

- `manifest.json`：应用名 Cheif，standalone 模式，深色主题 `#111827`
- PNG 图标（192x192 / 512x512）：🍳 emoji + 深色圆角背景
- Service Worker：导航请求 network-first，静态资源 cache-first，API/auth 不缓存
- iOS 主屏幕支持：`apple-touch-icon`、`appleWebApp` meta
- `viewport-fit=cover` + 全局 `safe-area-inset-top` padding 适配 PWA 全屏模式

### 3.11 性能优化

- 各页面 `loading.tsx` 骨架屏
- Suspense 流式渲染（header 即时，数据流式加载）
- `React.memo`（IngredientItem、RecipeCard、IngredientTag、MessageBubble）
- `React.lazy`（SmartInput 按需加载）
- `useMemo` / `useCallback` 避免不必要计算和重渲染
- `revalidatePath` 精准缓存失效

---

## 4. 数据库结构

所有表均启用 Row Level Security (RLS)。

### 4.1 profiles

用户档案，注册时自动创建（trigger `on_auth_user_created`）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (PK) | 关联 `auth.users(id)`，级联删除 |
| display_name | text | 显示名称 |
| avatar_url | text | 头像（emoji） |
| nickname | text | 昵称 |
| dietary_restrictions | text[] | 饮食限制（旧字段） |
| preferred_cuisine | text[] | 偏好菜系（旧字段） |
| dietary_preferences | jsonb | 饮食偏好（素食/清真/无麸质等） |
| allergies | text[] | 过敏原（花生/坚果/海鲜等） |
| cooking_level | text | 厨艺水平（beginner/intermediate/expert） |
| kitchen_equipment | text[] | 常用厨具 |
| default_servings | text | 默认人份 |
| taste_profile | jsonb | 口味画像（聚合后的偏好数据） |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 4.2 taste_signals

口味偏好原始信号日志，异步从对话和行为中提取。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (PK) | 自动生成 |
| user_id | uuid (FK → auth.users) | 所属用户，级联删除，NOT NULL |
| signal_type | text | 信号类型（like_dish/dislike_ingredient/cooking_style 等），NOT NULL |
| signal_value | text | 具体内容（如"红烧肉"、"辣"），NOT NULL |
| confidence | float | 置信度 0-1（默认 0.7） |
| source | text | 来源：chat/explicit/behavior（默认 chat） |
| context | text | 原始对话片段（≤50字），用于溯源 |
| created_at | timestamptz | 创建时间 |

### 4.3 ingredient_icons

共享食材图标库，同名食材只存一份图标。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (PK) | 自动生成 |
| name | text | 食材原始名称，NOT NULL |
| name_normalized | text | 标准化名称（去空格/括号/小写），UNIQUE |
| icon_url | text | Supabase Storage URL，NOT NULL |
| created_at | timestamptz | 创建时间 |

### 4.4 ingredients

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
| icon_url | text | AI 生成的食材图标 URL |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 4.5 recipes

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
| cover_image_url | text | AI 生成的菜品封面图 URL |
| generated_by | text | 生成该菜谱的 AI 提供商 |
| created_by | uuid (FK → auth.users) | 创建者 |
| created_at | timestamptz | 创建时间 |

### 4.6 saved_recipes

用户收藏的菜谱。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (PK) | 自动生成 |
| user_id | uuid (FK → auth.users) | 所属用户，级联删除，NOT NULL |
| recipe_id | uuid (FK → recipes) | 菜谱 ID，级联删除，NOT NULL |
| saved_at | timestamptz | 收藏时间 |

### 4.7 recipe_covers

共享菜谱封面库，同名菜谱（按归一化标题）只生成一次封面，所有用户共享。镜像 ingredient_icons 设计。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (PK) | 自动生成 |
| title | text | 菜谱原始标题，NOT NULL |
| title_normalized | text | 标准化标题（trim + lowercase + 去空格去括号），UNIQUE |
| cover_url | text | Supabase Storage URL（`shared-{sha256前16}.png`），NOT NULL |
| created_at | timestamptz | 创建时间 |

### 4.8 待执行 Migrations

| 文件 | 内容 |
|------|------|
| `00006_create_taste_signals.sql` | taste_signals 表 + RLS + profiles.taste_profile 字段 |
| `00007_create_ingredient_icons.sql` | ingredient_icons 共享表 + 迁移现有图标数据 |
| `00008_create_recipe_covers.sql` | recipe_covers 共享表 + 从 recipes.cover_image_url 回填 |

### 4.9 Supabase Storage Buckets

| Bucket | 公开 | 用途 |
|--------|------|------|
| `ingredient-icons` | 是 | 食材 AI 图标 PNG |
| `recipe-covers` | 是 | 菜谱封面图 PNG |

---

## 5. API 接口

### 5.1 `POST /api/chat`

AI 对话式菜谱推荐（主接口）。

**请求体：**
```json
{
  "message": "来点晚餐灵感",
  "ingredients": [
    { "name": "鸡胸肉", "quantity": 500, "unit": "克", "daysUntilExpiry": 3 },
    { "name": "西红柿", "quantity": 3, "unit": "个", "daysUntilExpiry": 1 }
  ],
  "timeOfDay": "evening",
  "preferences": {
    "nickname": "铁蛋",
    "dietary_preferences": ["低碳水"],
    "allergies": ["花生"],
    "cooking_level": "intermediate",
    "kitchen_equipment": ["烤箱", "空气炸锅"],
    "default_servings": "2人食"
  },
  "tasteProfile": { "liked_dishes": ["红烧肉"], "..." : "..." }
}
```

注：`ingredients` 兼容旧版 `string[]` 格式（自动转换为对象），`tasteProfile` 可选。

**响应（SSE 流 `text/event-stream`）：**
```
data: {"type":"text","content":"看到你冰箱有鸡胸肉和番茄，"}
data: {"type":"text","content":"给你推荐几道菜～"}
data: {"type":"recipes","recipes":[{"title":"番茄鸡胸肉","difficulty":"easy",...}]}
data: [DONE]
```

- chat 意图：只有 `text` 事件
- recipe 意图：`text` 事件（过渡文字）+ `recipes` 事件（完整菜谱 JSON）
- `error` 事件：AI 调用失败时发送错误信息

### 5.2 `POST /api/recipes/save`

收藏菜谱。自动触发封面图生成。

### 5.3 `POST /api/ingredients/parse`

AI 智能解析自然语言中的食材信息（批量文本解析）。

### 5.3.1 `POST /api/ingredients/parse-voice`

语音实时食材解析（带上下文意图检测）。

**请求体：**
```json
{
  "transcript": "鸡蛋三个牛奶不要了",
  "currentItems": [{"name":"牛奶","quantity":1,"unit":"盒"}]
}
```

**响应：**
```json
{
  "actions": [
    {"type":"add","name":"鸡蛋","quantity":3,"unit":"个","category":"protein","expiry_date":"2026-04-17"},
    {"type":"remove","name":"牛奶","matchName":"牛奶"}
  ]
}
```

### 5.4 `POST /api/recipes/generate`

根据食材生成菜谱（流式输出，旧接口，保留兼容）。

### 5.5 `POST /api/recipes/analyze`

分析单个食材的详细信息。

### 5.6 `POST /api/taste/extract`

异步提取对话中的口味偏好信号（由前端在每次对话后 fire-and-forget 调用）。

**请求体：**
```json
{ "conversation": "用户: 我喜欢吃辣\n助手: 好的..." }
```

**响应：**
```json
{ "extracted": 2 }
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
    ├── chat-recipe.ts           # 对话式菜谱 prompt（含用户偏好 + 临期食材）
    ├── chat-reply.ts            # 闲聊 prompt（蛋厨人设，无菜谱规则）
    └── ingredient-analysis.ts   # 食材分析 prompt 模板
```

### AIService 接口

```typescript
interface AIService {
  generateRecipe(input: RecipeGenerationInput): Promise<Recipe>;
  streamRecipe(input: RecipeGenerationInput): Promise<ReadableStream<string>>;
  analyzeIngredient(input: IngredientAnalysisInput): Promise<IngredientInfo>;
  generateChatRecipes(input: ChatRecipeInput): Promise<ChatResponse>;
  getProvider(): AIProviderID;
}
```

### 口味学习模块

```
src/lib/taste/
├── types.ts       # TasteProfile 接口 + TasteSignal Zod Schema + SignalType 枚举
├── extract.ts     # extractTasteSignals() — 用 cheap model 从对话提取信号
├── aggregate.ts   # aggregateTasteProfile() — 信号聚合 → profiles.taste_profile
└── index.ts       # barrel export
```

### 图像生成

`src/lib/icon-generation.ts`：

- `getOrCreateSharedIcon(ingredientId, name)` — 查共享库 → 命中返回 / 未命中生成+缓存
- `generateAndStoreIcon(ingredientId, name)` — 旧接口，已重定向到共享库流程
- `generateAndStoreCover(recipeId, dishName)` — 菜谱封面生成
- `normalizeIngredientName(name)` — 食材名称标准化（去空格/括号/小写）
- 共享 `generateImage()` 调用 Gemini Imagen 4.0 Fast API
- 使用 `src/lib/supabase/admin.ts`（service role client）上传 Storage

---

## 7. 待开发功能

### 7.1 菜谱生成增强

- 口味画像同义词映射（"西红柿"→"番茄"）

### 7.2 食材管理增强

- 食材用量扣减（做菜后自动减少库存）
- 保质期推送提醒通知

### 7.3 社交功能

- 菜谱分享（公开/私密）
- 浏览其他用户的公开菜谱（RLS 已支持认证用户可读所有菜谱）

### 7.4 口味学习增强

- 批量聚合（信号量 >100 时改为定时聚合）
- 时间衰减（以最近 30 天信号为主）
- 用户可在 Settings 页查看信号溯源（context 原文）

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
│   │   ├── layout.tsx           # 汉堡菜单布局 + 认证守卫 + safe-area
│   │   ├── _components/         # 汉堡菜单、退出按钮
│   │   ├── chat/                # AI 对话式首页
│   │   │   ├── page.tsx         # 聊天页（服务端获取食材+偏好）
│   │   │   ├── loading.tsx      # 骨架屏
│   │   │   └── _components/     # ChatInterface、PromptCards、RecipeCard、
│   │   │                        # MessageBubble、ChatInput、RecipeDetailSheet、
│   │   │                        # CookingMode
│   │   ├── kitchen/             # 食材管理
│   │   │   ├── page.tsx         # 食材 Grid 网格 + 批量管理
│   │   │   ├── loading.tsx      # 骨架屏
│   │   │   ├── actions.ts       # CRUD + 批量删除 + 去重合并入库
│   │   │   ├── add/page.tsx     # 添加食材（模式选择 → 手动/语音）
│   │   │   └── _components/     # IngredientItem、IngredientListClient、
│   │   │                        # EditIngredientSheet、AddForm、VoiceInput、
│   │   │                        # ModeSelector、IngredientConfirmList、constants
│   │   ├── recipes/             # 收藏菜谱
│   │   │   ├── page.tsx         # 收藏列表
│   │   │   ├── loading.tsx      # 骨架屏
│   │   │   ├── actions.ts       # deleteSavedRecipe
│   │   │   └── _components/     # SavedRecipeList、DeleteRecipeButton
│   │   └── settings/            # 个人设置
│   │       ├── page.tsx         # 设置页（含口味画像区域）
│   │       ├── actions.ts       # saveProfile
│   │       ├── taste-actions.ts # 口味信号 CRUD（addTasteSignal/delete/clearAll）
│   │       └── _components/     # SettingsForm、TasteProfileSection
│   ├── api/                     # API 路由
│   │   ├── chat/                # AI 对话（意图分类 + SSE 流式）
│   │   ├── taste/extract/       # 口味信号异步提取
│   │   ├── ingredients/
│   │   │   ├── parse/           # 食材文本批量解析
│   │   │   └── parse-voice/     # 语音实时解析（带意图检测）
│   │   └── recipes/             # 菜谱生成 + 分析 + 保存
│   ├── layout.tsx               # 根布局（PWA manifest + theme-color + SW）
│   └── page.tsx                 # 首页（重定向到 /chat）
├── lib/
│   ├── ai-service/              # AI 抽象层（types / registry / prompts）
│   ├── taste/                   # 口味学习模块（types / extract / aggregate）
│   ├── icon-generation.ts       # Gemini Imagen 图标/封面生成 + 共享图标库
│   ├── supabase/                # Supabase 客户端（browser / server / admin / types）
│   ├── validators/              # Zod 验证 Schema（chat / ingredient / recipe）
│   └── utils.ts                 # 工具函数（cn / formatDate）
├── stores/                      # Zustand 状态管理
│   ├── chat-store.ts            # 聊天消息持久化（localStorage）
│   ├── recipe-store.ts          # 菜谱状态
│   └── ingredient-store.ts      # 食材状态
├── components/                  # 全局共享组件
│   ├── providers.tsx            # Provider 包装
│   └── sw-register.tsx          # Service Worker 注册
├── proxy.ts                     # Next.js 16 Proxy（认证路由守卫）
└── public/
    ├── manifest.json            # PWA Manifest
    ├── sw.js                    # Service Worker
    ├── icon-192.png             # PWA 图标 192x192
    └── icon-512.png             # PWA 图标 512x512
```

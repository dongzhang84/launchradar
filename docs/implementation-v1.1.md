# LaunchRadar v1.1 — Onboarding Simplification & Instant Value

**Status**: 📋 Planning  
**Created**: March 20, 2026

---

## 背景与目标

**问题**：当前 onboarding 需要用户填写3步表单，等待 AI 生成关键词，审核并保存，然后回到空的 dashboard 等待第二天 cron 运行。用户从注册到看到第一个机会需要至少一天，体验极差。

**目标**：用户注册后，60秒内在 dashboard 看到真实机会。

---

## 改动范围

### Step 1 — 简化 Onboarding 页面

**文件**：`app/onboarding/page.tsx`

**改动**：
- 删除3步 wizard，改为单页单输入框
- 只保留 `productDescription` 字段，完全移除 `targetCustomer`
- UI 布局：
  - 标题：「What does your product do?」
  - 副标题：「We'll find Reddit & HN discussions where people need it.」
  - 一个大 textarea，placeholder：「e.g. A tool that helps indie hackers find their first customers by monitoring Reddit for people asking about growth and distribution」
  - 字符计数器（建议50-300字）
  - 按钮：「Start Scanning →」，disabled 如果输入少于20字
  - 按钮点击后变成 loading 状态：「Setting up your radar…」
- 移除所有 step indicator、keyword preview、subreddit preview
- 移除 Back 按钮

**点击「Start Scanning →」的流程**：
1. POST `/api/onboarding` `{ step: "save-and-scan", productDescription }`
2. API 返回 `{ success: true }` 后立刻跳转：`window.location.href = "/dashboard?scanning=true"`
3. 不等待 fetch 完成，异步在后台运行

---

### Step 2 — 更新 Keyword Generator

**文件**：`lib/keyword-generator.ts`

**改动**：
- 函数签名从 `generateKeywordsAndSubreddits(productDescription, targetCustomer)` 改为只接受 `generateKeywordsAndSubreddits(productDescription)`
- 更新 OpenAI prompt，去掉 target customer 相关内容，让 AI 从产品描述自行推断目标用户
- 新 prompt：

```
You are helping an indie hacker find their first customers on Reddit and Hacker News.

Product: {productDescription}

Based on this product, infer who the target customer is and generate:
1. 12-15 keywords/phrases that potential customers use when describing their PROBLEM
   (NOT solution keywords — focus on pain, frustration, struggle)
   Include phrases like: 'struggling with...', 'how do I...', 'overwhelmed by...', 'can't figure out...'

2. 8-10 subreddit names (without r/) where these customers hang out

Return JSON only: { "keywords": ["..."], "subreddits": ["..."] }
```

---

### Step 3 — 更新 Onboarding API Route

**文件**：`app/api/onboarding/route.ts`

**改动**：
- 删除 `step: "generate-keywords"` 处理（不再需要）
- 删除 `step: "save"` 处理
- 新增 `step: "save-and-scan"` 处理：
  1. 从 Supabase session 获取当前用户
  2. 调用 `generateKeywordsAndSubreddits(productDescription)` 生成关键词（用户不可见）
  3. Prisma upsert Profile：`{ productDescription, keywords, subreddits, onboardingComplete: true }`（无 targetCustomer 字段）
  4. **异步**触发 refresh（不 await）：fire and forget call to `/api/opportunities/refresh`
  5. 立刻返回 `{ success: true }`

---

### Step 4 — 新建 `/api/opportunities/refresh`

**文件**：`app/api/opportunities/refresh/route.ts`（新建）

**功能**：为单个用户触发一次完整的 fetch+score 流程，供 onboarding 完成后立刻使用，也可在 Settings 手动触发。

**实现**：
- POST handler
- 从 Supabase session 验证用户（不用 CRON_SECRET）
- 获取该用户的 Profile（keywords, subreddits, productDescription）
- 复用 fetch-posts cron 的核心逻辑，但只跑这一个用户：
  1. `fetchSubredditPosts()` 从用户的 subreddits 抓帖子
  2. `fetchHNStories()` 抓 HN 帖子
  3. 关键词匹配（word-level matching）
  4. 限制30条，调用 `scorePosts()`
  5. 保存到 Opportunity 表（skipDuplicates: true）
- 返回 `{ success: true, opportunitiesSaved: N }`
- 错误不 throw，静默 log，返回 `{ success: false, error: "..." }`

**注意**：执行时间约30-60秒是正常的。

---

### Step 5 — Dashboard Loading 状态

**文件**：`components/DashboardClient.tsx`

**改动**：
- 检测 URL 参数 `?scanning=true`（用 `useSearchParams()`）
- 如果存在，显示顶部 banner（蓝色）：「🔍 Scanning Reddit & HN for opportunities… this takes about 30 seconds.」
- 启动 polling：每8秒调用 `GET /api/opportunities/count`
- 当 count 从0变为 > 0，或超时60秒后，移除 banner 并调用 `router.refresh()`
- 清掉 URL 参数：`router.replace("/dashboard")`

新建 `app/api/opportunities/count/route.ts`（GET）：
- 从 Supabase session 验证用户
- 返回 `{ count: N }` — 该用户的 opportunity 总数

---

### Step 6 — 更新 Settings 页面

**文件**：`components/SettingsClient.tsx`

**改动**：

1. **删除 Target Customer 字段**：Product Info section 只保留 `productDescription`

2. **Keywords section 加 Save 按钮**：
   - 在 Keywords & Subreddits section 底部加 `[Save Changes]` 按钮
   - 点击后 PATCH `/api/settings` `{ keywords, subreddits }`
   - 成功后显示 toast：「Saved! New opportunities will appear in the next scan.」

3. **Re-generate Keywords 按钮修复**：
   - 只需要 `productDescription` 不为空（去掉 targetCustomer 检查）
   - 生成后自动填充 keywords/subreddits 区域，不自动保存

4. **手动触发 Scan 按钮**：
   - 在 Keywords & Subreddits section 加 `[Scan Now]` 按钮
   - 点击后 POST `/api/opportunities/refresh`
   - 按钮变成 loading：「Scanning…」（禁用避免重复点击）
   - 完成后 toast：「Found N new opportunities!」或「No new opportunities this time.」

---

### Step 7 — Schema 注意事项

**文件**：`prisma/schema.prisma`

- 不删除 `targetCustomer` 字段（保留数据库兼容性）
- 所有新代码不再使用或显示该字段

---

## 测试清单

```
□ 注册新用户 → onboarding 只有一个输入框
□ 填入产品描述（20字以上）→ 按钮启用
□ 点「Start Scanning →」→ 按钮变成「Setting up your radar…」
□ 立刻跳转到 /dashboard?scanning=true
□ 看到蓝色 scanning banner
□ 30-60 秒后 banner 消失，dashboard 显示机会
□ Settings → Product Info 只有一个 textarea，无 target customer
□ Settings → Keywords 可以增删并点 Save 保存
□ Settings → [Scan Now] 可以手动触发并显示结果
□ npm run build 无报错
```

---

## 文件改动总览

| 文件 | 操作 |
|------|------|
| `app/onboarding/page.tsx` | 重写 |
| `lib/keyword-generator.ts` | 修改（去掉 targetCustomer） |
| `app/api/onboarding/route.ts` | 修改（新增 save-and-scan step） |
| `app/api/opportunities/refresh/route.ts` | 新建 |
| `app/api/opportunities/count/route.ts` | 新建 |
| `components/DashboardClient.tsx` | 修改（scanning banner + polling） |
| `components/SettingsClient.tsx` | 修改（去掉 targetCustomer，加 Save/Scan Now） |

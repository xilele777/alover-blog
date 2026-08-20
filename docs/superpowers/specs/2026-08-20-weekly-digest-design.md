# 每周快报（AI 前沿周报）功能设计

日期：2026-08-20

## 背景与目标

作者计划每周发布一期「AI 前沿快讯总结」，内容为长篇结构化周报（单期约万字，含多级标题、长列表条目、大量粗体强调与分隔线）。正文由作者手写 Markdown，本设计只负责搭建承载框架。

目标：

1. 左侧导航新增「快报」入口。
2. `/weekly` 落地页以期号时间轴形式展示历期。
3. 快报正文有专属排版，适配长文可读性。
4. 提供新建一期的脚手架脚本。
5. 提供独立订阅源 `/weekly.xml`。
6. 首页文章流不混入快报。

## 非目标

- 不引入独立的 content collection 或新的 schema 结构。
- 不规定正文的板块结构（作者的写作结构可能变化，样式必须对通用 Markdown 元素成立）。
- 不做首页「最新快报」小卡片（本期不做）。

## 内容模型

快报复用现有文章体系，存放于 `content/posts/weekly/<year>/`，例如：

```
content/posts/weekly/2026/2026-08-20-issue-001.md
```

**目录是硬边界**：所有过滤（`/weekly` 列表、首页排除、独立 RSS）一律基于 `stem LIKE 'posts/weekly/%'`，不依赖 frontmatter 中的分类。分类只承担显示职能，改动它不会导致内容错位或漏出。

`content.config.ts` 的 `articleSchema` 不做任何修改。

### frontmatter 约定

```yaml
---
title: AI 前沿周报 #001（2026.08.13 - 08.19）
date: 2026-08-20
description: 一段话概括本期主线，用于列表页摘要、SEO 与 RSS。
categories: [快报]
tags: [AI, 周报, DeepSeek, LLM, Agent]
type: weekly
---
```

- `description` 而非 `summary`（schema 中的字段名为 `description`；`summary` 会被丢弃）。不添加别名兼容。
- `type: weekly` 驱动正文排版（见下文）。
- 期号为**三位补零**格式 `#001`，仅存在于 `title` 中，不新增 schema 字段。页面通过正则 `/#(\d+)/` 提取。
- 正文**不写 `# 一级标题`**，文章页已渲染 `PostHeader`，重复的 h1 会造成双标题。

### `blog.config.ts` 变更

- `managedCategories` 新增：`"快报": { "icon": "ph:newspaper-bold", "color": "#f59e0b" }`。该块位于 `BLOG_ADMIN_CATEGORIES_START/END` 标记之间，由 admin 管理，需保持格式一致。
- `article.types` 新增 `weekly: {}`。

## 落地页 `/weekly`

新增 `app/pages/weekly.vue`。

### 数据

复用现有 composable，不新写查询逻辑：

```ts
useAsyncData('weekly_posts', () => useArticleIndexOptions('posts/weekly/%'))
  → usePublishedArticles → 按 date 倒序
```

派生数据：

- **期号**：从 `title` 正则提取 `#(\d+)`，解析失败则回退为不显示期号徽记。
- **日期范围**：优先取 `title` 中已有的 `（YYYY.MM.DD - MM.DD）`；无法解析时由 `date` 反推「发布日之前的 7 天」，即 `date-7 → date-1`（使用 `toZonedTemporal`，时区取 `blogConfig.timeZone`）。这样无论周几发布，覆盖区间始终是完整的 7 天。
- **显示标题**：剥离 `title` 中的期号与括号日期部分后的剩余文本；若剥离后为空则使用完整 `title`。

### 布局

```
┌─────────────────────────────────────────┐
│  AI 前沿快报          每周一更 · 共 N 期  │ ← 页头，含订阅按钮
├─────────────────────────────────────────┤
│  ╔═══════════════════════════════════╗  │
│  ║ #001   08.13 → 08.19              ║  │ ← 最新一期：高亮大卡片
│  ║ 本期描述全文展示……                 ║  │
│  ║ [AI] [周报]            阅读全文 →  ║  │
│  ╚═══════════════════════════════════╝  │
│                                          │
│   #000  08.06 → 08.12                   │ ← 往期：左侧竖线时间轴
│ │ 描述单行截断……                        │
│ ├ ...                                   │
└─────────────────────────────────────────┘
```

- 期号放大作为视觉锚点，使用 `var(--font-stroke-free)`、`tabular-nums`，与 `archive.vue` 的年份处理保持同一语言。
- 往期项左侧竖线时间轴，节点对齐期号。
- 整卡可点击，跳转 `article.path`。
- 空状态：无任何快报时展示 `ZError` 或简短占位文案，不渲染空时间轴。
- 侧栏沿用 `layoutStore.setAside(['blog-stats'])`。
- SEO：`useSeoMeta` 设置 title「快报」与描述。

### 导航

`app/app.config.ts` 的 `nav[0].items` 中，在 Wiki 项之前插入：

```ts
{ icon: 'ph:newspaper-bold', text: '快报', url: '/weekly' },
```

### 首页排除

`app/pages/index.vue` 在 `listRaw` 之后、`usePublishedArticles` 之前插入过滤，剔除 `stem`（或 `path`）以 `posts/weekly/` 前缀的条目。`archive.vue` 与 `tags.vue` **保持包含**快报——归档与标签本就应覆盖全站内容。

## 正文排版 `.md-weekly`

样式写入 `app/assets/css/article.scss`，与既有的 `&.md-tech` / `&.md-story` 并列，由 `getPostTypeClassName` 自动挂载，无需改动 `[...slug].vue`。

全部使用标准 Markdown 元素选择器，不依赖特定板块名，作者更换正文结构后样式依然成立：

- **`h2`**：大节断点。加大上方留白与字号，底部细分隔线，滚动时形成明确的节奏。
- **`h3`**：小节标记。左侧色条（取快报分类色 `#f59e0b`），字号弱化，不与 `h2` 抢层级。
- **`li`**：核心可读性目标。条目间距加大、行高放宽、左内缩加深。`li` 内的首个 `strong` 承担「这条讲什么」的小标题职能，赋予强调色与轻微字重提升。
- **`hr`**：作者使用密集，压低为极轻分隔（低透明度、无实线感）。
- **`blockquote`**：轻量来源/引用样式，小字号。
- **`p > strong`**：正文内粗体给予稳定的强调色，与 `li > strong` 一致。
- **文末 `em` 段落**：免责声明样式，小字号、降低对比度。
- **`a`**：沿用全站链接样式，不覆盖。

深浅色模式均需验证；颜色一律走既有 CSS 变量或分类色变量，不硬编码新色值。

### 目录

`[...slug].vue` 已默认 `setAside(['toc'])`，`Toc.vue` 现成可用。需确认 TOC 对 `h2`/`h3` 两级均渲染（长周报的主要导航手段）。若现有实现仅到 `h2`，扩展至 `h3`。

## 新建脚本 `pnpm new:weekly`

新增 `scripts/new-weekly.ts`，`package.json` 增加 `"new:weekly": "tsx scripts/new-weekly"`。

复用 `scripts/new-blog.ts` 的 `@clack/prompts` + `Temporal` 结构与 VS Code 打开逻辑。差异：

1. **自动期号**：扫描 `content/posts/weekly/**/*.md`，从文件名 `issue-(\d+)` 取最大值 +1，三位补零。目录为空时从 `001` 起。
2. **自动周范围**：由当前日期反推之前的 7 天（`today-7 → today-1`），用于标题中的日期区间。允许通过交互确认或覆盖。
3. **自动路径**：`content/posts/weekly/<year>/<YYYY-MM-DD>-issue-<NNN>.md`，目录不存在则创建；文件已存在则报错退出。
4. **生成内容**：仅 frontmatter，正文留空。`title`/`date`/`categories: [快报]`/`type: weekly`/`tags: [AI, 周报]` 预填，`description` 留空占位待填。
5. 不询问分类、版式、permalink——这些对快报是固定的。

## 独立订阅源 `/weekly.xml`

新增 `server/routes/weekly.xml.get.ts`，复制 `server/routes/atom.xml.get.ts` 的实现，改动：

- 查询条件 `where('stem', 'LIKE', 'posts/weekly/%')`。
- feed 的 `id` / `title` / `subtitle` / `self link` 改为快报专属。
- 其余（日期格式化、URL 拼接、`renderContent`、`XMLBuilder` 配置）保持一致。

主 `atom.xml` **保持包含**快报——订阅全站的读者本就应当收到。

`/weekly` 页头提供订阅入口，指向 `/weekly.xml`。

## 风险与取舍

- **期号存于 title 的正则解析**：换来零 schema 改动与归档页的自然显示，代价是标题格式需保持稳定。解析失败时优雅降级（不显示期号徽记），不抛错。
- **`atom.xml.get.ts` 代码复制**：两个 feed 路由会有约 80% 重复代码。当前仅两处，复制比抽象更清晰；若将来出现第三个 feed，再抽取共享的 builder 模块。
- **首页排除的实现位置**：在客户端 composable 层过滤而非查询层，意味着快报数据仍会进入首页的 payload。数据量小（每周一篇），可接受。

## 验收标准

1. 左侧导航出现「快报」，点击进入 `/weekly`。
2. `/weekly` 正确渲染最新一期高亮卡片与往期时间轴，期号与日期范围解析正确。
3. 点击任一期进入文章页，正文应用 `.md-weekly` 排版，TOC 覆盖 `h2`/`h3`，深浅色模式均正常。
4. 首页文章流不含快报；归档页与标签页含快报。
5. `pnpm new:weekly` 生成正确路径与自增期号的骨架文件并打开编辑器。
6. `/weekly.xml` 可正常解析，仅含快报条目；`/atom.xml` 仍含快报。
7. `pnpm lint` 通过。

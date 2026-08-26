# 栏目页改版设计文档

> 日期：2026-08-26
> 站点：alover.me（小锅巴博客）
> 框架：Nuxt 4 + Vue 3 + Nuxt Content v3（Clarity 主题）

## 概述

对三个栏目页做一次改版，解决页面"呆板、简陋"的观感问题：

1. **照片墙**：整页移除（含导航、数据、图片资源）。
2. **藏宝阁**：从"封面小卡片网格"重做为**海报墙**风格——大封面、单墙 + 筛选 tab、金色星级评分。
3. **项目页**：去掉精选项目，只保留开源仓库；卡片升级质感，新增语言 / 最近 push 时间 / 仓库状态徽章等信息，并同步升级 GitHub API。

---

## 1. 照片墙移除

### 1.1 删除清单

| 内容 | 路径 | 说明 |
|------|------|------|
| 页面 | `app/pages/photos.vue` | 整页删除 |
| 导航项 | `app/app.config.ts` | 移除 `{ icon: 'ph:image-bold', text: '照片墙', url: '/photos' }` |
| 数据 | `data/photos.yml` | 删除文件 |
| 图片资源 | `public/images/photos/` | 删除整个目录 |

### 1.2 引用检查

已确认站点代码中 `/photos` 仅被导航配置引用，删除后无残留入口。文档（旧 spec）中的引用不处理。

---

## 2. 藏宝阁海报墙（Treasure）

### 2.1 页面结构

- **路径**：`/treasure` → `app/pages/treasure.vue`（重写）
- **数据**：`data/treasure.yml`（模型不变，见 2.3）
- **Aside**：无（保持 `layoutStore.setAside([])`）
- **SEO**：title "藏宝阁"，ogType "website"（保持）

### 2.2 布局

```
┌─────────────────────────────────────────────┐
│  藏宝阁                                       │
│  我珍藏的那些好东西                            │
│                                             │
│  [全部] [🎬 电影] [📖 书籍] [🎵 音乐]          │
│                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ 封面 │ │ 封面 │ │ 封面 │ │ 封面 │ │ 封面 │   │
│  │▔▔▔▔▔│ │▔▔▔▔▔│ │▔▔▔▔▔│ │▔▔▔▔▔│ │▔▔▔▔▔│   │
│  │标题  │ │标题  │ │标题  │ │标题  │ │标题  │   │
│  │★★★★★│ │★★★★★│ │★★★★★│ │★★★★★│ │★★★★★│   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
└─────────────────────────────────────────────┘
```

- **筛选 tab**：`全部 / 各分类`，从 `treasure.yml` 的 `categories` 动态生成（图标复用分类的 `icon` 字段）；点击切换 `activeCategory`。
- **海报网格**：`grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))`，gap 0.9em。
  - 桌面宽屏自然形成约 5 列
  - 平板 / 中屏约 4 列
  - 手机（≤768px）固定 3 列（media query 覆盖）
- **切换动画**：`TransitionGroup` + 现有 `float-in` 动画；每张卡片 `getFixedDelay(index * 0.05)` 错峰入场。

### 2.3 数据模型

复用现有 `treasure.yml` 结构，不改字段：

```yaml
categories:
  - name: 电影
    icon: ph:film-strip-bold
    items:
      - title: 星际穿越
        cover: /images/treasure/interstellar.webp
        link: https://movie.douban.com/subject/1889243/
        description: 诺兰的时空史诗
        rating: 5
```

清理重复数据：`treasure.yml` 中「生息之地」重复 4 条，仅保留 1 条。

### 2.4 海报卡片

- **封面**：`aspect-ratio: 2 / 3`（电影海报比例），`object-fit: cover`，大圆角 `0.75em`，柔和阴影 `var(--box-shadow-2)`。
- **常驻渐变遮罩**：底部 `linear-gradient(transparent → rgba(0,0,0,0.85))`，上方排列：
  - **标题**：白色、600 字重、2 行截断
  - **星级评分**：`ph:star-fill` 固定金色 `#f5c518`（豆瓣评分金，链接均为豆瓣），5 颗星、点亮 `rating` 颗，替代原圆点样式
- **hover（桌面）**：卡片 `translateY(-4px)` + 封面 `scale(1.05)`，阴影加深；遮罩加深，**描述**淡入（2 行截断，白色 80% 透明）。
- **移动端（无 hover）**：描述常驻显示 1 行。
- **整卡链接**：`<a>` 包整卡，`target="_blank"` + `rel="noopener"`，跳转 `item.link`。
- **空状态**：某分类无内容时显示 `ZError`（icon `ph:chest-simple-bold`，文案「暂无收藏」）。

### 2.5 样式变量

沿用 Clarity 主题现有 CSS 变量（`--c-primary`、`--ld-bg-card`、`--box-shadow-*` 等），与站点风格统一。

---

## 3. 项目页改版（Projects）

### 3.1 去掉精选项目

- 移除「精选项目」section 及相关组件代码（`pinned`、`pinned-grid`、`gradient-card` 中的 pinned 部分、`PinnedProject` 接口等）。
- `data/projects.yml` 删除 `pinned` 字段，仅保留 `github` 配置：

```yaml
# 精简后的 projects.yml
github:
  username: xilele777
  exclude:
    - dotfiles
    - my_blogs_pro
```

### 3.2 开源仓库卡片

只保留「开源仓库」section，卡片升级为：

```
┌───────────────────────────────┐
│ ● TypeScript  my_repo         │  ← 语言色圆点 + 仓库名
│ 一句话描述……（2 行截断）        │
│ [Fork徽章] 语言名   3 天前更新  │  ← 状态徽章 + 语言 + 相对时间
└───────────────────────────────┘
```

**信息展示：**

| 信息 | 呈现方式 | 数据来源 |
|------|----------|----------|
| 仓库名 | 头部行，粗体，单行截断 | `name` |
| 语言 | 头部彩色圆点 + 底部语言名 | `language` + `languageColors` 映射 |
| 描述 | 2 行截断 | `description`（空则「暂无描述」） |
| 状态徽章 | fork：`ph:git-fork-bold` +「Fork」；私有：`ph:lock-bold` +「私有」；公开：「公开」 | `fork` / `private` |
| 最近更新 | 相对时间「x 小时前 / x 天前 / x 个月前更新」，靠右 | `pushed_at` |

**移除**：star / forks 数量展示（用户确认不需要）。

**卡片质感**：大圆角、柔和阴影、`hover` 上浮 + 语言色左边框或底部高亮。

**排序**：`filteredRepos` 由「按 stars」改为**按 `pushed_at` 倒序**（最近活跃在前）。archived、exclude、pinned 过滤逻辑中，pinned 过滤一并移除。

### 3.3 骨架屏

保留现有骨架屏（6 张占位卡），结构随新卡片布局微调（占位行对齐新卡片结构）。

---

## 4. GitHub API 扩展

### 4.1 服务端 `server/api/github/repos.get.ts`

`GitHubRepo` 接口新增字段（GitHub API 原生返回，无需额外请求）：

```ts
interface GitHubRepo {
  name: string
  description: string | null
  html_url: string
  language: string | null
  topics: string[]
  archived: boolean
  pushed_at: string      // 新增：最近推送时间 ISO 字符串
  fork: boolean          // 新增：是否 fork
  private: boolean       // 新增：是否私有
}
```

保留：用户名 `xilele777`、可选 token、`sort: stars` 查询参数、24h 缓存。**注意**：虽然 API 仍按 stars 拉取（列表来源），但前端展示排序改为按 `pushed_at`。

### 4.2 相对时间工具函数

新建 `app/utils/relative-time.ts`：

- 输入 ISO 时间字符串，输出中文相对时间：
  - `< 1 min` → 「刚刚」
  - `< 1 h` → 「x 分钟前」
  - `< 24 h` → 「x 小时前」
  - `< 30 d` → 「x 天前」
  - `< 12 mo` → 「x 个月前」
  - 其余 → 「x 年前」
- 复用现有日期工具或手写，避免引入新依赖；`pushed_at` 为空时兜底显示「—」。

### 4.3 语言颜色映射

保留 `projects.vue` 现有 `languageColors` 映射表；缺失语言回退 `var(--c-text-3)`。不新增依赖。

---

## 5. 验收要点

- `/photos` 返回 404，导航无「照片墙」，`data/photos.yml` 与 `public/images/photos/` 已删除。
- `/treasure` 呈现海报墙：筛选 tab 切换正常，卡片 hover 动效正常，移动端 3 列且描述常驻。
- `/projects` 无「精选项目」，卡片显示语言 / 状态徽章 / 相对更新时间，按 push 时间倒序。
- GitHub 接口新字段就绪，相对时间文案正确；无新依赖、无 ESLint 报错。

# 右侧栏丰富与藏宝阁三栏布局设计

日期：2026-08-26

## 背景

- 周报页、项目页的右侧栏目前只有 `blog-stats` 一个 widget，内容单调。
- 藏宝阁页面 `setAside([])` 无右侧栏，海报墙占满整个内容区（宽屏下 6~7 列），视觉上「占满、冲突、呆板」。
- 目标：统一三栏布局（左导航 / 中间内容 / 右侧小组件），丰富右侧栏内容，藏宝阁海报墙随内容区收窄而减少列数。

## 布局改动

| 页面 | setAside | 说明 |
|---|---|---|
| `app/pages/treasure.vue` | `['treasure-stats', 'blog-stats']` | 新增右侧栏，海报墙内容区从 ~1080px 收窄到 ~790px，列数降至 4~5 |
| `app/pages/projects.vue` | `['blog-stats', 'github-contribution', 'github-stats']` | 新增贡献热力图 + GitHub 统计 |
| `app/pages/weekly.vue` | `['weekly-stats', 'blog-stats']` | 新增周报统计 |

## 新增 widget（`app/components/widget/`）

全部自动注册为 `LazyWidget*`，需同步挂进 `app/composables/useWidgets.ts` 的 `rawWidgets` 映射。

### 1. TreasureStats（藏宝统计）

- 数据源：`data/treasure.yml`（直接 import，页面已如此）
- 展示：总收藏数、各分类数量（电影 7 / 书籍 2 / 音乐 1）、平均评分
- 用 `ZDlGroup` 或简单 dl 结构，卡片标题「藏宝统计」

### 2. GithubContribution（贡献热力图）

- 数据源：`/api/github/stats`（GraphQL）
- 渲染：近 4 个月滚动窗口（从今天往前推 4 个月，取 `weeks` 尾部 17 周），53→17 列 × 7 行 CSS grid
- 格子 ~13px，圆角 2px，level 0-4 映射绿色系（参考 GitHub：`#ebedf0 / #9be9a8 / #40c463 / #30a14e / #216e39`，深色主题可加深）
- hover 显示日期 + 贡献次数（用现有 tooltip 机制或 `title` 属性兜底）
- 标题：「今年 N 次贡献」（N = `totalContributions`）
- 整卡可点击跳转 GitHub 主页

### 3. GithubStats（GitHub 统计）

- 数据源：`/api/github/stats`（GraphQL）
- 展示三项：仓库总数（含私有）、有 star 的仓库数、commit 总数
- `ZDlGroup` 卡片「GitHub 统计」

### 4. WeeklyStats（周报统计）

- 数据源：与 `app/pages/weekly.vue` 相同的 `useAsyncData('weekly_posts', ...)`——**相同 key，Nuxt 自动去重，不重复请求**
- 展示：总期数、累计字数、累计阅读时长（分钟）、下次更新时间（最近一期日期 + 7 天）
- 「下次更新」需要把 `formatRelativeTime` 扩展支持未来时间（如「3 天后」）或直接显示日期

## 数据层

### `server/api/github/stats.get.ts`（新增）

- 单次 GraphQL 查询一次取全：

```graphql
query {
  user(login: "xilele777") {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
    repositories(ownerAffiliations: OWNER, first: 100) {
      totalCount
      nodes { name stargazerCount isPrivate defaultBranchRef { target { ... on Commit { history { totalCount } } } } }
    }
  }
}
```

- 响应结构：
  - `contributions`：`{ totalContributions, weeks: [{ contributionDays: [{ date, contributionCount, contributionLevel }] }] }`
  - `stats`：`{ repoTotal, repoPrivate, repoStarred, commitTotal }`（commit 求和，私有仓库计数用 `isPrivate`）
- `cachedEventHandler` 缓存 24h（同 `repos.get.ts`），`import process from 'node:process'` 读 `GITHUB_TOKEN`
- `nuxt.config.ts` routeRules 增加 `'/api/github/stats': { prerender: true }`（与 repos 一致，构建时静态化，token 不暴露给客户端）
- **降级**：无 token 或 GraphQL 失败 → 返回 `null`，前端 widget 整体隐藏（`v-if="data"`）

### 复用已有

- `server/api/github/repos.get.ts`：项目页卡片数据，不变
- `app/utils/relative-time.ts`：扩展支持未来时间（`formatRelativeTime` 对 `Date > now` 输出「x 分钟后/后/天」）

## 视觉调整

- 藏宝阁海报墙间距微调（`gap` 0.9em → 0.8em）保持呼吸感（可选，随内容区收窄自然改善）
- 新 widget 遵循现有 `BlogWidget` 卡片容器 + `ZDlGroup` 样式体系

## 范围外

- 不新增其他页面 widget
- 不改变项目页卡片本身
- 不动部署配置（token 由部署平台构建环境变量提供）

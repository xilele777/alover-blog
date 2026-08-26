# 三大新栏目设计文档

> 日期：2026-08-26
> 站点：alover.me（小锅巴博客）
> 框架：Nuxt 4 + Vue 3 + Nuxt Content v3（Clarity 主题）

## 概述

在博客中新增三个独立栏目页面，并在左侧导航栏加入对应入口。采用方案 A（独立页面 + 独立数据文件），每个栏目解耦互不干扰。

| 栏目 | 路径 | 页面文件 | 数据文件 |
|------|------|----------|----------|
| 藏宝阁 | `/treasure` | `pages/treasure.vue` | `data/treasure.yml` |
| 项目 | `/projects` | `pages/projects.vue` | `data/projects.yml` |
| 照片墙 | `/photos` | `pages/photos.vue` | `data/photos.yml` |

---

## 1. 导航栏入口

在 `app/app.config.ts` 的 `nav` 数组中，于「周报」和「Wiki」之间新增三项：

```ts
{ icon: 'ph:treasure-chest-bold', text: '藏宝阁', url: '/treasure' },
{ icon: 'ph:rocket-launch-bold', text: '项目', url: '/projects' },
{ icon: 'ph:image-bold', text: '照片墙', url: '/photos' },
```

图标使用 Phosphor Bold 系列，与现有导航项风格一致。

---

## 2. 藏宝阁（Treasure）

### 2.1 页面结构

- **路径**：`/treasure` → `app/pages/treasure.vue`
- **数据**：`data/treasure.yml`
- **Aside**：无（内容为主，类似友链页）
- **SEO**：title "藏宝阁"，ogType "website"

### 2.2 数据结构

```yaml
categories:
  - name: 电影
    icon: ph:film-strip-bold
    items:
      - title: 星际穿越
        cover: /images/treasure/interstellar.jpg
        link: https://movie.douban.com/subject/1889243/
        description: 诺兰的时空史诗
        rating: 5
  - name: 书籍
    icon: ph:book-bold
    items:
      - title: 百年孤独
        cover: /images/treasure/solitude.jpg
        link: https://book.douban.com/subject/...
        description: 魔幻现实主义的巅峰
        rating: 5
  - name: 音乐
    icon: ph:music-note-bold
    items:
      - title: 某专辑
        cover: /images/treasure/album.jpg
        link: https://music.163.com/...
        description: 一句话推荐
        rating: 4
```

字段说明：
- `title`：必填，作品名称
- `cover`：必填，封面图路径（相对于 public/）
- `link`：必填，外部链接（豆瓣/网易云等）
- `description`：可选，一句话推荐
- `rating`：可选，1-5 推荐等级

### 2.3 视觉设计

**页面布局**：按分类垂直排列，每个分类占一个区域，类似书架。

**分类标题**：带分类图标的大标题（`font-size: 1.4em; font-weight: 800`），与周报页标题风格一致。

**卡片网格**：
- `display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.8em`
- 自适应列数，桌面端约 4-5 列，移动端 2 列

**卡片样式**：
- 封面图占卡片上部约 70%，`object-fit: cover`，宽高比约 3:4（竖版封面）
- 下方区域：标题（1 行截断，`font-weight: 600`）+ 描述（1 行截断，`opacity: 0.5`）
- 可选：右上角 rating 圆点指示器（1-5 个小实心圆，`position: absolute` 右上角）
- `border-radius: 0.5em`，`box-shadow: var(--box-shadow-2)`
- `background-color: var(--ld-bg-card)`（跟随深浅主题）

**交互**：
- Hover：卡片 `translateY(-4px)` + 阴影加深，封面图 `scale(1.05)` + `overflow: hidden` 裁切
- 点击：`<a>` 跳转外部链接，`target="_blank" rel="noopener"`

**入场动画**：`float-in` + `getFixedDelay(index * 0.05)`，与项目现有动画一致。

**空状态**：分类暂无内容时显示 `ZError` 组件 + "暂无收藏"。

**风格定位**：像 B 站推荐卡片但更简约——强调封面图的视觉冲击力，像精致的数字书架。

---

## 3. 项目展示（Projects）

### 3.1 页面结构

- **路径**：`/projects` → `app/pages/projects.vue`
- **数据**：`data/projects.yml`（本地补充）+ GitHub API（动态拉取）
- **Aside**：`['blog-stats']`
- **SEO**：title "项目"，ogType "website"

### 3.2 数据结构

```yaml
# 置顶/自定义项目（非 GitHub 仓库）
pinned:
  - title: 个人博客
    description: 基于 Nuxt 4 + Clarity 主题的个人博客
    link: https://alover.me
    cover: /images/projects/blog.jpg
    tags: [Nuxt, Vue, TypeScript]
    icon: ph:globe-bold

# GitHub 配置
github:
  username: xilele777
  exclude: [dotfiles, my_blogs_pro]
```

字段说明（pinned 项目）：
- `title`：必填，项目名称
- `description`：必填，项目描述
- `link`：必填，项目链接
- `cover`：可选，封面图路径
- `tags`：可选，技术标签数组
- `icon`：可选，Phosphor 图标名

### 3.3 GitHub API 集成

- **服务端代理路由**：`server/api/github/repos.get.ts`
  - 调用 `https://api.github.com/users/xilele777/repos?sort=stars&per_page=30`
  - 支持 `GITHUB_TOKEN` 环境变量（可选，提高 rate limit）
  - 返回精简字段：`name, description, html_url, stargazers_count, forks_count, language, topics, archived`
  - 24h 缓存（Nitro `cachedEventHandler`）
- **前端调用**：`useAsyncData('github_repos', () => $fetch('/api/github/repos'))`
- **过滤**：排除 `data/projects.yml` 中 `github.exclude` 列出的仓库，排除 archived 仓库

### 3.4 视觉设计

**页面头部**：大标题「项目」+ 副标题 "我的开源项目与作品" + GitHub 头像/链接

**置顶项目（Pinned）**：
- 横排 2 列大卡片（`grid-template-columns: repeat(2, 1fr)`，移动端 1 列）
- 卡片左侧：项目图标 64px / 封面图 100% 宽（max-height: 120px）
- 卡片右侧：标题（粗体）+ 描述（2 行截断）+ 标签胶囊
- 标签胶囊：`padding: 0.2em 0.6em; border-radius: 1em; background: var(--c-bg-soft); font-size: 0.8em`
- Hover：边框变为 `--c-primary`，`translateY(-2px)`

**GitHub 仓库列表**：
- 3 列网格（`grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`）
- 较小卡片：语言圆点（标准 GitHub 语言颜色）+ 仓库名（粗体）+ 描述（2 行截断）+ 星标/Fork 数
- Hover：同置顶项目效果

**加载状态**：GitHub API 请求中显示骨架屏（3 行灰色条 + 圆形占位），避免布局跳动。

**入场动画**：`float-in` + `getFixedDelay`

---

## 4. 照片墙（Photos）

### 4.1 页面结构

- **路径**：`/photos` → `app/pages/photos.vue`
- **数据**：`data/photos.yml`
- **Aside**：无（全幅沉浸式体验）
- **SEO**：title "照片墙"，ogType "website"

### 4.2 数据结构

```yaml
groups:
  - name: 日常
    items:
      - src: /images/photos/daily/001.jpg
        title: 午后阳光
        date: 2026-07-15
        location: 上海
  - name: 旅行
    items:
      - src: /images/photos/travel/kyoto.jpg
        title: 京都小路
        date: 2026-05-20
        location: 京都
```

字段说明：
- `src`：必填，照片路径（相对于 public/）
- `title`：必填，照片标题
- `date`：可选，拍摄日期
- `location`：可选，拍摄地点

### 4.3 视觉设计——柔和瀑布流

**布局**：CSS Columns 瀑布流
- 桌面端：`column-count: 3; column-gap: 0.8em`
- 移动端：`column-count: 2`
- 每张照片容器：`break-inside: avoid; margin-bottom: 0.8em`
- 不使用 JS Masonry 库，纯 CSS 实现，SSR 友好且性能好

**照片卡片**：
- `border-radius: 0.5em`
- `box-shadow: var(--box-shadow-2)`
- `overflow: hidden`（裁切圆角）
- 底部渐变遮罩（`linear-gradient(transparent, rgba(0,0,0,0.6))`）+ 白色标题文字
- 标题默认隐藏（`opacity: 0`），hover 时淡入

**Hover 交互**：
- 照片 `scale(1.03)`，`transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)`
- 底部渐变遮罩显示，标题文字 `translateY(0)` + `opacity: 1`，过渡 0.2s

**点击交互**：打开灯箱查看大图
- 复用项目已有的 `popover/Lightbox.vue` 组件
- 灯箱内显示：大图 + 标题 + 日期 + 地点
- 支持左右箭头键切换同组照片

**分组切换**：
- 页面顶部：分组标签栏（类似首页分类切换 `PostOrderToggle` 风格）
- 点击过滤显示对应分组，「全部」标签显示所有照片

**入场动画**：`float-in` + `getFixedDelay(index * 0.03)`，比其他页面更密集，营造照片涌入感。

**空状态**：`ZError` 组件 + "还没有上传照片"

**风格定位**：温柔而非冷淡——圆角、柔和阴影、浅色模式白底+淡灰边框，深色模式暗色卡片+微弱发光边框。像一本精心排版的相册，不是赛博朋克。

---

## 5. 技术约定

### 文件组织
- 数据文件统一放在 `data/` 目录（项目根目录下新建）
- 封面图/照片放在 `public/images/` 下对应子目录
- 页面组件放在 `app/pages/`

### 样式约定
- 使用项目已有的 CSS 变量（`--c-primary`, `--c-bg-soft`, `--ld-bg-card`, `--box-shadow-2` 等）
- 使用已有的 SCSS 变量（`$breakpoint-mobile` 等）
- 使用已有的动画（`float-in`, `getFixedDelay`）
- 使用已有的工具组件（`UtilLink`, `UtilImg`, `ZError`, `Icon`）
- 深浅主题自动跟随 CSS 变量，无需额外处理

### 数据加载
- YAML 数据通过 `import` 直接引入（Vite 原生支持 YAML）
- GitHub API 通过服务端代理路由 + `useAsyncData` 获取
- 所有页面支持 SSG 预渲染

---

## 6. 不做的事（YAGNI）

- 不做管理后台集成（藏宝阁/照片墙数据通过 Git 编辑 YAML 即可）
- 不做照片上传功能（手动放 public/ 即可）
- 不做照片 EXIF 自动提取
- 不做藏宝阁搜索/过滤功能
- 不做项目页自动同步 GitHub star 数（仅首次加载时获取）

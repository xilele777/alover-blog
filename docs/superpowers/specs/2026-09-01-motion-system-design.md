# 全站动效系统重做设计

日期：2026-09-01

## 背景

现有动效被评价为「呆板、不灵动」。经排查，这不是审美偏好问题，而是四个可定位的技术缺陷：

1. **全站没有缓动曲线。** 26 处写的是 `transition: all 0.2s`，用 CSS 默认的 `ease`。`ease` 曲线接近对称，起步与收尾都慢，观感等同匀速平移。灵动感来自「快出慢收」的非对称曲线。

2. **`--delay` 变量被重载了两种含义。** `app/components/post/Article.vue:66` 的 `animation: float-in 0.2s var(--delay) backwards` 中它是 delay（正确用法）；`app/assets/css/animation.scss:21` 的 `transition: all var(--delay)` 中它是 duration。首页首屏加载正常（`TransitionGroup` 未设 `appear`，首次渲染不加过渡类，只跑 CSS animation）；翻页与切分类时两套动画同时生效且语义冲突——`getFixedDelay(index * 0.05)` 产出的错峰值被当成过渡时长，形成「时长递增」而非错峰。

3. **`transition: all` 滥用。** 会把 `color`、`background-color`、`box-shadow` 全部纳入过渡，切换深浅色主题时全站每个元素同时跑颜色动画。

4. **页面转场缺失，且上一次尝试已回滚。** 见 `128a272`。

## 上一次失败的根因

提交 `90d0892` 与 `0692e22` 使用 Vue `<Transition>` 做页面转场，`128a272` 将其回滚。回滚说明记录的两难：

- `out-in` 模式：旧页面卸载到新页面挂载之间必然空屏，异步 setup 经 Suspense 会进一步拉长真空期。
- 非 `out-in` 模式：新旧页面同时处于文档流中上下堆叠，页面高度先翻倍后塌陷，产生滚动跳动。

Vue `<Transition>` 只有这两种模式，**这是机制上的死结，不是 CSS 能解决的问题**。本设计因此更换机制。

## 方案选型

| 方案 | 结论 |
|---|---|
| A. 建立动效令牌层 + 替换全部 `transition: all` | **采用。** 根治「无缓动 + `all` 滥用」两个根因，零新依赖，之后调手感只改令牌 |
| B. 只加令牌层，旧代码不动 | 否决。痛点正是这 26 处日常交互，不动等于没改 |
| C. 引入 `motion-v` / `@vueuse/motion` | 否决。静态博客为 hover 抬升引入运行时动画库不划算；弹簧参数比 CSS 曲线���难调得克制，易滑向「花里胡哨」 |

页面转场改用 **View Transitions API**（Nuxt 4.4.2 原生支持），理由见下节。

动效性格定为**分层**：微交互短促（~160ms），页面转场与弹层柔和（~320ms）。

---

## 1. 动效令牌层

`app/assets/css/animation.scss` 顶部定义唯一真相源：

```scss
:root {
	/* 时长：按位移距离分层，不按元素重要性 */
	--dur-instant: 90ms;   /* 颜色、透明度等无位移变化 */
	--dur-fast: 160ms;     /* 微交互：hover、按钮、开关 */
	--dur-base: 240ms;     /* 中等位移：下拉、折叠、目录 */
	--dur-slow: 320ms;     /* 大位移：页面转场、侧栏、弹层 */

	/* 缓动：全部非对称，快出慢收 */
	--ease-out: cubic-bezier(0.22, 1, 0.36, 1);      /* 默认，入场/响应 */
	--ease-in: cubic-bezier(0.64, 0, 0.78, 0);       /* 离场，收得干脆 */
	--ease-inout: cubic-bezier(0.65, 0, 0.35, 1);    /* 双向位移 */
	--ease-soft: cubic-bezier(0.34, 1.28, 0.64, 1);  /* 末段轻微过冲，仅转场使用 */
}
```

设计依据：

- **时长按位移距离分层。** 物理直觉是移动距离越大所需时间越长，否则看起来像瞬移。这也是「分层手感」的落地方式。
- **`--ease-out` 作为默认曲线。** 前 30% 时间走完约 70% 距离，剩余时间缓慢贴合终点，这是「跟手 + 丝滑」的来源，也是替换 `ease` 后观感变化最大的一处。
- **`--ease-soft` 是唯一带过冲的曲线，且只用于页面转场与共享元素变形。** 控制点 y=1.28，实测曲线峰值 1.0259（t≈0.696），即越过终点约 **2.6%** 后回落——幅度刻意压得很小，是「有回弹感」而非「弹一下」。用在 hover 上显得廉价；用在大转场上才有分量感。这是「灵动但不花哨」的边界。

兼容处理：保留 `--max-bezier-to-full` / `--max-bezier-to-collapse` 作为别名指向新令牌，避免破坏现有 collapse 动画。

`--delay` 重载必须拆除：改名 `--stagger`（纯延迟语义），`app/utils/anim.ts` 的 `getFixedDelay` 相应改名 `getStagger`，`animation.scss` 中当 duration 用的那处改用 `--dur-base`。

---

## 2. 页面转场

### 配置

`nuxt.config.ts` 的 `experimental` 块新增一项（保持 `@keep-sorted` 顺序）：

```ts
experimental: {
	extractAsyncDataHandlers: true,
	typescriptPlugin: true,
	viewTransition: true,
},
```

**不得添加 `app.pageTransition`。** 其 schema 默认值为 `false`（`@nuxt/schema/dist/index.mjs:89`），回滚后现状是干净的。若重新加上，Vue 过渡与 View Transition 会双重动画。

已核实的机制细节（Nuxt 4.4.2）：

- `experimental.viewTransition` 为真时注册 `plugins/view-transitions.client`（`nuxt/dist/index.mjs:7178`）。
- 运行时默认值来自 `app.viewTransition`：`nuxt.config.mjs` 模板会遍历 `nuxt.options.app` 的每个键，以 `camelCase('app-' + key)` 为名逐个导出，因此生成的是 `appViewTransition`（客户端插件正是按此名导入）。该字段有 `$resolve`（`@nuxt/schema/dist/index.mjs:90`），未显式设置时自动从 `experimental.viewTransition` 派生，因此只需设一个开关，无需同时配置 `app.viewTransition`。
- 插件对 `document.startViewTransition` 做特性检测，缺失则直接 return，退化为瞬时切换。
- 插件内置 `prefers-reduced-motion` 判断，非 `'always'` 模式下自动跳过。
- 插件监听 `popstate` 的 `hasUAVisualTransition`，浏览器返回手势已有原生动画时主动让路。
- `isChangingPage`（`nuxt/dist/app/components/utils.js:15`）只认路由 key 变化，**query 变化不触发整页转场**。首页翻页、切分类因此不会走转场，留给列表自身的错峰动画。

类型约束：`ViewTransitionOptions.types` 只接受 `string[]`（会经 `JSON.stringify` 序列化）；函数式 `types` 仅 `ViewTransitionPageOptions` 支持，即只能在 `definePageMeta` 中使用。方向判断因此不走 Nuxt 的 types 机制。

### 只让正文动，侧栏静止

带 `view-transition-name` 的元素会被单独提取成图层并**从 root 快照中排除**。据此：

```scss
#blog-sidebar { view-transition-name: vt-sidebar; }
#blog-aside   { view-transition-name: vt-aside; }
```

两者在前后页面同名，浏览器自动配对；位置不变即视觉静止。root 快照剩下正文区，方向性位移只作用于它。整页一起平移会显得笨重，这是「丝滑」与「整页闪一下」的分界。

**约束：不要给 `#main-content` 加 `view-transition-name`。** root 快照是视口大小（裁剪滚动区外内容），而具名元素的快照是元素完整尺寸；长文章会生成超大纹理，可能超出 GPU 上限导致转场失败。正文留在 root 内反而安全。

### 方向判断

新增 `app/plugins/nav-direction.client.ts`：

```ts
export default defineNuxtPlugin(() => {
	const router = useRouter()
	let isPop = false
	window.addEventListener('popstate', () => { isPop = true })

	// 列表类 rank 0，详情类 rank 1
	const rank = (path: string) => LIST_ROUTES.has(path) ? 0 : 1

	router.beforeEach((to, from) => {
		const delta = rank(to.path) - rank(from.path)
		document.documentElement.dataset.nav
			= isPop || delta < 0 ? 'back' : delta > 0 ? 'forward' : 'flat'
		isPop = false
	})
})
```

`LIST_ROUTES` 为该插件文件内的模块级 `Set`，含 `/`、`/archive`、`/tags`、`/link`、`/memory`、`/projects`、`/treasure`、`/weekly`、`/preview`；其余（catch-all 文章页）为 rank 1。

`/admin` 单独排除：在 `app/pages/admin/index.vue` 加 `definePageMeta({ viewTransition: false })`。插件读取 `to.meta.viewTransition` 并优先于全局默认值，因此进入 admin 不会有转场（其全屏布局与博客正文结构差异过大）。项目当前未使用过 `definePageMeta`，这是第一处。

`beforeEach` 保证早于 Nuxt 插件的 `beforeResolve`，属性在快照前就位。

CSS 按属性分支：

```scss
html[data-nav="forward"] {
	&::view-transition-old(root) { animation: vt-exit-to-start var(--dur-slow) var(--ease-out) both; }
	&::view-transition-new(root) { animation: vt-enter-from-end var(--dur-slow) var(--ease-out) both; }
}
/* back 为镜像；flat（同层级，如首页↔归档）只做纯交叉淡入，不位移 */
```

位移量用固定 `24px`，不用百分比——百分比在宽屏上会变成巨大位移。

### 为什么这次不会重蹈覆辙

旧方案中新旧页面是真实 DOM，必然二选一地空屏或堆叠。View Transitions 动的是**快照图层**，真实 DOM 始终只有一份并瞬时替换，既不堆叠也无真空期。不支持的浏览器直接跳过，退化为现状的瞬时切换。

---

## 3. 标题共享元素变形

新增 `app/composables/useSharedTitle.ts`。两个方向时序要求不同，接法也不同。

**去程（列表 → 文章）：同步写 DOM。** 响应式绑定需等 Vue 微任务刷新，与路由解析存在竞态。在 `PostArticle` 的点击处理中直接写内联样式：

```ts
function onNavigate(e: MouseEvent) {
	const h2 = (e.currentTarget as HTMLElement).querySelector('.article-title')
	if (h2) (h2 as HTMLElement).style.viewTransitionName = 'vt-post-title'
	sharedTitlePath.value = props.path   // 持久化，供返程使用
}
```

注意用 `props.path` 而非 `props.to`：`ArticleProps`（`app/types/article.ts`）声明的是 `path`，`to` 是在 `index.vue` 中额外传入、经 attrs 透传给 `UtilLink` 的，并非 `PostArticle` 的声明式 prop。

**回程（文章 → 列表）：响应式绑定即可。** 新页面在 `startViewTransition` 的回调内渲染，新快照在 Vue 渲染之后才取。卡片按 `path === sharedTitlePath` 绑定。

文章页侧：`PostHeader` 的 `<h1>` 恒定持有该名字。同时只挂载一个文章页，不存在重名。

转场结束后需清除卡片上的内联 `viewTransitionName`，避免残留影响后续转场。

观感调校：

```scss
::view-transition-group(vt-post-title) {
	animation-duration: var(--dur-slow);
	animation-timing-function: var(--ease-soft);
}
::view-transition-old(vt-post-title) { animation-duration: var(--dur-fast); }
::view-transition-new(vt-post-title) { animation-duration: var(--dur-slow); }
```

让**位置与尺寸慢慢过渡、文字快速交叉淡入**。若两张快照等速淡入淡出，中途会同时看到两行字并糊成一团；错开时长后才读作「一个标题连续移动」。

降级：卡片不在 DOM 中时（如从第 2 页进入文章后返回），浏览器找不到配对，该图层退化为普通淡出，不报错。

---

## 4. 列表进场

三步修复：

1. **拆变量。** `--delay` → `--stagger`；`getFixedDelay` → `getStagger`；`animation.scss` 中当 duration 用的那处改 `--dur-base`。
2. **错峰封顶。** `getStagger(index)` 返回 `Math.min(index, 8) * 40ms`。不封顶时第 20 项要等 1 秒，翻页后下半屏长时间空白。
3. **消除双动画。** 新增 `.float-in-enter-active { animation: none; }`。首屏加载走 CSS `animation: float-in`（`TransitionGroup` 未设 `appear`，首次渲染不加类），翻页走 Vue 过渡类，两者互斥而非叠加。

`--float-distance` 从 `10%` 改为 `8px`。百分比相对元素自身高度，带封面图的卡片与纯文字卡片位移量相差数倍。

保留 `app/pages/index.vue` 的 `.float-in-leave-to { position: absolute }` 与 `.proper-height { min-height: 70vh }`（防止翻页时高度塌陷）。

---

## 5. 弹层与侧栏

统一「开慢关快」的不对称规则：

- **打开**：`--dur-slow` + `--ease-out`
- **关闭**：`--dur-fast` + `--ease-in`

依据：关闭时用户意图已完成，动画慢即挡路；打开时需要时间建立空间感。

涉及 `app/components/popover/Search.vue`（现为 `transition: all 0.5s`，4 处，过慢）、`Lightbox.vue`、`app/components/blog/Mask.vue`、`BlogPanel.vue`、`app/components/partial/Dropdown.vue`、`Expand.vue`。

移动端抽屉侧栏补充 `overscroll-behavior: contain`。

---

## 6. 微交互替换与降级

26 处 `transition: all` 按属性显式化：

| 场景 | 时长 | 曲线 |
|---|---|---|
| 纯颜色变化（链接、目录高亮） | `--dur-instant` | `--ease-out` |
| hover 抬升、按钮、开关 | `--dur-fast` | `--ease-out` |
| 折叠、下拉、目录展开 | `--dur-base` | `--ease-inout` |

hover 类样式包 `@media (hover: hover)`，避免触屏设备停留在 hover 态。

降级在 `animation.scss` 收口：

```scss
@media (prefers-reduced-motion: reduce) {
	*, *::before, *::after {
		animation-duration: 0.01ms !important;
		transition-duration: 0.01ms !important;
	}
}
```

页面转场无需在此处理，Nuxt 插件自行检测并跳过。

---

## 影响文件

**新增**

- `app/plugins/nav-direction.client.ts`
- `app/composables/useSharedTitle.ts`

**改写**

- `app/assets/css/animation.scss`（令牌层、转场 CSS、列表动画、reduced-motion）
- `nuxt.config.ts`（`experimental.viewTransition`）
- `app/utils/anim.ts`（`getFixedDelay` → `getStagger`）
- `app/app.vue`（侧栏 `view-transition-name`）
- `app/components/post/Article.vue`、`PostHeader.vue`（共享元素）
- `app/pages/admin/index.vue`（`definePageMeta({ viewTransition: false })`）
- `app/assets/css/main.scss`、`reusable.scss`（令牌替换）
- 其余含 `transition: all` 的约 20 个组件（机械替换）

## 验证

1. `pnpm lint`（eslint + stylelint 均须通过）
2. `pnpm build` 通过
3. 实机检查清单：首页↔文章往返、翻页、切分类、深浅色切换、搜索开合、移动端抽屉、浏览器返回手势、开启「减少动态效果」后的表现

## 待实测风险

以下五项无法在设计阶段拍板，需实现时逐一验证并记录结论：

1. **`contain: paint` 与 `view-transition-name` 的相互作用。** `.article-card` 带 `contain: paint`，其内部 `<h2>` 加具名的行为在各引擎未经验证。若失效，退路是将名字移至卡片根节点，或移除该条 `contain`。
2. **Nuxt 滚动恢复与快照时序。** 滚动恢复是异步的，可能在快照之后执行导致转场中途跳动。必要时调整 `scrollBehavior` 时序。
3. **返程时的动画冲突。** 卡片的 `float-in` 入场动画会与共享元素变形争夺同一元素，需用 `data-nav="back"` 门控关闭。
4. **`BlogFallingDecor` 在转场中的表现未知**，可能需要单独具名或排除出快照。
5. **Firefox 的同文档 View Transitions 支持情况无实测数据。** 不支持时退化为瞬时切换，无破绽但也无动效。

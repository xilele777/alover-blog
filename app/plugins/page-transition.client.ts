/**
 * 决定某次导航要不要走 View Transitions。
 *
 * 跨层级导航（列表 ↔ 文章）一律关掉整页转场：root 快照是整张视口位图，
 * 而列表页与文章页的滚动位置、正文高度差异极大，交叉淡入两张毫无共同点的
 * 位图读作「闪」而不是「过渡」；长文章的快照纹理还会额外拖慢这一帧。
 * 同层级导航（首页 ↔ 归档、上一篇 ↔ 下一篇）两端结构相近，保留交叉淡入。
 *
 * 用 beforeEach 而非 afterEach：Nuxt 的 view-transitions 插件在 beforeResolve
 * 里读 to.meta.viewTransition，本守卫早于它执行，写入的值能被读到。
 * 该插件只读 to.meta 而不读 from.meta，因此去程与返程都必须在此判定——
 * 返程时 to 是列表页，只在文章页上写 definePageMeta 会漏掉返程。
 */

/** 列表类页面视为第 0 层，其余（catch-all 文章页）为第 1 层 */
const LIST_ROUTES = new Set([
	'/',
	'/archive',
	'/link',
	'/memory',
	'/preview',
	'/projects',
	'/tags',
	'/treasure',
	'/weekly',
])

const normalize = (path: string) => path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
const rank = (path: string) => LIST_ROUTES.has(normalize(path)) ? 0 : 1

export default defineNuxtPlugin(() => {
	useRouter().beforeEach((to, from) => {
		to.meta.viewTransition = rank(to.path) === rank(from.path)
	})
})

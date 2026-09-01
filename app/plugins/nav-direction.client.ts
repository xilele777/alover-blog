/**
 * 为 View Transitions 标注导航方向：在 <html> 上写 data-nav="forward | back | flat"，
 * animation.scss 据此决定整页转场的位移方向。
 *
 * 用 beforeEach 而非 afterEach：它保证早于 Nuxt view-transitions 插件的
 * beforeResolve，属性因此在拍快照前就位。
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
	const router = useRouter()

	// 浏览器前进/后退一律按「返回」处理，与用户的手势预期一致。
	// vue-router 的 popstate 处理器先注册，但它把守卫排进微任务，
	// 因此本监听器仍能在 beforeEach 执行前把标记置位
	let isPop = false
	window.addEventListener('popstate', () => {
		isPop = true
	})

	router.beforeEach((to, from) => {
		const delta = rank(to.path) - rank(from.path)
		document.documentElement.dataset.nav
			= isPop || delta < 0 ? 'back' : delta > 0 ? 'forward' : 'flat'
		isPop = false
	})
})

export default defineNuxtPlugin(() => {
	// 百度统计
	if (process.client) {
		// 初始化 _hmt
		window._hmt = window._hmt || []

		// 加载百度统计脚本
		const hm = document.createElement('script')
		hm.src = 'https://hm.baidu.com/hm.js?ca59dc06b9af328c8b934150355ed82b'
		const s = document.getElementsByTagName('script')[0]
		s.parentNode?.insertBefore(hm, s)

		// 监听路由变化，统计页面访问
		const router = useRouter()
		router.afterEach((to) => {
			window._hmt?.push(['_trackPageview', to.fullPath])
		})
	}
})

export default defineNuxtPlugin(() => {
  if (process.client) {
    // 性能监控：使用 requestIdleCallback 延迟执行非关键任务
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        // 预加载关键路由
        const router = useRouter()
        router.getRoutes().slice(0, 5).forEach((route) => {
          router.resolve(route.path)
        })
      })
    }

    // 添加性能监控
    if (window.performance && window.performance.getEntriesByType) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (perfData) {
            // 可以将性能数据发送到分析服务
            console.log('页面加载性能指标:', {
              DNS: Math.round(perfData.domainLookupEnd - perfData.domainLookupStart),
              TCP: Math.round(perfData.connectEnd - perfData.connectStart),
              TTFB: Math.round(perfData.responseStart - perfData.requestStart),
              DOMContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
              Load: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
            })
          }
        }, 0)
      })
    }
  }
})

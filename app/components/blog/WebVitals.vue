<script setup lang="ts">
/**
 * Web Vitals 性能监控组件
 * 追踪关键性能指标：LCP, INP, CLS, FCP, TTFB
 */

// 仅在生产环境且浏览器支持时启用
const isSupported = import.meta.client && 'PerformanceObserver' in window

onMounted(() => {
	if (!isSupported || import.meta.dev)
		return

	// 动态导入 web-vitals 以避免阻塞主线程
	import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
		// web-vitals v4 起用 INP 取代了已废弃的 FID，
		// 继续解构 onFID 会拿到 undefined 并在调用时抛 TypeError
		onCLS(metric => sendToAnalytics('CLS', metric.value))
		onFCP(metric => sendToAnalytics('FCP', metric.value))
		onINP(metric => sendToAnalytics('INP', metric.value))
		onLCP(metric => sendToAnalytics('LCP', metric.value))
		onTTFB(metric => sendToAnalytics('TTFB', metric.value))
	}).catch((err) => {
		console.error('Failed to load web-vitals:', err)
	})
})

function sendToAnalytics(metric: string, value: number) {
	// 发送到分析服务（例如 Google Analytics, Umami 等）
	window.umami?.track('web-vitals', {
		metric,
		value: Math.round(value),
	})
}
</script>

<template>
<div />
</template>

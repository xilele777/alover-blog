<script setup lang="ts">
/**
 * Web Vitals 性能监控组件
 * 追踪关键性能指标：LCP, FID, CLS, FCP, TTFB
 */

import { useHead } from '#app'

// 仅在生产环境且浏览器支持时启用
const isSupported = import.meta.client && 'PerformanceObserver' in window

onMounted(() => {
	if (!isSupported || import.meta.dev)
		return

	// 动态导入 web-vitals 以避免阻塞主线程
	import('web-vitals').then(({ onCLS, onFCP, onFID, onLCP, onTTFB }) => {
		// Cumulative Layout Shift (累积布局偏移)
		onCLS((metric) => {
			console.log('CLS:', metric.value)
			sendToAnalytics('CLS', metric.value)
		})

		// First Contentful Paint (首次内容绘制)
		onFCP((metric) => {
			console.log('FCP:', metric.value)
			sendToAnalytics('FCP', metric.value)
		})

		// First Input Delay (首次输入延迟)
		onFID((metric) => {
			console.log('FID:', metric.value)
			sendToAnalytics('FID', metric.value)
		})

		// Largest Contentful Paint (最大内容绘制)
		onLCP((metric) => {
			console.log('LCP:', metric.value)
			sendToAnalytics('LCP', metric.value)
		})

		// Time to First Byte (首字节时间)
		onTTFB((metric) => {
			console.log('TTFB:', metric.value)
			sendToAnalytics('TTFB', metric.value)
		})
	}).catch((err) => {
		console.error('Failed to load web-vitals:', err)
	})
})

function sendToAnalytics(metric: string, value: number) {
	// 发送到分析服务（例如 Google Analytics, Umami 等）
	if (window.umami) {
		window.umami.track('web-vitals', {
			metric,
			value: Math.round(value),
		})
	}

	// 或者发送到自定义端点
	// navigator.sendBeacon('/api/analytics', JSON.stringify({ metric, value }))
}
</script>

<template>
	<div />
</template>

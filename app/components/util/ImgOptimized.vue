<script setup lang="ts">
/**
 * 优化的图片组件
 * 自动使用 WebP 格式（如果存在），并提供原始格式作为后备
 */

interface Props {
	src: string
	alt: string
	loading?: 'eager' | 'lazy'
	fetchpriority?: 'high' | 'low' | 'auto'
	class?: string
}

const props = withDefaults(defineProps<Props>(), {
	loading: 'lazy',
	fetchpriority: 'auto',
})

// 生成 WebP 路径
const webpSrc = computed(() => {
	const ext = /\.(jpg|jpeg|png)$/i
	return props.src.replace(ext, '.webp')
})
</script>

<template>
	<picture>
		<!-- WebP 格式（现代浏览器） -->
		<source type="image/webp" :srcset="webpSrc">
		<!-- 原始格式（回退） -->
		<img
			:src="src"
			:alt="alt"
			:loading="loading"
			:fetchpriority="fetchpriority"
			:class="class"
		>
	</picture>
</template>

<style scoped>
picture {
	display: contents;
}
</style>

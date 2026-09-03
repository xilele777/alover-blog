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
	<picture :class="class">
		<!-- WebP 格式（现代浏览器） -->
		<source type="image/webp" :srcset="webpSrc">
		<!-- 原始格式（回退） -->
		<img
			:src="src"
			:alt="alt"
			:loading="loading"
			:fetchpriority="fetchpriority"
		>
	</picture>
</template>

<style scoped>
/* picture 标签继承传入的 class 样式 */
picture {
	/* 对于绝对定位等特殊布局，让 picture 表现得像 img */
	display: block;
}

/* img 继承 picture 的尺寸 */
picture > img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: inherit;
}
</style>

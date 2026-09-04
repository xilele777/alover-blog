<script setup lang="ts">
/**
 * 优化的图片组件
 * 自动使用 WebP 格式（如果存在），并提供原始格式作为后备
 *
 * 注意：class 落在组件根元素 picture 上（Vue 会把父组件的 scope id 加到子组件根元素），
 * 父组件的 scoped 样式无法命中内部的 img，因此 img 的裁切方式只能由本组件决定，
 * 消费方需要改的话用 --img-object-fit 覆盖。
 */

import imageVariants from '~/image-variants.json'

interface Props {
	src: string
	alt: string
	loading?: 'eager' | 'lazy'
	fetchpriority?: 'high' | 'low' | 'auto'
	class?: string
	/** 该图在版面上的显示宽度，用于让浏览器从 srcset 里挑合适的尺寸 */
	sizes?: string
}

const props = withDefaults(defineProps<Props>(), {
	loading: 'lazy',
	fetchpriority: 'auto',
	sizes: '100vw',
})

const RASTER_EXT = /\.(?:jpg|jpeg|png)$/i
const WEBP_EXT = /\.webp$/i

// 生成 WebP 路径
const webpSrc = computed(() => props.src.replace(RASTER_EXT, '.webp'))

/**
 * scripts/optimize-images.js 会为每张图生成 480/720/960 宽的变体，
 * 并把可用宽度写进 image-variants.json（最后一项是原图宽度）。
 * 清单里查不到的图片就退回单一 src，不会出现 404 的候选项。
 */
const webpSrcset = computed(() => {
	const widths: number[] | undefined = (imageVariants as Record<string, number[]>)[webpSrc.value]
	if (!widths || widths.length < 2)
		return undefined

	const fullWidth = widths[widths.length - 1]
	const base = webpSrc.value.replace(WEBP_EXT, '')
	return widths
		.map(w => `${w === fullWidth ? webpSrc.value : `${base}-${w}w.webp`} ${w}w`)
		.join(', ')
})
</script>

<template>
<picture :class="props.class">
	<!-- WebP 格式（现代浏览器） -->
	<source
		type="image/webp"
		:srcset="webpSrcset ?? webpSrc"
		:sizes="webpSrcset ? sizes : undefined"
	>
	<!-- 原始格式（回退） -->
	<img
		:src="src"
		:alt="alt"
		:loading="loading"
		:fetchpriority="fetchpriority"
	>
</picture>
</template>

<style lang="scss" scoped>
picture {
	// 对于绝对定位等特殊布局，让 picture 表现得像 img
	display: block;
}

picture > img {
	// 默认值 cover 而非 inherit：inherit 会从 picture 拿到初始值 fill，
	// 导致封面图被拉伸变形（Lighthouse image-aspect-ratio 因此不通过）
	display: block;
	width: 100%;
	height: 100%;
	border-radius: inherit;
	object-fit: var(--img-object-fit, cover);
}
</style>

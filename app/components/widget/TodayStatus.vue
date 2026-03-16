<script setup lang="ts">
const { data: todayStatus } = await useAsyncData(
	'/today-status-widget',
	() => queryCollection('content').path('/today-status').first(),
)
</script>

<template>
<BlogWidget
	card
	dim
	title="今日状态"
	bg-img="https://p.qlogo.cn/gh/169994096/169994096/100/"
	bg-right
>
	<div class="title text-creative">
		今日状态
	</div>

	<ContentRenderer
		v-if="todayStatus"
		:value="todayStatus"
		class="status-content article"
	/>
	<p v-else class="empty">
		可在 content/today-status.md 配置今日状态。
	</p>
</BlogWidget>
</template>

<style lang="scss" scoped>
.title {
	background-clip: text;
	background-image: linear-gradient(60deg, var(--c-accent) -30%, var(--c-primary), var(--c-text-1));
	background-position: 100% 0;
	background-size: 200%;
	font-size: 1.8em;
	font-weight: 800;
	letter-spacing: 0.05em;
	color: transparent;
	transition: background-position 0.2s;

	.blog-widget:hover & {
		background-position: 0 0;
	}
}

.status-content {
	font-size: 0.95em;
	line-height: 1.8;
}

.empty {
	font-size: 0.9em;
	color: var(--c-text-3);
}

:deep(.bg-img).bg-img.bg-img {
	opacity: 0.5;
}
</style>

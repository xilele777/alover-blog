<script setup lang="ts">
const layoutStore = useLayoutStore()
const { asideWidgets } = storeToRefs(layoutStore)

const { widgets } = useWidgets(asideWidgets)
</script>

<template>
<BlogMask
	:show="layoutStore.state === 'aside'"
	class="widescreen-only"
	@click="layoutStore.close()"
/>

<!-- 不能用 Transition 实现弹出收起动画，因为宽屏状态始终显示 -->
<!-- 如果为空数组则隐藏 -->
<aside v-if="asideWidgets?.length" id="blog-aside" :class="{ show: layoutStore.state === 'aside' }">
	<TransitionGroup name="float-in">
		<!-- 更换页面时相同 key 的组件不会更新 -->
		<component :is="widget.comp" v-for="widget in widgets" :key="widget.name" />
	</TransitionGroup>
</aside>
</template>

<style lang="scss" scoped>
#blog-aside {
	overflow: auto;
	padding: 0.5rem;
	z-index: var(--z-index-popover);

	@media (max-width: $breakpoint-widescreen) {
		position: fixed;
		inset-inline-end: 0;
		top: 0;
		width: 320px;
		height: auto;
		max-width: 100%;
		max-height: 100%;
		transform: var(--transform-end-far);

		// 开慢关快：浏览器取「目标态」的 transition，所以进场时长写在 .show 上
		transition: transform var(--dur-fast) var(--ease-in);
		overscroll-behavior: contain; // 抽屉态下滑到头不要把身后的正文一起带着滚

		:deep(.blog-widget) {
			padding: 0.5rem;
			border-radius: 1rem;
			box-shadow: var(--box-shadow-1), var(--box-shadow-2);
			background-color: var(--ld-bg-blur);
			backdrop-filter: blur(0.5rem);
		}

		&.show {
			transform: none;
			transition-duration: var(--dur-slow);
			transition-timing-function: var(--ease-out);
		}
	}
}

.float-in-leave-active {
	position: absolute;
}
</style>

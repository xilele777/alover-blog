<script setup lang="ts">
const route = useRoute()
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
</script>

<template>
<NuxtLoadingIndicator />
<NuxtRouteAnnouncer :style="{ position: 'absolute' }" />
<BlogFallingDecor v-if="!isAdminRoute" />
<BlogSkipToContent v-if="!isAdminRoute" />
<BlogSidebar v-if="!isAdminRoute" />
<div id="content" :class="{ 'admin-shell': isAdminRoute }">
	<main id="main-content">
		<div class="page-view">
			<NuxtPage />
		</div>
		<BlogFooter v-if="!isAdminRoute" />
	</main>
	<BlogAside v-if="!isAdminRoute" />
</div>
<BlogPanel v-if="!isAdminRoute" />
<BikariyaModals />
</template>

<!-- eslint-disable-next-line vue/enforce-style-attribute -->
<style lang="scss">
#blog-root {
	display: flex;
	justify-content: center;
	gap: 1rem;
	min-width: 0;
	isolation: isolate;
}

#blog-sidebar, #blog-aside {
	flex: 0 0 280px; // 防止搜索框 grow
	position: sticky;
	top: 0;
	height: 100vh;
	height: 100dvh;
	min-width: 0; // 防止搜索框撑开页面
	scrollbar-width: thin;

	@media (max-width: $breakpoint-widescreen) {
		flex-shrink: 0.2;
	}
}

#content {
	display: flex;
	gap: 1rem;

	// 若设置的是 max-width，则内部 main 宽度为 fit-content，可能无法撑满
	// 此时即使设置 flex-grow，也会影响 #sidebar 无法正确 shrink
	width: $breakpoint-widescreen;
	min-width: 0; // 解决父级 flexbox 设置 justify-content: center 时溢出左侧消失的问题

	// 此处不建议给内容设置 padding
	> #main-content {
		display: flex;
		flex-direction: column;
		flex-grow: 1; // 使较小宽度的内容占满

		// overflow: hidden; // 会使一部分元素吸顶失效

		// 使内容正确计算宽度而不横向溢出
		// 也可设置 width: 0 或者 contain: inline-size（兼容性不佳）
		min-width: 0;
	}

	.page-view {
		// out-in 过渡期间旧页面已卸载、新页面未挂载，此处占位防止高度塌陷导致的滚动跳动
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		min-width: 0;
	}

	&:not(.admin-shell) > #main-content {
		min-height: 100dvh;
	}

	&.admin-shell {
		overflow: hidden;
		width: 100%;
		height: 100vh;
		max-width: none;

		> #main-content {
			width: 100%;
			height: 100%;
		}
	}
}
</style>

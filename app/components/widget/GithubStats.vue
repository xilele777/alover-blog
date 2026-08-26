<script setup lang="ts">
import type { GithubStatsResponse } from '~/types/github-stats'

// 与 GithubContribution 共享同一 key，页面内只请求一次
const { data: stats } = useAsyncData<GithubStatsResponse | null>(
	'github_stats',
	() => $fetch('/api/github/stats'),
	{ default: () => null },
)

const statItems = computed(() => {
	const s = stats.value?.stats
	if (!s)
		return []
	return [
		{ icon: 'ph:git-repository-bold', label: '仓库', value: s.repoTotal, tip: `含私有仓库 ${s.repoPrivate} 个` },
		{ icon: 'ph:star-bold', label: '获星仓库', value: s.repoStarred },
		{ icon: 'ph:git-commit-bold', label: '提交', value: formatNumber(s.commitTotal) },
	]
})
</script>

<template>
<BlogWidget v-if="statItems.length" card title="GitHub 统计">
	<div class="github-stats">
		<div v-for="item in statItems" :key="item.label" class="stat-item" :title="item.tip">
			<Icon :name="item.icon" />
			<strong>{{ item.value }}</strong>
			<span>{{ item.label }}</span>
		</div>
	</div>
</BlogWidget>
</template>

<style lang="scss" scoped>
.github-stats {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	border-top: 1px solid var(--c-border);
}

.stat-item {
	display: grid;
	justify-items: center;
	gap: 0.25rem;
	padding: 0.65rem 0.2rem 0.45rem;
	color: var(--c-text-2);

	+ .stat-item {
		border-inline-start: 1px solid var(--c-border);
	}

	> .iconify {
		font-size: 1.1rem;
		color: var(--c-primary);
	}

	strong {
		font-family: var(--font-creative);
		font-size: 1.05rem;
		font-weight: 650;
		line-height: 1;
		color: var(--c-text);
	}

	span {
		font-size: 0.72rem;
		white-space: nowrap;
	}
}
</style>

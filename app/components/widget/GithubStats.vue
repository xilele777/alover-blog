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
		{ label: '仓库总数', value: `${s.repoTotal} 个`, tip: `含私有仓库 ${s.repoPrivate} 个` },
		{ label: 'Star 仓库', value: `${s.repoStarred} 个` },
		{ label: 'Commit 总数', value: formatNumber(s.commitTotal) },
	]
})
</script>

<template>
<BlogWidget v-if="statItems.length" card title="GitHub 统计">
	<ZDlGroup size="medium" :items="statItems" />
</BlogWidget>
</template>

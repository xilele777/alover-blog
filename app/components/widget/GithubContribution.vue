<script setup lang="ts">
import type { GithubStatsResponse } from '~/types/github-stats'

// 与 GithubStats 共享同一 key，页面内只请求一次
const { data: stats } = useAsyncData<GithubStatsResponse | null>(
	'github_stats',
	() => $fetch('/api/github/stats'),
	{ default: () => null },
)

// 近 4 个月滚动窗口：取贡献日历尾部 17 周
const weeks = computed(() => stats.value?.contributions.weeks.slice(-17) ?? [])
const totalContributions = computed(() => stats.value?.contributions.totalContributions ?? 0)

function levelClass(level: string) {
	return `lv-${level.toLowerCase().replaceAll('_', '-')}`
}
</script>

<template>
<BlogWidget v-if="stats" card title="GitHub 贡献">
	<div class="contribution-summary">
		<span>过去一年</span>
		<strong>{{ formatNumber(totalContributions) }}</strong>
		<span>次贡献</span>
	</div>
	<div
		class="heatmap"
		role="img"
		:aria-label="`过去 17 周的 GitHub 贡献热力图，共 ${formatNumber(totalContributions)} 次贡献`"
	>
		<div v-for="week, wi in weeks" :key="wi" class="heat-week">
			<span
				v-for="day in week.contributionDays"
				:key="day.date"
				class="heat-day"
				:class="levelClass(day.contributionLevel)"
				:title="`${day.date}：${day.contributionCount} 次贡献`"
			/>
		</div>
	</div>
</BlogWidget>
</template>

<style lang="scss" scoped>
.contribution-summary {
	display: flex;
	align-items: baseline;
	gap: 0.35em;
	margin-bottom: 0.75rem;
	color: var(--c-text-2);
	font-size: 0.8em;

	strong {
		color: var(--c-text);
		font-family: var(--font-creative);
		font-size: 1.7em;
		font-weight: 650;
		line-height: 1;
	}
}

.heatmap {
	display: flex;
	padding: 0.3rem;
	border: 1px solid var(--c-border);
	border-radius: 0.45rem;
	background-color: var(--c-bg-1);
	gap: 2px;
}

.heat-week {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 2px;
}

.heat-day {
	aspect-ratio: 1;
	border-radius: 2px;
	background-color: var(--c-bg-3);
	transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
	cursor: default;

	&:hover {
		position: relative;
		box-shadow: 0 0 0 1px var(--c-bg);
		transform: scale(1.25);
		z-index: 1;
	}
}

// GitHub 绿，浅色主题
.lv-first-quartile { background-color: #9BE9A8; }
.lv-second-quartile { background-color: #40C463; }
.lv-third-quartile { background-color: #30A14E; }
.lv-fourth-quartile { background-color: #216E39; }

// 深色主题加深
:global(.dark) {
	.lv-first-quartile { background-color: #0E4429; }
	.lv-second-quartile { background-color: #006D32; }
	.lv-third-quartile { background-color: #26A641; }
	.lv-fourth-quartile { background-color: #39D353; }
}
</style>

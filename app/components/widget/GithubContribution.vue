<script setup lang="ts">
import type { GithubStatsResponse } from '~/types/github-stats'
import projectsData from '~~/data/projects.yml'

// 与 GithubStats 共享同一 key，页面内只请求一次
const { data: stats } = useAsyncData<GithubStatsResponse | null>(
	'github_stats',
	() => $fetch('/api/github/stats'),
	{ default: () => null },
)

// 近 4 个月滚动窗口：取贡献日历尾部 17 周
const weeks = computed(() => stats.value?.contributions.weeks.slice(-17) ?? [])
const totalContributions = computed(() => stats.value?.contributions.totalContributions ?? 0)

const githubUsername = (projectsData.github as { username?: string } | undefined)?.username ?? 'xilele777'
const githubUrl = `https://github.com/${githubUsername}`

function levelClass(level: string) {
	return `lv-${level.toLowerCase().replaceAll('_', '-')}`
}
</script>

<template>
<BlogWidget v-if="stats" card title="GitHub 贡献">
	<a
		class="heatmap-link"
		:href="githubUrl"
		target="_blank"
		rel="noopener"
		:title="`打开 ${githubUsername} 的 GitHub 主页`"
	>
		<div class="heat-total">
			近一年 {{ formatNumber(totalContributions) }} 次贡献
		</div>
		<div class="heatmap">
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
	</a>
</BlogWidget>
</template>

<style lang="scss" scoped>
.heatmap-link {
	display: block;
	text-decoration: none;
	color: inherit;
}

.heat-total {
	margin-bottom: 0.5em;
	font-size: 0.85em;
	text-align: center;
	color: var(--c-text-2);
	transition: color 0.2s;

	.heatmap-link:hover & {
		color: var(--c-primary);
	}
}

.heatmap {
	display: flex;
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
	transition: transform 0.15s;

	&:hover {
		transform: scale(1.25);
	}
}

// GitHub 绿，浅色主题
.lv-first-quartile { background-color: #9BE9A8; }
.lv-second-quartile { background-color: #40C463; }
.lv-third-quartile { background-color: #30A14E; }
.lv-fourth-quartile { background-color: #216E39; }

// 深色主题加深
.dark {
	.lv-first-quartile { background-color: #0E4429; }
	.lv-second-quartile { background-color: #006D32; }
	.lv-third-quartile { background-color: #26A641; }
	.lv-fourth-quartile { background-color: #39D353; }
}
</style>

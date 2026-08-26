<script setup lang="ts">
// 与 weekly.vue 页面共享同一 key，不重复请求
const { data: listRaw } = await useAsyncData(
	'weekly_posts',
	() => useArticleIndexOptions(`${WEEKLY_STEM_PREFIX}%`),
	{ default: () => [] },
)
const listPublished = usePublishedArticles(listRaw)

const issues = computed(() => listPublished.value
	.map(article => ({ ...article, ...parseWeekly(article.title, article.date) }))
	.sort((a, b) => (b.date || '').localeCompare(a.date || '')))

const totalWords = computed(() => issues.value
	.reduce((sum, cur) => sum + (cur.readingTime?.words || 0), 0))

const totalMinutes = computed(() => issues.value
	.reduce((sum, cur) => sum + (cur.readingTime?.minutes || 0), 0))

// 周报每周一期：下次更新 = 最近一期发布日 + 7 天
const nextUpdate = computed(() => {
	const latest = issues.value[0]?.date
	if (!latest)
		return '—'
	const next = new Date(new Date(latest).getTime() + 7 * 24 * 60 * 60 * 1000)
	return formatRelativeTime(next.toISOString())
})

function formatMinutes(minutes: number) {
	if (!minutes)
		return '—'
	if (minutes < 60)
		return `${minutes} 分钟`
	const hours = Math.floor(minutes / 60)
	const rest = Math.round(minutes % 60)
	return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`
}

const statItems = computed(() => [
	{ label: '总期数', value: `${issues.value.length} 期` },
	{ label: '累计字数', value: formatNumber(totalWords.value) },
	{ label: '阅读时长', value: formatMinutes(totalMinutes.value) },
	{ label: '下次更新', value: nextUpdate.value },
])
</script>

<template>
<BlogWidget card title="周报统计">
	<ZDlGroup size="medium" :items="statItems" />
</BlogWidget>
</template>

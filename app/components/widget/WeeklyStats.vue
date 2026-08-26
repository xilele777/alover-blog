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
	{ label: '累计字数', value: formatNumber(totalWords.value) },
	{ label: '阅读时长', value: formatMinutes(totalMinutes.value) },
	{ label: '下次更新', value: nextUpdate.value },
])
</script>

<template>
<BlogWidget card title="周报统计">
	<div class="weekly-overview">
		<div class="issue-total">
			<Icon name="ph:newspaper-clipping-bold" />
			<div>
				<span>已发布</span>
				<strong>{{ issues.length }}</strong>
				<em>期周报</em>
			</div>
		</div>
		<dl class="weekly-stats">
			<div v-for="item in statItems" :key="item.label">
				<dt>{{ item.label }}</dt>
				<dd>{{ item.value }}</dd>
			</div>
		</dl>
	</div>
</BlogWidget>
</template>

<style lang="scss" scoped>
.weekly-overview {
	display: grid;
	grid-template-columns: 5.6rem 1fr;
	gap: 0.75rem;
	align-items: stretch;
}

.issue-total {
	display: grid;
	align-content: center;
	justify-items: center;
	gap: 0.35rem;
	border-inline-end: 1px solid var(--c-border);
	color: var(--c-text-2);

	> .iconify {
		font-size: 1.15rem;
		color: var(--c-primary);
	}

	span,
	em {
		font-size: 0.72rem;
		font-style: normal;
	}

	strong {
		margin: 0 0.12rem;
		font-family: var(--font-creative);
		font-size: 1.55rem;
		font-weight: 650;
		line-height: 1;
		color: var(--c-text);
	}
}

.weekly-stats {
	display: grid;
	gap: 0.35rem;

	> div {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	dt {
		font-size: 0.75rem;
		color: var(--c-text-2);
	}

	dd {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 600;
		text-align: end;
		color: var(--c-text-1);
	}
}
</style>

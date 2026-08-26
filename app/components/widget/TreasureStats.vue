<script setup lang="ts">
import treasureData from '~~/data/treasure.yml'

interface TreasureCategory {
	name: string
	icon: string
	items: { title: string, rating?: number }[]
}

const categories = treasureData.categories as TreasureCategory[]

const stats = computed(() => {
	const total = categories.reduce((sum, c) => sum + c.items.length, 0)
	const ratings = categories.flatMap(c => c.items).map(i => i.rating).filter((r): r is number => !!r)
	const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
	return { total, avg }
})

const items = computed(() => [
	{ label: '收藏总数', value: `${stats.value.total} 件` },
	...categories.map(c => ({ label: c.name, value: `${c.items.length} 件` })),
	{ label: '平均评分', value: stats.value.avg ? `${stats.value.avg.toFixed(1)} 星` : '—' },
])
</script>

<template>
<BlogWidget card title="藏宝统计">
	<ZDlGroup size="medium" :items="items" />
</BlogWidget>
</template>

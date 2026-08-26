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
	...categories.map(category => ({
		...category,
		count: category.items.length,
	})),
])
</script>

<template>
<BlogWidget card title="藏宝统计">
	<div class="treasure-overview">
		<div class="total">
			<Icon name="ph:treasure-chest-bold" />
			<div>
				<span>已收藏</span>
				<strong>{{ stats.total }}</strong>
				<em>件</em>
			</div>
			<small>平均 {{ stats.avg ? `${stats.avg.toFixed(1)} 星` : '暂无评分' }}</small>
		</div>
		<div class="category-list">
			<div v-for="item in items" :key="item.name" class="category-item">
				<Icon :name="item.icon" />
				<span>{{ item.name }}</span>
				<strong>{{ item.count }}</strong>
			</div>
		</div>
	</div>
</BlogWidget>
</template>

<style lang="scss" scoped>
.treasure-overview {
	display: grid;
	gap: 0.7rem;
}

.total {
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: center;
	gap: 0.55rem;
	padding-bottom: 0.65rem;
	border-bottom: 1px solid var(--c-border);

	> .iconify {
		font-size: 1.45rem;
		color: var(--c-warning);
	}

	span,
	small {
		font-size: 0.75rem;
		color: var(--c-text-2);
	}

	strong {
		margin-inline: 0.2rem;
		font-family: var(--font-creative);
		font-size: 1.5rem;
		font-weight: 650;
		line-height: 1;
		color: var(--c-text);
	}

	em {
		font-size: 0.75rem;
		font-style: normal;
		color: var(--c-text-2);
	}
}

.category-list {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.35rem;
}

.category-item {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.25rem;
	min-width: 0;
	color: var(--c-text-2);

	> .iconify {
		font-size: 1rem;
		color: var(--c-primary);
	}

	span {
		overflow: hidden;
		font-size: 0.75rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	strong {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--c-text);
	}
}
</style>

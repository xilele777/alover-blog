<script setup lang="ts">
import treasureData from '~~/data/treasure.yml'

const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
layoutStore.setAside(['treasure-stats', 'blog-stats'])

useSeoMeta({
	title: '藏宝阁',
	ogType: 'website',
	description: `${appConfig.title}的藏宝阁，收录喜爱的电影、书籍、音乐等推荐。`,
})

interface TreasureItem {
	title: string
	cover: string
	link: string
	description?: string
	rating?: number
}

interface TreasureCategory {
	name: string
	icon: string
	items: TreasureItem[]
}

const categories = treasureData.categories as TreasureCategory[]

const tabs = computed(() => [
	{ name: '全部', icon: '' },
	...categories.map(c => ({ name: c.name, icon: c.icon })),
])

const activeCategory = ref('全部')

const filteredItems = computed(() => {
	if (activeCategory.value === '全部') {
		return categories.flatMap(c => c.items)
	}
	return categories.find(c => c.name === activeCategory.value)?.items ?? []
})
</script>

<template>
<div class="treasure proper-height">
	<div class="mobile-only">
		<BlogHeader to="/" suffix="藏宝阁" tag="h1" />
	</div>

	<header class="treasure-header">
		<h1 class="treasure-title">
			藏宝阁
		</h1>
		<p class="treasure-subtitle">
			我珍藏的那些好东西
		</p>
	</header>

	<nav class="treasure-tabs">
		<button
			v-for="tab in tabs"
			:key="tab.name"
			class="treasure-tab"
			:class="{ active: activeCategory === tab.name }"
			@click="activeCategory = tab.name"
		>
			<Icon v-if="tab.icon" :name="tab.icon" />
			<span>{{ tab.name }}</span>
		</button>
	</nav>

	<TransitionGroup
		v-if="filteredItems.length"
		tag="div"
		class="poster-grid"
		name="float-in"
	>
		<a
			v-for="item, index in filteredItems"
			:key="item.title + item.link"
			class="poster-card"
			:href="item.link"
			target="_blank"
			rel="noopener"
			:style="getFixedDelay(index * 0.03)"
		>
			<NuxtImg
				:src="item.cover"
				:alt="item.title"
				loading="lazy"
				class="poster-img"
			/>
			<div class="poster-overlay">
				<span v-if="item.description" class="poster-desc">{{ item.description }}</span>
				<span class="poster-title">{{ item.title }}</span>
				<div v-if="item.rating" class="poster-rating">
					<Icon
						v-for="i in 5"
						:key="i"
						name="ph:star-fill"
						:class="{ on: i <= item.rating }"
					/>
				</div>
			</div>
		</a>
	</TransitionGroup>

	<ZError
		v-else
		icon="ph:chest-simple-bold"
		title="暂无收藏"
	/>
</div>
</template>

<style lang="scss" scoped>
.treasure {
	padding: 1rem;
}

.treasure-header {
	margin-bottom: 1.5em;
}

.treasure-title {
	margin: 0;
	font-size: 1.6em;
	font-weight: 800;
}

.treasure-subtitle {
	margin: 0.2em 0 0;
	font-size: 0.9em;
	color: var(--c-text-3);
}

// 筛选 tab
.treasure-tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5em;
	margin-bottom: 1.5em;
}

.treasure-tab {
	display: inline-flex;
	align-items: center;
	gap: 0.35em;
	padding: 0.35em 0.9em;
	border: 1px solid var(--c-border);
	border-radius: 1em;
	background-color: transparent;
	font-size: 0.9em;
	color: var(--c-text-2);
	transition: all 0.2s;
	cursor: pointer;

	&:hover {
		border-color: var(--c-primary);
		color: var(--c-primary);
	}

	&.active {
		border-color: var(--c-primary);
		background-color: var(--c-primary-soft);
		font-weight: 600;
		color: var(--c-primary);
	}
}

// 海报墙
.poster-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	gap: 0.9em;
}

.poster-card {
	position: relative;
	overflow: hidden;
	border-radius: 0.75em;
	box-shadow: var(--box-shadow-2);
	transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s;
	animation: float-in 0.2s var(--delay) backwards;

	&:hover {
		box-shadow: var(--box-shadow-3);
		transform: translateY(-4px);

		.poster-img {
			transform: scale(1.05);
		}

		.poster-desc {
			opacity: 1;
			max-height: 3em;
		}
	}
}

.poster-img {
	display: block;
	width: 100%;
	aspect-ratio: 2 / 3;
	transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	object-fit: cover;
}

.poster-overlay {
	display: flex;
	flex-direction: column;
	gap: 0.2em;
	position: absolute;
	inset-inline: 0;
	bottom: 0;
	padding: 2.5em 0.6em 0.5em;
	background: linear-gradient(transparent, rgb(0 0 0 / 88%));
	color: white;
}

.poster-desc {
	display: -webkit-box;
	overflow: hidden;
	opacity: 0;
	max-height: 0;
	font-size: 0.8em;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	line-height: 1.35;
	color: rgb(255 255 255 / 85%);
	transition: max-height 0.25s ease, opacity 0.2s;
	-webkit-box-orient: vertical;
}

.poster-title {
	display: -webkit-box;
	overflow: hidden;
	font-size: 0.95em;
	font-weight: 600;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	line-height: 1.3;
	-webkit-box-orient: vertical;
}

.poster-rating {
	display: flex;
	gap: 0.15em;
	margin-top: 0.15em;

	> .iconify {
		font-size: 0.9em;
		color: rgb(255 255 255 / 35%);

		&.on {
			color: #F5C518;
		}
	}
}

@media (max-width: $breakpoint-mobile) {
	.poster-grid {
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6em;
	}

	// 移动端无 hover：描述常驻显示一行
	.poster-desc {
		opacity: 1;
		max-height: 1.5em;
		-webkit-line-clamp: 1;
		line-clamp: 1;
	}
}
</style>

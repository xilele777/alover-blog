<script setup lang="ts">
import treasureData from '~~/data/treasure.yml'

const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
layoutStore.setAside(['blog-stats', 'treasure-stats'])

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

const items = computed(() => categories.flatMap(category => category.items.map(item => ({
	...item,
	categoryName: category.name,
	categoryIcon: category.icon,
}))))
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
	</header>

	<div v-if="items.length" class="poster-grid">
		<a
			v-for="item, index in items"
			:key="item.title + item.link"
			class="poster-card"
			:href="item.link"
			target="_blank"
			rel="noopener"
			:title="`在外部网站查看：${item.title}`"
			:style="getFixedDelay(index * 0.03)"
		>
			<div class="poster-media">
				<NuxtImg
					:src="item.cover"
					:alt="item.title"
					loading="lazy"
					class="poster-img"
				/>
				<span class="type-pill"><Icon :name="item.categoryIcon" />{{ item.categoryName }}</span>
				<span v-if="item.rating" class="rating-pill" :aria-label="`${item.rating} 星`">
					<Icon name="ph:star-fill" />{{ item.rating }}
				</span>
				<span class="poster-open" aria-hidden="true"><Icon name="ph:arrow-up-right-bold" /></span>
			</div>
			<div class="poster-info">
				<p v-if="item.description" class="poster-description">{{ item.description }}</p>
			</div>
			<div class="poster-body">
				<h3 class="poster-title">{{ item.title }}</h3>
			</div>
		</a>
	</div>

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
	margin-bottom: 1rem;
}

.treasure-title {
	margin: 0;
	font-size: 1.6em;
	font-weight: 800;
}

.poster-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
	gap: 0.9em;
}

.poster-card {
	position: relative;
	overflow: hidden;
	border: 1px solid var(--c-border);
	border-radius: 0.55em;
	box-shadow: var(--box-shadow-2);
	background: var(--c-bg-1);
	transition: transform 0.2s ease, border-color 0.2s, box-shadow 0.2s;
	animation: float-in 0.2s var(--delay) backwards;

	&:hover {
		border-color: var(--c-primary);
		box-shadow: var(--box-shadow-3);
		transform: translateY(-3px);

		.poster-img {
			transform: scale(1.04);
		}

		.poster-open {
			opacity: 1;
			transform: translate(0, 0);
		}

		.poster-info {
			opacity: 1;
			transform: translateY(0);
		}

		.poster-description {
			opacity: 1;
			max-height: 3em;
		}
	}
}

.poster-media {
	position: relative;
	overflow: hidden;
}

.poster-img {
	display: block;
	width: 100%;
	aspect-ratio: 4 / 5;
	transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	object-fit: cover;
}

.poster-info {
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	position: absolute;
	opacity: 0;
	inset: auto 0 0;
	min-height: 52%;
	padding: 3.5rem 0.7rem 0.7rem;
	background: linear-gradient(transparent 0%, rgb(0 0 0 / 86%) 58%, rgb(0 0 0 / 96%) 100%);
	color: white;
	transform: translateY(12%);
	transition: opacity 0.25s ease, transform 0.3s ease;
}

.poster-body {
	display: flex;
	align-items: center;
	min-height: 2.5rem;
	padding: 0.55rem 0.7rem 0.6rem;
}

.poster-title {
	display: block;
	overflow: hidden;
	margin: 0;
	font-size: 0.92rem;
	font-weight: 650;
	line-height: 1.35;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text);
}

.poster-description {
	display: -webkit-box;
	overflow: hidden;
	opacity: 0;
	max-height: 0;
	margin: 0.25rem 0 0;
	font-size: 0.76rem;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	line-height: 1.45;
	color: rgb(255 255 255 / 82%);
	transition: max-height 0.25s ease, opacity 0.2s ease;
	-webkit-box-orient: vertical;
}

.type-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	position: absolute;
	top: 0.5rem;
	left: 0.5rem;
	padding: 0.22rem 0.45rem;
	border-radius: 0.3rem;
	background: rgb(0 0 0 / 65%);
	font-size: 0.68rem;
	color: white;
}

.poster-open {
	display: grid;
	place-items: center;
	position: absolute;
	opacity: 0;
	top: 0.5rem;
	right: 0.5rem;
	width: 1.65rem;
	height: 1.65rem;
	border-radius: 50%;
	background: var(--c-primary);
	color: var(--c-bg);
	transform: translate(0.25rem, -0.25rem);
	transition: opacity 0.2s, transform 0.2s;
}

.rating-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.2rem;
	position: absolute;
	right: 0.5rem;
	bottom: 0.5rem;
	padding: 0.22rem 0.42rem;
	border-radius: 0.3rem;
	background: rgb(0 0 0 / 68%);
	backdrop-filter: blur(3px);
	font-size: 0.68rem;
	font-weight: 650;
	color: #F5C518;

	> .iconify {
		font-size: 0.75rem;
	}
}

@media (max-width: $breakpoint-mobile) {
	.poster-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.6em;
	}

	.poster-info {
		opacity: 1;
		transform: translateY(0);
	}

	.poster-description {
		opacity: 1;
		max-height: 3em;
	}
}
</style>

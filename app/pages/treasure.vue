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
		<p class="treasure-subtitle">
			我珍藏的那些好东西
		</p>
		<span class="treasure-count">共 {{ items.length }} 件收藏</span>
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
				<span class="poster-open" aria-hidden="true"><Icon name="ph:arrow-up-right-bold" /></span>
			</div>
			<div class="poster-body">
				<h3>{{ item.title }}</h3>
				<p v-if="item.description" class="poster-description">{{ item.description }}</p>
				<div v-if="item.rating" class="poster-rating" :aria-label="`${item.rating} 星`">
					<Icon
						v-for="i in 5"
						:key="i"
						name="ph:star-fill"
						:class="{ on: i <= item.rating }"
					/>
					<span>{{ item.rating }}</span>
				</div>
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
	position: relative;
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

.treasure-count {
	display: inline-block;
	margin-top: 0.65rem;
	padding: 0.22rem 0.55rem;
	border: 1px solid var(--c-border);
	border-radius: 0.35rem;
	font-size: 0.72rem;
	color: var(--c-text-3);
}

.poster-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
	gap: 0.9em;
}

.poster-card {
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

		.poster-description {
			color: var(--c-text);
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

.poster-body {
	display: grid;
	gap: 0.35rem;
	padding: 0.65rem 0.7rem 0.7rem;
}

.poster-body h3 {
	display: -webkit-box;
	overflow: hidden;
	margin: 0;
	font-size: 0.9rem;
	font-weight: 650;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	line-height: 1.35;
	color: var(--c-text);
	-webkit-box-orient: vertical;
}

.poster-description {
	display: -webkit-box;
	overflow: hidden;
	margin: 0;
	font-size: 0.76rem;
	-webkit-line-clamp: 3;
	line-clamp: 3;
	line-height: 1.45;
	color: var(--c-text-2);
	transition: color 0.2s;
	-webkit-box-orient: vertical;
}

.poster-rating {
	display: flex;
	align-items: center;
	gap: 0.15em;
	margin-top: 0.1em;

	> .iconify {
		font-size: 0.78rem;
		color: var(--c-border-strong);

		&.on {
			color: #F5C518;
		}
	}

	span {
		margin-inline-start: 0.25rem;
		font-size: 0.72rem;
		color: var(--c-text-3);
	}
}

@media (max-width: $breakpoint-mobile) {
	.poster-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.6em;
	}
}
</style>

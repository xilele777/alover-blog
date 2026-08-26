<script setup lang="ts">
import treasureData from '~~/data/treasure.yml'

const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
layoutStore.setAside([])

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

	<section
		v-for="category in categories"
		:key="category.name"
		class="treasure-section"
	>
		<h2 class="section-title">
			<Icon :name="category.icon" />
			<span>{{ category.name }}</span>
		</h2>

		<TransitionGroup
			v-if="category.items.length"
			tag="div"
			class="treasure-grid"
			name="float-in"
		>
			<a
				v-for="item, index in category.items"
				:key="item.title"
				class="treasure-card"
				:href="item.link"
				target="_blank"
				rel="noopener"
				:style="getFixedDelay(index * 0.05)"
			>
				<div class="card-cover">
					<NuxtImg
						:src="item.cover"
						:alt="item.title"
						loading="lazy"
						class="cover-img"
					/>
					<div v-if="item.rating" class="card-rating">
						<span
							v-for="i in 5"
							:key="i"
							class="rating-dot"
							:class="{ filled: i <= item.rating }"
						/>
					</div>
				</div>
				<div class="card-info">
					<span class="card-title">{{ item.title }}</span>
					<span v-if="item.description" class="card-desc">{{ item.description }}</span>
				</div>
			</a>
		</TransitionGroup>

		<ZError
			v-else
			icon="ph:chest-simple-bold"
			title="暂无收藏"
		/>
	</section>
</div>
</template>

<style lang="scss" scoped>
.treasure {
	padding: 1rem;
}

.treasure-header {
	margin-bottom: 2em;
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

.treasure-section {
	margin-bottom: 2.5em;
}

.section-title {
	display: flex;
	align-items: center;
	gap: 0.4em;
	margin-bottom: 1em;
	font-size: 1.2em;
	font-weight: 700;
	color: var(--c-text-1);

	> .iconify {
		font-size: 1.2em;
		color: var(--c-primary);
	}
}

.treasure-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: 0.8em;
}

.treasure-card {
	display: flex;
	flex-direction: column;
	border-radius: 0.5em;
	box-shadow: var(--box-shadow-2);
	background-color: var(--ld-bg-card);
	overflow: hidden;
	transition: transform 0.2s, box-shadow 0.2s;
	animation: float-in 0.2s var(--delay) backwards;

	&:hover {
		transform: translateY(-4px);
		box-shadow: var(--box-shadow-3);

		.cover-img {
			transform: scale(1.05);
		}
	}
}

.card-cover {
	position: relative;
	overflow: hidden;
	aspect-ratio: 3 / 4;
}

.cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-rating {
	position: absolute;
	top: 0.5em;
	right: 0.5em;
	display: flex;
	gap: 0.25em;
}

.rating-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background-color: var(--c-bg-soft);
	transition: background-color 0.2s;

	&.filled {
		background-color: var(--c-primary);
	}
}

.card-info {
	padding: 0.6em 0.8em;
	line-height: 1.4;
}

.card-title {
	display: block;
	font-weight: 600;
	font-size: 0.95em;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.card-desc {
	display: block;
	margin-top: 0.2em;
	font-size: 0.85em;
	color: var(--c-text-2);
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

@media (max-width: $breakpoint-mobile) {
	.treasure-grid {
		grid-template-columns: repeat(2, 1fr);
	}

	.treasure-card {
		font-size: 0.9em;
	}
}
</style>

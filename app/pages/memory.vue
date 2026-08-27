<script setup lang="ts">
const appConfig = useAppConfig()

useSeoMeta({
	title: '网络记忆',
	description: '记录那些短暂出现、却值得留下的网络记忆与时代眼泪。',
})

const layoutStore = useLayoutStore()
layoutStore.setAside(['blog-stats', 'blog-log'])

const { data: listRaw } = await useAsyncData(
	'memory_posts',
	() => queryCollection('content')
		.where('stem', 'LIKE', 'posts/memory/%')
		.where('draft', '=', false)
		.all(),
	{ default: () => [] },
)

const listPublished = usePublishedArticles(listRaw)
const memories = computed(() => {
	return listPublished.value.filter(item => item.type === 'memory').sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})
</script>

<template>
<div class="memory-page proper-height">
	<header class="memory-header">
		<div>
			<p class="memory-kicker">
				<Icon name="ph:globe-hemisphere-west-bold" /> 记忆存档
			</p>
			<h1>网络记忆，时代眼泪</h1>
			<p class="memory-subtitle">
				一些碎碎念、旧链接和图片。互联网变化很快，先替它们留个档。
			</p>
		</div>
		<span class="memory-count">{{ memories.length }} 条记录</span>
	</header>

	<TransitionGroup v-if="memories.length" tag="div" class="memory-feed" name="float-in">
		<article v-for="(memory, index) in memories" :key="memory.path" class="memory-entry" :style="getFixedDelay(index * 0.05)">
			<div class="memory-avatar">
				<NuxtImg :src="appConfig.author.avatar" :alt="appConfig.author.name" />
			</div>
			<div class="memory-content">
				<header class="memory-meta">
					<strong>{{ appConfig.author.name }}</strong>
					<UtilDate :date="memory.date" format="date" />
					<span v-if="memory.title" class="memory-title">{{ memory.title }}</span>
				</header>
				<p v-if="memory.description" class="memory-description">
					{{ memory.description }}
				</p>
				<NuxtImg
					v-if="memory.image"
					class="memory-image"
					:src="memory.image"
					:alt="memory.title || '网络记忆'"
					loading="lazy"
					decoding="async"
				/>
				<ContentRenderer class="memory-body article" :value="memory" tag="div" />
				<div v-if="memory.tags?.length" class="memory-tags">
					{{ memory.tags.map(tag => `#${tag}`).join(' ') }}
				</div>
			</div>
		</article>
	</TransitionGroup>

	<ZError v-else icon="ph:globe-hemisphere-west-bold" title="还没有网络记忆" message="去后台发布第一条记录吧。" />
</div>
</template>

<style lang="scss" scoped>
.memory-page {
	padding: 1rem;
}

.memory-header {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 1.5rem;
	padding: 1.2rem 0 1.6rem;
	border-bottom: 1px solid var(--c-border);
}

.memory-kicker {
	display: flex;
	align-items: center;
	gap: 0.35em;
	margin: 0 0 0.5rem;
	font-size: 0.8rem;
	letter-spacing: 0.08em;
	color: var(--c-primary);
}

.memory-header h1 {
	font-size: clamp(1.6rem, 4vw, 2.4rem);
	font-weight: 800;
}

.memory-subtitle {
	max-width: 38rem;
	margin-top: 0.55rem;
	color: var(--c-text-2);
}

.memory-count {
	flex: 0 0 auto;
	font-size: 0.85rem;
	color: var(--c-text-3);
}

.memory-feed {
	display: grid;
	gap: 0.7rem;
	max-width: 46rem;
	margin: 1.5rem auto 0;
}

.memory-entry {
	display: grid;
	grid-template-columns: 2.5rem minmax(0, 1fr);
	gap: 0.7rem;
	padding: 0.8rem 0;
	border-bottom: 1px solid var(--c-border);
	animation: float-in 0.2s var(--delay) backwards;
}

.memory-avatar {
	padding-top: 0.1rem;

	img {
		width: 2.35rem;
		height: 2.35rem;
		border-radius: 50%;
		object-fit: cover;
	}
}

.memory-meta {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 0.45rem 0.7rem;
	font-size: 0.78rem;
	color: var(--c-text-3);

	strong {
		font-size: 0.9rem;
		color: var(--c-text);
	}
}

.memory-tags {
	margin-top: 0.5rem;
	font-size: 0.78rem;
	color: var(--c-primary);
}

.memory-content {
	min-width: 0;
}

.memory-title {
	width: 100%;
	font-weight: 600;
	color: var(--c-text-2);
}

.memory-description {
	margin-top: 0.55rem;
	line-height: 1.7;
	color: var(--c-text-2);
}

.memory-image {
	display: block;
	width: auto;
	max-width: min(100%, 30rem);
	max-height: 20rem;
	margin-top: 0.6rem;
	border-radius: 0.5rem;
	object-fit: contain;
}

.memory-body {
	margin: 0.5rem 0 0;
	line-height: 1.7;

	:deep(p) {
		margin: 0.35rem 0;
	}

	:deep(> *) {
		margin-block: 0.5rem;
	}

	:deep(img) {
		display: block;
		width: auto;
		max-width: min(100%, 30rem);
		max-height: 20rem;
		object-fit: contain;
	}
}

@media (max-width: $breakpoint-phone) {
	.memory-header {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.8rem;
	}

	.memory-entry {
		grid-template-columns: 2.2rem minmax(0, 1fr);
	}
}
</style>

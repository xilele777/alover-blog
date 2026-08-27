<script setup lang="ts">
useSeoMeta({
	title: '网络记忆',
	description: '记录那些短暂出现、却值得留下的网络记忆与时代眼泪。',
})

const layoutStore = useLayoutStore()
layoutStore.setAside(['blog-stats', 'blog-log'])

const { data: listRaw } = await useAsyncData(
	'memory_posts',
	() => useArticleIndexOptions('posts/memory/%'),
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
			<p class="memory-kicker"><Icon name="ph:globe-hemisphere-west-bold" /> 记忆存档</p>
			<h1>网络记忆，时代眼泪</h1>
			<p class="memory-subtitle">一些碎碎念、旧链接和图片。互联网变化很快，先替它们留个档。</p>
		</div>
		<span class="memory-count">{{ memories.length }} 条记录</span>
	</header>

	<TransitionGroup v-if="memories.length" tag="div" class="memory-feed" name="float-in">
		<article v-for="(memory, index) in memories" :key="memory.path" class="memory-entry" :style="getFixedDelay(index * 0.05)">
			<div class="memory-meta">
				<UtilDate :date="memory.date" format="date" />
				<span v-if="memory.tags?.length" class="memory-tags">{{ memory.tags.map(tag => `#${tag}`).join(' ') }}</span>
			</div>
			<div class="memory-content">
				<UtilLink :to="memory.path" class="memory-title-link">
					<h2>{{ memory.title }}</h2>
				</UtilLink>
				<p v-if="memory.description" class="memory-description">{{ memory.description }}</p>
				<NuxtImg v-if="memory.image" class="memory-image" :src="memory.image" :alt="memory.title" />
				<UtilLink :to="memory.path" class="memory-more">
					阅读全文 <Icon name="ph:arrow-right-bold" />
				</UtilLink>
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
	gap: 1rem;
	max-width: 54rem;
	margin: 1.5rem auto 0;
}

.memory-entry {
	display: grid;
	grid-template-columns: 7.5rem minmax(0, 1fr);
	gap: 1.25rem;
	padding: 1rem 0 1.2rem;
	border-bottom: 1px dashed var(--c-border);
	animation: float-in 0.2s var(--delay) backwards;
}

.memory-meta {
	display: grid;
	align-content: start;
	gap: 0.45rem;
	padding-top: 0.3rem;
	font-size: 0.78rem;
	color: var(--c-text-3);
}

.memory-tags {
	line-height: 1.5;
}

.memory-content {
	min-width: 0;
}

.memory-title-link {
	color: var(--c-text);
}

.memory-title-link h2 {
	font-size: 1.25rem;
	font-weight: 700;
	transition: color 0.2s;
}

.memory-title-link:hover h2 {
	color: var(--c-primary);
}

.memory-description {
	margin-top: 0.45rem;
	line-height: 1.7;
	color: var(--c-text-2);
}

.memory-image {
	display: block;
	width: min(100%, 32rem);
	max-height: 20rem;
	margin-top: 0.8rem;
	border-radius: 0.5rem;
	object-fit: cover;
}

.memory-more {
	display: inline-flex;
	align-items: center;
	gap: 0.3em;
	margin-top: 0.8rem;
	font-size: 0.85rem;
	color: var(--c-primary);
}

@media (max-width: $breakpoint-phone) {
	.memory-header {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.8rem;
	}

	.memory-entry {
		grid-template-columns: 1fr;
		gap: 0.45rem;
	}

	.memory-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
}
</style>

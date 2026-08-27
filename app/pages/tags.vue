<script setup lang="ts">
import type { ArticleProps } from '~/types/article'

interface TagGroup {
	name: string
	count: number
	articles: ArticleProps[]
}

const appConfig = useAppConfig()

useSeoMeta({
	title: '标签',
	description: `${appConfig.title} 的文章标签`,
})

const layoutStore = useLayoutStore()
layoutStore.setAside(['blog-stats'])

const selectedTag = useRouteQuery<string | undefined>('tag', undefined)

const { data: listRaw } = await useAsyncData('tag_posts', () => useArticleIndexOptions(), { default: () => [] })
const listPublished = usePublishedArticles(useNonMemoryArticles(listRaw))
const { listSorted } = useArticleSort(listPublished)

const tagGroups = computed<TagGroup[]>(() => {
	const groups = new Map<string, ArticleProps[]>()

	for (const article of listSorted.value) {
		for (const tag of article.tags || []) {
			const normalizedTag = tag.trim()

			if (!normalizedTag)
				continue

			groups.set(normalizedTag, [...groups.get(normalizedTag) || [], article])
		}
	}

	return Array.from(groups.entries(), ([name, articles]) => ({
		name,
		articles,
		count: articles.length,
	}))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'))
})

const activeTagGroup = computed(() => {
	if (!selectedTag.value)
		return undefined

	return tagGroups.value.find(item => item.name === selectedTag.value)
})

const listFiltered = computed(() => {
	if (!selectedTag.value)
		return []

	return activeTagGroup.value?.articles || []
})

watch(tagGroups, (groups) => {
	if (selectedTag.value && !groups.some(item => item.name === selectedTag.value))
		selectedTag.value = undefined
})

function selectTag(tag?: string) {
	selectedTag.value = tag
}

function getTagScale(tag: TagGroup) {
	return `${Math.min(1.6, 0.95 + tag.count * 0.12)}em`
}
</script>

<template>
<BlogHeader class="mobile-only" to="/tags" tag="h1" />

<UtilHydrateSafe>
	<div class="tags-page" :class="{ 'is-detail': selectedTag }">
		<template v-if="!selectedTag">
			<header class="tags-overview-header">
				<h1>标签</h1>
			</header>

			<section v-if="tagGroups.length" class="tag-cloud" aria-label="标签列表">
				<button
					v-for="tag in tagGroups"
					:key="tag.name"
					class="tag-chip"
					:style="{ '--tag-size': getTagScale(tag) }"
					@click="selectTag(tag.name)"
				>
					<span class="tag-name"># {{ tag.name }}</span>
					<b>{{ tag.count }}</b>
				</button>
			</section>

			<p v-if="tagGroups.length" class="tag-total">
				共 {{ tagGroups.length }} 个标签
			</p>

			<div v-else class="empty-state">
				<Icon name="ph:tag-chevron-bold" />
				<span>还没有可展示的标签</span>
			</div>
		</template>

		<template v-else>
			<header class="tag-detail-header">
				<div>
					<h1>
						<span class="hash-mark">#</span>
						{{ selectedTag }}
					</h1>
					<p>共 {{ listFiltered.length }} 篇文章</p>
				</div>

				<button class="close-button" aria-label="返回标签列表" @click="selectTag()">
					<Icon name="ph:x-bold" />
				</button>
			</header>

			<TransitionGroup v-if="listFiltered.length" tag="menu" class="tag-article-list proper-height" name="float-in">
				<li
					v-for="article, index in listFiltered"
					:key="article.path"
					class="tag-article-item"
					:style="getFixedDelay(index * 0.04)"
				>
					<UtilDate class="article-date" :date="article.date" format="monthDay" />

					<UtilLink class="article-title" :to="article.path">
						{{ article.title }}
					</UtilLink>

					<ul v-if="article.tags?.length" class="article-tags">
						<li v-for="tag in article.tags" :key="tag">
							<button @click="selectTag(tag)">
								# {{ tag }}
							</button>
						</li>
					</ul>
				</li>
			</TransitionGroup>

			<div v-else class="empty-state">
				<Icon name="ph:tag-chevron-bold" />
				<span>这个标签下还没有文章</span>
			</div>

			<button
				v-if="!listFiltered.length && tagGroups.length"
				class="back-button"
				@click="selectTag()"
			>
				返回全部标签
			</button>
		</template>
	</div>
</UtilHydrateSafe>
</template>

<style lang="scss" scoped>
.tags-page {
	min-height: min(70vh, 44rem);
	padding: 2.5rem 1rem;

	&.is-detail {
		padding-block: 2rem;
	}
}

.tags-overview-header {
	margin-bottom: 2.2rem;
	text-align: center;

	> h1 {
		font-size: 2.6rem;
		font-weight: 800;
		line-height: 1.15;
	}
}

.tag-cloud {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 1.1rem 1.4rem;
	max-width: 58rem;
	margin: 0 auto;
}

.tag-chip {
	display: inline-flex;
	align-items: center;
	gap: 0.55em;
	max-width: 100%;
	padding: 0.62em 1.1em;
	border-radius: 999px;
	background: var(--c-bg-soft);
	font-size: var(--tag-size);
	line-height: 1;
	color: var(--c-text);
	transition: color 0.2s, transform 0.2s, background-color 0.2s;

	> .tag-name {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	> b {
		display: inline-grid;
		place-items: center;
		height: 1.4em;
		min-width: 1.4em;
		padding: 0 0.35em;
		border-radius: 999px;
		background: var(--c-bg);
		font-size: 0.72em;
		color: var(--c-text-3);
		font-variant-numeric: tabular-nums;
	}

	&:hover {
		color: var(--c-primary);
		transform: translateY(-1px);
	}
}

.tag-total {
	margin-top: 2.6rem;
	text-align: center;
	color: var(--c-text-2);
}

.tag-detail-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1rem;
	padding-bottom: 1.5rem;
	border-bottom: 1px solid var(--c-border);

	h1 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 2.15rem;
		font-weight: 500;
		line-height: 1.1;
	}

	p {
		margin-top: 0.65rem;
		color: var(--c-text-2);
	}
}

.hash-mark {
	display: inline-grid;
	place-items: center;
	width: 2rem;
	height: 2.4rem;
	border-radius: 0.25rem;
	background: #2563EB;
	font-weight: 700;
	color: #FFF;
}

.close-button {
	display: inline-grid;
	flex: 0 0 auto;
	place-items: center;
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 999px;
	background: var(--c-bg-soft);
	font-size: 1rem;
	color: var(--c-text-2);
	transition: color 0.2s, transform 0.2s, background-color 0.2s;

	&:hover {
		background: var(--c-primary-soft);
		color: var(--c-primary);
		transform: rotate(90deg);
	}
}

.tag-article-list {
	display: grid;
	align-content: start;
	gap: 1.1rem;
	margin-top: 2rem;
}

.tag-article-item {
	display: grid;
	grid-template-columns: 4rem minmax(0, 1fr) minmax(8rem, 36%);
	align-items: baseline;
	gap: 1rem;
	font-size: 0.98rem;
	animation: float-in 0.2s var(--delay) backwards;

	@media (max-width: $breakpoint-phone) {
		grid-template-columns: 3.6rem minmax(0, 1fr);
		gap: 0.5rem 0.8rem;
		font-size: 0.95rem;
	}
}

.article-date {
	color: var(--c-text-3);
	font-variant-numeric: tabular-nums;
}

.article-title {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text);
	transition: color 0.2s;

	&:hover {
		color: var(--c-primary);
	}
}

.article-tags {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: flex-end;
	gap: 0.3rem 0.55rem;
	font-size: 0.9em;
	color: var(--c-text-3);

	button {
		transition: color 0.2s;

		&:hover {
			color: var(--c-primary);
		}
	}

	@media (max-width: $breakpoint-phone) {
		grid-column: 2;
		justify-content: flex-start;
		font-size: 0.9rem;
	}
}

.empty-state {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5em;
	min-height: 12rem;
	color: var(--c-text-3);
}

.back-button {
	display: block;
	margin: 1rem auto 0;
	color: var(--c-primary);
}

.float-in-leave-to {
	position: absolute;
}
</style>

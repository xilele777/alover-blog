<script setup lang="ts">
const appConfig = useAppConfig()
const recommendationSeed = useState('recommendation-seed', () => Math.random().toString(36).slice(2))
useSeoMeta({
	description: appConfig.description,
	ogImage: appConfig.author.avatar,
})

const layoutStore = useLayoutStore()
layoutStore.setAside(['blog-stats', 'blog-tech'])

const { data: listRaw } = await useAsyncData('index_posts', () => useArticleIndexOptions(), { default: () => [] })
// 周报和网络记忆都有独立栏目，不混入首页文章流
const listWithoutSpecialColumns = computed(() => listRaw.value
	.filter(item => !item.path?.startsWith(WEEKLY_PATH_PREFIX))
	.filter(item => item.type !== 'memory'))
const listPublished = usePublishedArticles(listWithoutSpecialColumns)
const { listSorted, isAscending, sortOrder } = useArticleSort(listPublished, { bindDirectionQuery: 'asc', bindOrderQuery: 'sort' })
const { category, categories, listCategorized } = useCategory(listSorted, { bindQuery: 'category' })
const { page, totalPages, listPaged } = usePagination(listCategorized, { bindQuery: 'page' })

watch(category, () => {
	page.value = 1
})

useSeoMeta({ title: () => (page.value > 1 ? `第${page.value}页` : '') })

function createSeededRandom(seed: string) {
	let state = [...seed].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261)
	return () => {
		state += 0x6D2B79F5
		let value = state
		value = Math.imul(value ^ (value >>> 15), value | 1)
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296
	}
}

function weightedSample<T extends { path: string, recommend?: number }>(list: T[], limit: number, seed: string) {
	const random = createSeededRandom(seed)
	return list
		.map(item => ({
			item,
			key: random() ** (1 / Math.max(1, item.recommend || 1)),
		}))
		.sort((a, b) => b.key - a.key)
		.slice(0, limit)
		.map(({ item }) => item)
}

const listRecommended = computed(() => weightedSample(
	listPublished.value,
	appConfig.component.slide.maxItems,
	recommendationSeed.value,
))
</script>

<template>
<BlogHeader class="mobile-only" to="/" tag="h1" />

<UtilHydrateSafe>
	<PostSlide v-if="listRecommended.length && page === 1 && !category" :list="listRecommended" />

	<div class="post-list">
		<PostOrderToggle
			v-model:is-ascending="isAscending"
			v-model:sort-order="sortOrder"
			v-model:category="category"
			:categories
		>
			<ZSecret>
				<UtilLink to="/preview" class="preview-entrance">
					<Icon name="ph:file-lock-bold" />
					查看预览文章
				</UtilLink>
			</ZSecret>
		</PostOrderToggle>

		<TransitionGroup tag="menu" class="proper-height" name="float-in">
			<PostArticle
				v-for="article, index in listPaged"
				:key="article.path"
				v-bind="article"
				:to="article.path"
				:use-updated="sortOrder === 'updated'"
				:style="getFixedDelay(index * 0.05)"
			/>
		</TransitionGroup>

		<ZPagination v-model="page" sticky :total-pages="totalPages" />
	</div>
</UtilHydrateSafe>
</template>

<style lang="scss" scoped>
.post-list {
	margin: 1rem;
}

.float-in-leave-to {
	position: absolute;
}
</style>

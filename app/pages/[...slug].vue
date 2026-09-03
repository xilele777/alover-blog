<script setup lang="ts">
const route = useRoute()

const layoutStore = useLayoutStore()
layoutStore.setAside(['toc'])

const { data: post } = await useAsyncData(
	route.path,
	() => queryCollection('content')
		.path(route.path)
		.where('draft', '=', false)
		.where('type', '!=', 'memory')
		.first(),
)

const contentStore = useContentStore()
const { toc, meta } = storeToRefs(contentStore)

const excerpt = computed(() => post.value?.description || '')

function setTocAndMeta() {
	toc.value = post.value?.body.toc
	meta.value = post.value?.meta
}

setTocAndMeta()

if (post.value) {
	const appConfig = useAppConfig()
	const fullUrl = new URL(route.path, appConfig.url).href
	const imageUrl = post.value.image ? new URL(post.value.image, appConfig.url).href : new URL(appConfig.author.avatar, appConfig.url).href

	useSeoMeta({
		title: post.value.title,
		ogType: 'article',
		ogImage: imageUrl,
		description: post.value.description,
		articlePublishedTime: post.value.date,
		articleModifiedTime: post.value.updated || post.value.date,
		articleAuthor: appConfig.author.name,
		ogUrl: fullUrl,
		twitterCard: 'summary_large_image',
		twitterTitle: post.value.title,
		twitterDescription: post.value.description,
		twitterImage: imageUrl,
	})

	// 添加文章结构化数据
	useSchemaOrg([
		defineArticle({
			headline: post.value.title,
			description: post.value.description,
			image: imageUrl,
			datePublished: post.value.date,
			dateModified: post.value.updated || post.value.date,
			author: {
				name: appConfig.author.name,
				url: appConfig.author.homepage,
			},
		}),
		defineBreadcrumb({
			itemListElement: [
				{ name: '首页', item: appConfig.url },
				{ name: post.value.title, item: fullUrl },
			],
		}),
	])

	layoutStore.setAside(post.value.meta?.aside as WidgetName[] | undefined)
}
else {
	const event = useRequestEvent()
	event && setResponseStatus(event, 404)
	route.meta.title = '404'
	layoutStore.setAside(['blog-log'])
}

if (import.meta.dev) {
	watchEffect(() => {
		setTocAndMeta()
		layoutStore.setAside(post.value?.meta?.aside as WidgetName[] | undefined)
	})
}
</script>

<template>
<template v-if="post">
	<PostHeader v-bind="post" />
	<PostExcerpt v-if="excerpt" :excerpt />
	<!-- 使用 float-in 动画会导致搜索跳转不准确 -->
	<ContentRenderer
		class="article"
		:class="getPostTypeClassName(post?.type, { prefix: 'md' })"
		:value="post"
		tag="article"
	/>

	<PostFooter v-bind="post" />
	<PostSurround />
	<PostComment v-if="false" />
</template>

<ZError
	v-else
	icon="solar:confounded-square-bold-duotone"
	title="内容为空或页面不存在"
/>
</template>

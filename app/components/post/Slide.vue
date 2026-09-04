<script setup lang="ts">
import type { ArticleProps } from '~/types/article'
import Autoplay from 'embla-carousel-autoplay'
import emblaCarouselVue from 'embla-carousel-vue'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'

const props = defineProps<{ list: ArticleProps[] }>()

const appConfig = useAppConfig()
const compConf = computed(() => appConfig.component.slide)
const selectedIndex = ref(0)
const scrollSnaps = ref<number[]>([])
const hasMultipleSlides = computed(() => props.list.length > 1)

// @keep-sorted
const [carouselEl, carouselApi] = emblaCarouselVue({
	containScroll: false,
	loop: true,
	skipSnaps: true,
}, [
	Autoplay({ stopOnInteraction: false, stopOnMouseEnter: true }),
	WheelGesturesPlugin(),
])

watch(carouselApi, (api, _, onCleanup) => {
	if (!api)
		return

	const updateSelection = () => {
		selectedIndex.value = api.selectedScrollSnap()
		scrollSnaps.value = api.scrollSnapList()
	}

	updateSelection()
	api.on('select', updateSelection)
	api.on('reInit', updateSelection)
	onCleanup(() => {
		api.off('select', updateSelection)
		api.off('reInit', updateSelection)
	})
})

// 鼠标横向滚动 / Shift + 纵向滚轮事件
useEventListener(carouselEl, 'wheel', (e) => {
	const delta = e.deltaX + (e.shiftKey ? e.deltaY : 0)
	if (Math.abs(delta) < 80)
		return
	delta > 0 ? carouselApi.value?.scrollNext() : carouselApi.value?.scrollPrev()
}, { passive: true })

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'ArrowLeft') {
		event.preventDefault()
		carouselApi.value?.scrollPrev()
	}
	else if (event.key === 'ArrowRight') {
		event.preventDefault()
		carouselApi.value?.scrollNext()
	}
}
</script>

<template>
<section class="z-slide" aria-label="精选文章轮播" aria-roledescription="轮播">
	<div class="z-slide-header">
		<h2 class="title text-creative">
			精选文章
		</h2>
		<div v-if="hasMultipleSlides" class="slide-status">
			<span aria-live="polite">{{ selectedIndex + 1 }} / {{ list.length }}</span>
			<div class="slide-dots" aria-label="选择推荐文章">
				<button
					v-for="(_, index) in scrollSnaps"
					:key="index"
					:aria-label="`转到第 ${index + 1} 篇推荐文章`"
					:aria-current="index === selectedIndex ? 'true' : undefined"
					type="button"
					@click="carouselApi?.scrollTo(index)"
				/>
			</div>
		</div>
	</div>

	<div ref="carouselEl" class="z-slide-body" dir="ltr" tabindex="0" @keydown="handleKeydown">
		<div class="slide-list">
			<!-- 轮播分组语义必须落在容器上：<a role="group"> 会把链接自身的角色顶掉，
			     辅助技术和自动化浏览代理都读不出「这是一个可点击的链接」 -->
			<div
				v-for="(article, index) in list"
				:key="article.path"
				class="slide-item"
				role="group"
				aria-roledescription="幻灯片"
				:aria-label="`${article.title || '未命名文章'}，第 ${index + 1} 篇，共 ${list.length} 篇`"
			>
				<UtilLink
					class="slide-link"
					:title="article.description"
					:to="article.path"
				>
					<UtilImgOptimized v-if="article.image" class="cover" :src="article.image" :alt="compConf.showTitle ? '' : article.title" :loading="index === 0 ? 'eager' : 'lazy'" :fetchpriority="index === 0 ? 'high' : 'auto'" sizes="(max-width: 60rem) 12rem, 24rem" />
					<div v-else class="cover cover-fallback" aria-hidden="true">
						<Icon name="ph:article-bold" />
					</div>

					<div v-if="compConf.showTitle" class="stable-info text-creative">
						{{ article.title }}
					</div>

					<div class="hover-info">
						<div class="title text-creative">
							{{ article.title }}
						</div>
						<UtilDate v-if="article.date" class="desc" :date="article.date" />
					</div>
				</UtilLink>
			</div>
		</div>

		<ZButton
			v-if="hasMultipleSlides"
			class="carousel-action prev at-slide-hover"
			aria-label="上一页"
			icon="ph:caret-left-bold"
			@click="carouselApi?.scrollPrev()"
		/>

		<ZButton
			v-if="hasMultipleSlides"
			class="carousel-action next at-slide-hover"
			aria-label="下一页"
			icon="ph:caret-right-bold"
			@click="carouselApi?.scrollNext()"
		/>
	</div>
</section>
</template>

<style lang="scss" scoped>
.z-slide {
	margin: 1rem;

	.at-slide-hover {
		opacity: 0;
		transition: opacity var(--dur-fast) var(--ease-out);
	}

	&:hover .at-slide-hover,
	&:focus-within .at-slide-hover {
		opacity: 1;
	}
}

.z-slide-header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 2rem;
	height: 3rem;
	margin-bottom: -0.2rem;
	mask-image: linear-gradient(#FFF, transparent);
	color: var(--c-text-3);

	> .title {
		margin: 0;
		font-size: 3rem;
		font-weight: bold;
		line-height: 1;
	}
}

.slide-status {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	font-variant-numeric: tabular-nums;
}

.slide-dots {
	display: flex;
	align-items: center;

	> button {
		// 圆点视觉尺寸仍是 0.5rem，但用 padding 把可点击区域撑到 24px 以满足
		// WCAG target-size；background-clip 保证背景只画在 content box 上，
		// 圆点看起来不会变大。横向不能再用负 margin 或负 gap 收窄，否则相邻
		// 圆点的命中区会重叠，target-size 依然判定失败；纵向负 margin 只是把
		// 这一行的占位收回到圆点高度，不与任何兄弟节点重叠。
		width: 0.5rem;
		height: 0.5rem;
		margin: -8px 0;
		padding: 8px;
		border: 0;
		border-radius: 50%;
		box-sizing: content-box;
		background-clip: content-box;
		background-color: var(--c-text-3);
		transition: width var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);

		&[aria-current="true"] {
			width: 1.25rem;
			border-radius: 0.25rem;
			background-color: var(--c-primary);
		}
	}
}

.z-slide-body {
	--fadeout-width: 1.5rem;

	position: relative;
	overflow: hidden;
	padding: 2px 0;
	mask-image: linear-gradient(to var(--end), transparent, #FFF var(--fadeout-width), #FFF calc(100% - var(--fadeout-width)), transparent);
	cursor: grab;
	user-select: none;

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}

	.slide-list {
		display: flex;
		scroll-snap-type: x mandatory;
	}
}

.carousel-action {
	position: absolute;
	top: 50%;
	padding: 0.5em 0.2em;
	font-size: 1.5em;
	transform: translateY(-50%);

	// 显隐由 .at-slide-hover 统一负责，这里不再声明 transition

	&.prev { inset-inline-start: 1rem; }
	&.next { inset-inline-end: 1rem; }
}

.slide-item {
	contain: paint;
	flex-shrink: 0;
	position: relative;
	width: max(12rem, 28%);
	max-width: 80%;
	aspect-ratio: 1.77;
	margin: 0 min(0.5em, 1%);
	border-radius: 0.5rem;
	scroll-snap-align: center;
	scroll-snap-stop: always;

	// Firefox 图片 alt 为空时 fallback 失效
	@supports (-moz-force-broken-image-icon: 1) {
		background-color: var(--c-border);
	}

	> .slide-link {
		display: block;
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}

	.cover {
		display: block;
		width: 100%;
		height: 100%;
	}

	.cover-fallback {
		display: grid;
		place-items: center;
		background-color: var(--c-border);
		background-image: linear-gradient(135deg, var(--c-bg-2), var(--c-border));
		font-size: 2.5rem;
		color: var(--c-text-3);
	}

	.stable-info, .hover-info {
		position: absolute;
		text-align: center;
		text-shadow: var(--text-shadow-black);
		color: white;
		transition: opacity var(--dur-fast) var(--ease-out);
	}

	.stable-info {
		overflow: hidden;
		bottom: 0;
		width: 100%;
		padding: 0.5em;
		background-image: linear-gradient(transparent, #0003, #0005);
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.hover-info {
		display: grid;
		place-items: center;
		opacity: 0;
		inset: 0;
		padding: 1em;
		backdrop-filter: brightness(0.8) saturate(10) contrast(0.8) blur(2em);

		> .title {
			text-wrap: balance;
		}

		> .desc {
			opacity: 0.5;
			font-size: 0.8em;
		}
	}

	&:hover, &:focus-within {
		.stable-info {
			opacity: 0;
		}

		.hover-info {
			opacity: 1;
		}
	}
}
</style>

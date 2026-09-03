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
			<UtilLink
				v-for="(article, index) in list"
				:key="article.path"
				:aria-label="`${article.title || '未命名文章'}，第 ${index + 1} 篇，共 ${list.length} 篇`"
				aria-roledescription="幻灯片"
				class="slide-item"
				role="group"
				:title="article.description"
				:to="article.path"
			>
				<UtilImgOptimized v-if="article.image" class="cover" :src="article.image" :alt="compConf.showTitle ? '' : article.title" :loading="index === 0 ? 'eager' : 'lazy'" :fetchpriority="index === 0 ? 'high' : 'auto'" />
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
	gap: 0.35rem;

	> button {
		width: 0.5rem;
		height: 0.5rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
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

	> .cover {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	> .cover-fallback {
		display: grid;
		place-items: center;
		background-color: var(--c-border);
		background-image: linear-gradient(135deg, var(--c-bg-2), var(--c-border));
		font-size: 2.5rem;
		color: var(--c-text-3);
	}

	>.stable-info, > .hover-info {
		position: absolute;
		text-align: center;
		text-shadow: var(--text-shadow-black);
		color: white;
		transition: opacity var(--dur-fast) var(--ease-out);
	}

	> .stable-info {
		overflow: hidden;
		bottom: 0;
		width: 100%;
		padding: 0.5em;
		background-image: linear-gradient(transparent, #0003, #0005);
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	> .hover-info {
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
		>.stable-info {
			opacity: 0;
		}

		> .hover-info {
			opacity: 1;
		}
	}
}
</style>

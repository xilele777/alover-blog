<script setup lang="ts">
import type { ArticleProps } from '~/types/article'

const props = defineProps<{ useUpdated?: boolean, eager?: boolean } & ArticleProps>()

const appConfig = useAppConfig()

const showAllDate = isTimeDiffSignificant(props.date, props.updated)

const categoryLabel = computed(() => props.categories?.[0])
const categoryColor = computed(() => appConfig.article.categories[categoryLabel.value!]?.color)
const categoryIcon = computed(() => getCategoryIcon(categoryLabel.value))
</script>

<template>
<UtilLink class="article-card card upraise">
	<!-- 首屏第一张卡片的封面就是 LCP 元素，懒加载会让它等到水合后才开始取，
	     因此由调用方通过 eager 指明，改为立即加载并提升优先级 -->
	<UtilImgOptimized
		v-if="image"
		class="article-cover"
		:src="image"
		:alt="title"
		:loading="eager ? 'eager' : 'lazy'"
		:fetchpriority="eager ? 'high' : 'auto'"
		sizes="(max-width: 60rem) 92vw, 20rem"
	/>
	<article>
		<h2 class="article-title text-creative">
			{{ title }}
		</h2>

		<p v-if="description" class="article-description">
			{{ description }}
		</p>

		<div class="article-info">
			<UtilDate
				v-if="date && (showAllDate || !useUpdated)"
				:date
				icon="ph:pencil-simple-line-bold"
			/>

			<UtilDate
				v-if="updated && (showAllDate || useUpdated)"
				:class="{ 'use-updated': useUpdated }"
				:date="updated"
				icon="ph:clock-counter-clockwise-bold"
			/>

			<span
				v-if="categoryLabel"
				class="article-category"
				:style="{ '--cg-color': categoryColor }"
			>
				<Icon :name="categoryIcon" />
				{{ categoryLabel }}
			</span>

			<span v-if="readingTime?.words" class="article-words">
				<Icon name="ph:paragraph-bold" />
				{{ formatNumber(readingTime?.words) }}字
			</span>
		</div>
	</article>
</UtilLink>
</template>

<style lang="scss" scoped>
.article-card {
	container-type: inline-size;
	position: relative;
	margin: 1em 0;
	border-radius: 0.8em;
	color: var(--c-text);
	animation: float-in var(--dur-base) var(--ease-out) var(--stagger) backwards;

	> article {
		display: grid;
		gap: 0.5em;
		padding: 1em;
	}
}

.article-info {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5em clamp(1em, 5%, 1.5em);
	font-size: 0.8em;
	color: var(--c-text-2);

	&:empty {
		display: none;
	}

	.use-updated {
		order: -1;
	}
}

.article-title {
	font-size: 1.2em;
	color: var(--c-text);
}

.article-description {
	font-size: 0.9em;
	color: var(--c-text-2);
}

.article-category {
	// 分类色是给图标选的，直接用作 12.8px 小字时对比度只有 2.37:1。
	// 与正文色各取一半后，浅色模式最差 5.04:1、深色模式最差 8.23:1，均满足 4.5:1。
	color: color-mix(in oklab, var(--cg-color, currentcolor) 50%, var(--c-text-1));
}

.article-cover {
	position: absolute;
	opacity: 0.8;
	inset-inline-end: 0;
	top: 0;
	width: calc(40% + 2em);
	height: 100%;
	margin: 0;
	mask-image: linear-gradient(to var(--end), transparent, #FFF 50%);
	transition: opacity var(--dur-instant) var(--ease-out);

	:hover > & {
		opacity: 1;
	}

	& + article {
		position: relative;
		width: 60%;
	}

	@mixin cover-narrow {
		position: revert;
		width: 100%;
		height: auto;
		max-width: none;
		max-height: 256px;
		aspect-ratio: 2.4;
		margin-bottom: -10%;
		mask-image: linear-gradient(#FFF 50%, transparent);

		& + article {
			width: auto;

			> .article-title {
				text-shadow: 0 0 0.2em var(--ld-bg-card), 0 0 0.5em var(--ld-bg-card), 0 0 1em var(--ld-bg-card);
			}
		}
	}

	@media (max-width: $breakpoint-phone) {
		@include cover-narrow;
	}

	@container (max-width: #{$breakpoint-phone}) {
		@include cover-narrow;
	}
}
</style>

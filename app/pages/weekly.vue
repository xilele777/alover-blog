<script setup lang="ts">
const appConfig = useAppConfig()

useSeoMeta({
	title: '周报',
	description: `${appConfig.title}的 AI 前沿周报，每周一期。`,
})

const layoutStore = useLayoutStore()
layoutStore.setAside(['blog-stats', 'weekly-stats'])

const { data: listRaw } = await useAsyncData(
	'weekly_posts',
	() => useArticleIndexOptions(`${WEEKLY_STEM_PREFIX}%`),
	{ default: () => [] },
)
const listPublished = usePublishedArticles(listRaw)

const issues = computed(() => listPublished.value
	.map(article => ({ ...article, ...parseWeekly(article.title, article.date) }))
	.sort((a, b) => (b.date || '').localeCompare(a.date || '')))

const totalWords = computed(() => issues.value
	.reduce((sum, cur) => sum + (cur.readingTime?.words || 0), 0))
</script>

<template>
<div class="weekly proper-height">
	<header class="weekly-header">
		<div>
			<h1 class="weekly-title">
				AI 前沿周报
			</h1>
			<p class="weekly-subtitle">
				每周一期 · 共 {{ issues.length }} 期
				<template v-if="totalWords">
					· 累计 {{ formatNumber(totalWords) }}字
				</template>
			</p>
		</div>

		<UtilLink
			class="weekly-subscribe"
			to="/weekly.xml"
			title="订阅周报"
		>
			<Icon name="ph:rss-simple-bold" />
			<span>订阅</span>
		</UtilLink>
	</header>

	<TransitionGroup v-if="issues.length" tag="menu" class="weekly-list" name="float-in">
		<li
			v-for="issue, index in issues"
			:key="issue.path"
			class="weekly-item"
			:class="{ 'is-latest': !index }"
			:style="getFixedDelay(index * 0.05)"
		>
			<div class="gradient-card">
				<UtilLink
					class="item-link scrollbar-hidden scrollcheck-x"
					:to="issue.path"
					:title="issue.description"
				>
					<span class="item-title">
						{{ issue.issue ? `周报第 ${issue.issue} 期` : issue.displayTitle }}
					</span>

					<span v-if="issue.range" class="dim-hover item-range">
						{{ issue.range }}
					</span>

					<span v-if="issue.readingTime?.words" class="dim-hover item-words">
						{{ formatNumber(issue.readingTime.words) }}字
					</span>
				</UtilLink>
			</div>
		</li>
	</TransitionGroup>

	<ZError
		v-else
		icon="solar:notebook-square-bold-duotone"
		title="还没有发布任何周报"
	/>
</div>
</template>

<style lang="scss" scoped>
.weekly {
	padding: 1rem;
}

.weekly-header {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 1em;
	margin-bottom: 1.5em;
}

.weekly-title {
	margin: 0;
	font-size: 1.6em;
	font-weight: 800;
}

.weekly-subtitle {
	margin: 0.2em 0 0;
	font-size: 0.9em;
	color: var(--c-text-3);
}

.weekly-subscribe {
	display: flex;
	align-items: center;
	gap: 0.3em;
	padding: 0.3em 0.8em;
	border-radius: 0.5em;
	background-color: var(--c-bg-soft);
	font-size: 0.9em;
	color: var(--c-text-2);
	transition: color 0.2s, background-color 0.2s;

	&:hover {
		background-color: var(--c-primary-soft);
		color: var(--c-primary);
	}
}

.weekly-list {
	// 轴列宽度，轴线与节点都居于其正中
	--axis-width: 1.8em;

	position: relative;
	margin: 0;
	padding: 0;
	list-style: none;

	// 轴线挂在列表容器上而非单项上，项间距不会把它切断；
	// 两端渐隐代替首尾裁剪，只有一期时也能看出这是一条时间轴。
	&::before {
		content: "";
		position: absolute;
		inset-block: 0;
		inset-inline-start: calc(var(--axis-width) / 2);
		width: 1px;
		background: linear-gradient(transparent, var(--c-border) 12%, var(--c-border) 88%, transparent);
	}
}

.weekly-item {
	position: relative;
	margin: 0.5em 0;
	padding-inline-start: var(--axis-width);
	animation: float-in 0.2s var(--delay) backwards;

	// 节点：用与背景同色的描边把轴线切断，形成缝隙
	&::before {
		content: "";
		position: absolute;
		inset-inline-start: calc(var(--axis-width) / 2 - 3.5px);
		top: 50%;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		box-shadow: 0 0 0 3px var(--c-bg);
		background-color: var(--c-border);
		transform: translateY(-50%);
		transition: background-color 0.2s;
	}

	&.is-latest::before,
	&:hover::before {
		background-color: var(--c-primary);
	}

	// 次要信息默认淡出，hover 时补齐，与归档页的行为保持一致
	.dim-hover {
		opacity: 0.4;
		transition: opacity 0.2s;
	}

	&:hover .dim-hover,
	&:focus-within .dim-hover {
		opacity: 1;
	}
}

.gradient-card {
	overflow: hidden;
	border-radius: 0.5em;
}

.item-link {
	--scrollbar-height: 0px;

	display: flex;
	align-items: baseline;
	gap: 1em;
	padding: 0.45em 0.8em;
	white-space: nowrap;
}

.item-title {
	font-weight: 600;
	transition: color 0.2s;

	.is-latest & {
		color: var(--c-primary);
	}
}

.item-range {
	font-variant-numeric: tabular-nums;
	font-size: 0.9em;
}

.item-words {
	margin-inline-start: auto;
	font-variant-numeric: tabular-nums;
	font-size: 0.8em;
}

@media (max-width: $breakpoint-mobile) {
	.weekly-header {
		align-items: center;
	}

	.weekly-list {
		--axis-width: 1.3em;
	}

	.weekly-item {
		font-size: 0.9em;
	}
}
</style>

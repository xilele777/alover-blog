<script setup lang="ts">
import { badges } from '~~/data/badges'

const stats = getBadgeStats(badges)
const latestDate = stats.recent[0]?.date
const latestDateDisplay = latestDate?.replaceAll('-', '.')
</script>

<template>
<BlogWidget class="badge-widget" card>
	<template #title>
		<NuxtLink class="widget-heading" to="/badges">
			<span>徽章统计</span>
		</NuxtLink>
	</template>
	<NuxtLink class="stats-link" to="/badges" aria-label="查看全部徽章">
		<dl class="badge-stats">
			<div class="acquired-stat">
				<dd><strong>{{ stats.acquired }}</strong><span>枚</span></dd>
				<dt><Icon name="ph:medal-duotone" aria-hidden="true" />已获得</dt>
			</div>
			<div class="category-stat">
				<dd><strong>{{ stats.categories.length }}</strong><span>类</span></dd>
				<dt><Icon name="ph:squares-four-duotone" aria-hidden="true" />分类数</dt>
			</div>
			<div class="recent-stat">
				<dd class="latest-date">
					<time v-if="latestDate" :datetime="latestDate">{{ latestDateDisplay }}</time><span v-else>暂无</span>
				</dd>
				<dt><Icon name="ph:clock-counter-clockwise-duotone" aria-hidden="true" />最近获得</dt>
			</div>
		</dl>
	</NuxtLink>
</BlogWidget>
</template>

<style lang="scss" scoped>
.badge-widget :deep(.widget-card) {
	overflow: hidden;
	padding: 0;
	border: 1px solid var(--c-border);
	background: var(--ld-bg-card);
}

.widget-heading {
	display: block;
	width: 100%;
}

.stats-link {
	display: block;
	color: inherit;
	transition: background-color var(--dur-fast) var(--ease-out), transform var(--dur-instant) var(--ease-out);

	&:hover { background: color-mix(in srgb, var(--c-primary) 3%, transparent); }
	&:active { transform: scale(0.99); }

	&:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: -2px;
	}
}

.badge-stats {
	display: grid;
	grid-template-columns: 0.85fr 0.85fr 1.3fr;
	min-height: 5.1rem;

	> div {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		min-width: 0;
		padding: 0.75rem 0.3rem;

		+ div { border-left: 1px solid var(--c-border); }
	}

	dt {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		font-size: 0.62rem;
		line-height: 1;
		white-space: nowrap;
		color: var(--c-text-2);

		.iconify { font-size: 0.8rem; }
	}

	dd {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.18rem;
		min-height: 1.35rem;
		margin: 0;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		color: var(--c-text-1);
	}

	strong {
		font-size: 1.25rem;
		font-weight: 680;
		color: var(--c-text);
	}

	dd span {
		font-size: 0.62rem;
		font-weight: 400;
		color: var(--c-text-2);
	}

	.acquired-stat {
		background: linear-gradient(135deg, color-mix(in srgb, var(--c-warning) 8%, transparent), transparent 72%);

		strong {
			font-size: 1.7rem;
			font-weight: 720;
		}

		dt .iconify { color: var(--c-warning); }
	}

	.category-stat dt .iconify { color: var(--c-primary); }

	.recent-stat {
		gap: 0.35rem;

		dt .iconify { color: var(--c-success); }
	}

	.latest-date {
		font-size: 0.76rem;
		font-weight: 560;
		letter-spacing: 0.02em;
		white-space: nowrap;
		color: var(--c-text-2);
	}
}

@media (prefers-reduced-motion: reduce) {
	.stats-link { transition: none; }
}
</style>

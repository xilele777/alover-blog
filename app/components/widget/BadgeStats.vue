<script setup lang="ts">
import { badges } from '~~/data/badges'

const stats = getBadgeStats(badges)
const latestDate = stats.recent[0]?.date
</script>

<template>
<BlogWidget class="badge-widget" card title="徽章统计">
	<dl class="badge-stats">
		<div class="acquired-stat">
			<dt><span class="stat-icon"><Icon name="ph:medal-duotone" aria-hidden="true" /></span>已获得</dt>
			<dd><strong>{{ stats.acquired }}</strong><span>枚</span></dd>
		</div>
		<div>
			<dt><span class="stat-icon"><Icon name="ph:squares-four-duotone" aria-hidden="true" /></span>分类数</dt>
			<dd><strong>{{ stats.categories.length }}</strong><span>类</span></dd>
		</div>
		<div class="recent-stat">
			<dt><span class="stat-icon"><Icon name="ph:clock-counter-clockwise-duotone" aria-hidden="true" /></span>最近获得</dt>
			<dd class="latest-date">
				<time v-if="latestDate" :datetime="latestDate">{{ latestDate }}</time><span v-else>暂无</span>
			</dd>
		</div>
	</dl>
</BlogWidget>
</template>

<style lang="scss" scoped>
.badge-widget :deep(.widget-card) {
	padding: 0.5rem;
	background: linear-gradient(145deg, var(--c-bg-2), color-mix(in srgb, var(--c-primary) 3%, var(--c-bg-2)));
}

.badge-stats {
	display: grid;
	gap: 0.25rem;

	> div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		min-height: 2.7rem;
		padding: 0.4rem 0.6rem;
		border-radius: 0.65rem;
	}

	dt {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.75rem;
		color: var(--c-text-2);
	}

	.stat-icon {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 1.85rem;
		height: 1.85rem;
		border-radius: 0.6rem;
		background: color-mix(in srgb, var(--c-primary) 8%, transparent);
		font-size: 1.1rem;
		color: var(--c-primary);
	}

	dd {
		display: flex;
		align-items: baseline;
		justify-content: flex-end;
		gap: 0.3rem;
		margin: 0;
		font-variant-numeric: tabular-nums;
		text-align: end;
		color: var(--c-text-1);
	}

	strong {
		font-size: 1.2rem;
		font-weight: 600;
		line-height: 1;
		color: var(--c-text);
	}

	dd span {
		font-size: 0.72rem;
		font-weight: 400;
		color: var(--c-text-2);
	}

	.acquired-stat {
		min-height: 3.4rem;
		margin-bottom: 0.2rem;
		background: linear-gradient(110deg, color-mix(in srgb, var(--c-warning) 9%, var(--ld-bg-card)), var(--ld-bg-card));

		dt { color: var(--c-text-1); }

		.stat-icon {
			background: color-mix(in srgb, var(--c-warning) 12%, transparent);
			font-size: 1.3rem;
			color: var(--c-warning);
		}

		strong { font-size: 1.7rem; }
	}

	.recent-stat .stat-icon {
		background: color-mix(in srgb, var(--c-text-2) 7%, transparent);
		color: var(--c-text-2);
	}

	.latest-date {
		font-size: 0.75rem;
		font-weight: 500;
	}
}
</style>

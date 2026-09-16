<script setup lang="ts">
import { badges } from '~~/data/badges'

const stats = getBadgeStats(badges)
</script>

<template>
<BlogWidget card title="徽章统计">
	<div class="badge-stats">
		<div class="acquired-total">
			<Icon name="ph:medal-bold" aria-hidden="true" />
			<strong>{{ stats.acquired }}</strong>
			<span>枚已获得</span>
		</div>
		<dl>
			<div><dt>展示总数</dt><dd>{{ stats.total }} 枚</dd></div>
			<div v-if="stats.demos">
				<dt>演示徽章</dt><dd>{{ stats.demos }} 枚</dd>
			</div>
			<div><dt>最近获得</dt><dd><time v-if="stats.latest" :datetime="stats.latest">{{ stats.latest }}</time><span v-else>暂无</span></dd></div>
		</dl>
	</div>
</BlogWidget>
</template>

<style lang="scss" scoped>
.badge-stats {
	padding: 0.5rem 0;

	dl {
		display: grid;
		gap: 0.75rem;
		padding-top: 1rem;
		border-top: 1px solid var(--c-border);
		font-size: 0.8rem;

		> div {
			display: flex;
			justify-content: space-between;
			gap: 0.5rem;
		}
	}

	dt {
		color: var(--c-text-2);
	}
}

.acquired-total {
	display: flex;
	align-items: baseline;
	justify-content: center;
	gap: 0.5rem;
	padding: 0.5rem 0 1.25rem;

	.iconify {
		align-self: center;
		font-size: 1.75rem;
		color: #B58B42;
	}

	strong {
		font-size: 2rem;
		font-weight: 650;
	}

	span {
		font-size: 0.8rem;
		color: var(--c-text-2);
	}
}
</style>

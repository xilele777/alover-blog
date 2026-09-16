<script setup lang="ts">
import type { CollectionBadge } from '~~/data/badges'
import { badges } from '~~/data/badges'

const appConfig = useAppConfig()
useLayoutStore().setAside(['blog-stats', 'badge-stats'])

useSeoMeta({
	title: '徽章',
	ogType: 'website',
	description: `${appConfig.title}的徽章收藏柜，收藏每一个值得纪念的小小瞬间。`,
})

const detailDialog = useTemplateRef<HTMLDialogElement>('detailDialog')
const selectedBadge = ref<CollectionBadge | null>(null)
const scrollLocked = useScrollLock(computed(() => import.meta.client ? document.body : null))

async function openBadge(badge: CollectionBadge) {
	selectedBadge.value = badge
	await nextTick()
	detailDialog.value?.showModal()
	scrollLocked.value = true
}

function onClose() {
	scrollLocked.value = false
	selectedBadge.value = null
}

function closeOnBackdrop(event: MouseEvent) {
	const dialog = detailDialog.value
	if (!dialog || event.target !== dialog)
		return
	const rect = dialog.getBoundingClientRect()
	if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
		dialog.close()
}

onBeforeUnmount(() => {
	scrollLocked.value = false
})
</script>

<template>
<div class="badges-page proper-height">
	<div class="mobile-only">
		<BlogHeader to="/" />
	</div>

	<header class="collection-header">
		<h1>徽章</h1>
		<Icon class="header-medal" name="ph:medal-thin" aria-hidden="true" />
	</header>

	<section class="collection" aria-label="徽章收藏">
		<div v-if="badges.length" class="badge-grid">
			<button
				v-for="badge, index in badges"
				:key="badge.id"
				type="button"
				class="badge-card"
				aria-haspopup="dialog"
				:aria-label="`查看${badge.name}的详情`"
				@click="openBadge(badge)"
			>
				<span class="badge-stage">
					<span class="badge-number">{{ String(index + 1).padStart(2, '0') }}</span>
					<span v-if="badge.demo" class="demo-label">演示徽章</span>
					<img :src="badge.image" :alt="badge.name" width="320" height="360" loading="lazy">
				</span>
				<span class="badge-info">
					<span class="badge-name">{{ badge.name }}</span>
					<span class="badge-date">获得于 <time :datetime="badge.date">{{ badge.date }}</time></span>
				</span>
			</button>
		</div>
		<div v-else class="empty-collection">
			<Icon name="ph:medal-thin" aria-hidden="true" />
			<h3>等待第一枚徽章</h3>
			<p>新的故事，会从这里开始。</p>
		</div>
	</section>

	<dialog ref="detailDialog" class="badge-dialog" aria-labelledby="badge-detail-title" @close="onClose" @click="closeOnBackdrop">
		<template v-if="selectedBadge">
			<button class="close-detail" type="button" aria-label="关闭徽章详情" autofocus @click="detailDialog?.close()">
				<Icon name="ph:x-bold" />
			</button>
			<div class="detail-stage">
				<BadgeLaurel class="detail-laurel" />
				<img :src="selectedBadge.image" :alt="selectedBadge.name" width="320" height="360">
			</div>
			<div class="detail-body">
				<h2 id="badge-detail-title">
					{{ selectedBadge.name }}
				</h2>
				<p class="detail-date">
					获得于 <time :datetime="selectedBadge.date">{{ selectedBadge.date }}</time>
				</p>
				<p class="detail-story">
					{{ selectedBadge.description }}
				</p>
			</div>
		</template>
	</dialog>
</div>
</template>

<style lang="scss" scoped>
.badges-page { padding: 1rem; }

.collection-header {
	position: relative;
	overflow: hidden;
	margin-bottom: 1.5rem;
	padding: 1.75rem;
	border: 1px solid var(--c-border);
	border-radius: 1rem;
	background: linear-gradient(115deg, var(--ld-bg-card), var(--c-primary-soft));

	h1 {
		font-size: 2rem;
		font-weight: 800;
		letter-spacing: 0.08em;
	}
}

.header-medal {
	position: absolute;
	opacity: 0.12;
	right: 1.5rem;
	bottom: -1rem;
	font-size: 8rem;
	color: var(--c-primary);
	transform: rotate(-15deg);
	pointer-events: none;
}

.badge-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
	gap: 1rem;
}

.badge-card {
	overflow: hidden;
	border: 1px solid var(--c-border);
	border-radius: 0.9rem;
	background: var(--ld-bg-card);
	text-align: center;
	transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);

	&:hover {
		border-color: var(--c-primary);
		box-shadow: var(--box-shadow-2);
		transform: translateY(-4px);

		.badge-stage img { transform: rotate(-4deg) scale(1.04); }
	}
}

.badge-card:focus-visible, .close-detail:focus-visible {
	outline: 2px solid var(--c-primary);
	outline-offset: 4px;
}

.badge-stage, .detail-stage {
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	background: radial-gradient(ellipse at center, var(--c-bg-1), var(--c-bg-2));
}

.badge-stage {
	height: 250px;
	margin: 0.5rem;
	border-radius: 0.55rem;

	img {
		width: 172px;
		height: 194px;
		transition: transform var(--dur-base) var(--ease-out);
		filter: drop-shadow(0 10px 10px rgb(24 44 68 / 15%));
		object-fit: contain;
	}
}

.badge-number, .demo-label {
	position: absolute;
	top: 0.75rem;
	font-size: 0.65rem;
	color: var(--c-text-2);
}

.badge-number {
	left: 0.75rem;
	font-family: var(--font-monospace);
	letter-spacing: 0.1em;
}

.demo-label {
	right: 0.75rem;
	padding: 0.15rem 0.4rem;
	border: 1px solid var(--c-border);
	border-radius: 0.3rem;
	background: var(--ld-bg-card);
}

.badge-info {
	display: block;
	padding: 0.75rem 1rem 1.25rem;
}

.badge-name {
	display: block;
	font-size: 1rem;
	font-weight: 650;
}

.badge-date, .detail-date {
	display: block;
	margin-top: 0.6rem;
	font-size: 0.8rem;
	line-height: 1.7;
	color: var(--c-text-2);
}

.empty-collection {
	padding: 4rem 1rem;
	border: 1px dashed var(--c-border);
	border-radius: 0.9rem;
	text-align: center;
	color: var(--c-text-2);

	> .iconify {
		margin-bottom: 1rem;
		font-size: 3rem;
	}

	h3 {
		margin-bottom: 0.5rem;
		font-size: 1rem;
	}
}

.badge-dialog {
	position: fixed;
	overflow: auto;
	inset: 0;
	width: min(560px, calc(100% - 2rem));
	max-width: none;
	max-height: 85dvh;
	margin: auto;
	padding: 0;
	border: 1px solid var(--c-border);
	border-radius: 1.25rem;
	box-shadow: 0 24px 80px rgb(0 0 0 / 25%);
	background: var(--ld-bg-card);
	color: var(--c-text-1);
	overscroll-behavior: contain;

	&::backdrop {
		background: rgb(10 18 30 / 50%);
		backdrop-filter: blur(5px);
	}
}

.close-detail {
	display: grid;
	place-items: center;
	position: absolute;
	top: 0.75rem;
	right: 0.75rem;
	width: 2.25rem;
	height: 2.25rem;
	border: 1px solid var(--c-border);
	border-radius: 50%;
	background: var(--ld-bg-card);
	color: var(--c-text-2);
	z-index: 1;

	&:hover {
		background: var(--c-bg-2);
		color: var(--c-text);
	}
}

.detail-stage {
	min-width: 0;
	padding: 2rem 1rem 1.5rem;

	img {
		position: relative;
		width: 210px;
		height: 237px;
		filter: drop-shadow(0 12px 15px rgb(24 44 68 / 18%));
		object-fit: contain;
	}
}

.detail-laurel {
	position: absolute;
	opacity: 0.4;
	width: 310px;
	height: 310px;
	max-width: 95%;
	color: #B58B42;
	pointer-events: none;
}

.detail-body {
	min-width: 0;
	padding: 1.5rem 2.5rem 2rem;
	text-align: center;

	h2 { font-size: 1.8rem; }
}

.detail-story {
	margin-top: 1.5rem;
	font-size: 0.9rem;
	line-height: 1.9;
	white-space: pre-line;
	color: var(--c-text-2);
}

@media (max-width: $breakpoint-phone) {
	.collection-header { padding: 1.5rem 1.25rem; }
	.detail-body { padding: 1.25rem 1.5rem 1.75rem; }
}

@media (prefers-reduced-motion: reduce) {
	.badge-card, .badge-stage img { transition: none; }
	.badge-card:hover, .badge-card:hover .badge-stage img { transform: none; }
}
</style>

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
const reducedMotion = usePreferredReducedMotion()
const closing = ref(false)
const scrollLocked = useScrollLock(computed(() => import.meta.client ? document.body : null))
let sourceCard: HTMLElement | null = null
let animations: Animation[] = []
let disposed = false

function cancelAnimations() {
	animations.forEach(animation => animation.cancel())
	animations = []
}

function cardTransform(dialog: HTMLDialogElement) {
	const target = dialog.getBoundingClientRect()
	const source = sourceCard?.isConnected ? sourceCard.getBoundingClientRect() : null
	if (!source || source.bottom < 0 || source.top > window.innerHeight)
		return 'translateY(16px) scale(0.96)'
	return `translate(${source.left + source.width / 2 - target.left - target.width / 2}px, ${source.top + source.height / 2 - target.top - target.height / 2}px) scale(${source.width / target.width}, ${source.height / target.height})`
}

async function openBadge(badge: CollectionBadge, event: MouseEvent) {
	if (selectedBadge.value)
		return
	sourceCard = event.currentTarget as HTMLElement
	selectedBadge.value = badge
	await nextTick()
	const dialog = detailDialog.value
	if (!dialog || disposed)
		return
	dialog.showModal()
	scrollLocked.value = true
	if (reducedMotion.value === 'reduce')
		return
	animations.push(dialog.animate([
		{ transform: cardTransform(dialog), opacity: 0.35, borderRadius: '14px' },
		{ transform: 'none', opacity: 1, borderRadius: '20px' },
	], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }))
	const body = dialog.querySelector('.detail-body')
	if (body) {
		animations.push(body.animate([
			{ opacity: 0, transform: 'translateY(12px)' },
			{ opacity: 1, transform: 'none' },
		], { duration: 240, delay: 130, fill: 'backwards', easing: 'ease-out' }))
	}
}

async function closeBadge() {
	const dialog = detailDialog.value
	if (!dialog?.open || closing.value)
		return
	closing.value = true
	// 从当前动画帧接续关闭，快速点击或按 Esc 时也不会跳回终点。
	const current = getComputedStyle(dialog)
	const from = { transform: current.transform, opacity: current.opacity }
	cancelAnimations()
	if (reducedMotion.value !== 'reduce') {
		const animation = dialog.animate([
			from,
			{ transform: cardTransform(dialog), opacity: 0, borderRadius: '14px' },
		], { duration: 260, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' })
		animations.push(animation)
		await animation.finished.catch(() => {})
	}
	if (!disposed)
		dialog.close()
}

function onClose() {
	cancelAnimations()
	closing.value = false
	scrollLocked.value = false
	selectedBadge.value = null
	sourceCard?.focus({ preventScroll: true })
	sourceCard = null
}

function closeOnBackdrop(event: MouseEvent) {
	const dialog = detailDialog.value
	if (!dialog || event.target !== dialog)
		return
	const rect = dialog.getBoundingClientRect()
	if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
		closeBadge()
}

onBeforeUnmount(() => {
	disposed = true
	cancelAnimations()
	detailDialog.value?.close()
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
		<div class="header-art" aria-hidden="true">
			<span class="header-orbit" />
			<span class="ornament-tile tile-back"><Icon name="ph:star-four-duotone" /></span>
			<span class="ornament-tile tile-front"><Icon name="ph:seal-check-duotone" /></span>
			<Icon class="ornament-spark" name="ph:sparkle-fill" />
			<span class="ornament-dot" />
		</div>
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
				@click="openBadge(badge, $event)"
			>
				<span class="badge-stage">
					<span class="badge-number">{{ String(index + 1).padStart(2, '0') }}</span>
					<span v-if="badge.demo" class="demo-label">演示</span>
					<img :src="badge.image" :alt="badge.name" width="320" height="360" loading="lazy">
					<span v-if="badge.category" class="badge-category" :title="badge.category">{{ badge.category }}</span>
				</span>
				<span class="badge-info">
					<span class="badge-name">{{ badge.name }}</span>
					<span class="badge-date"><time :datetime="badge.date">{{ badge.date }}</time></span>
				</span>
			</button>
		</div>
		<div v-else class="empty-collection">
			<Icon name="ph:medal-thin" aria-hidden="true" />
			<h3>等待第一枚徽章</h3>
			<p>新的故事，会从这里开始。</p>
		</div>
	</section>

	<dialog ref="detailDialog" class="badge-dialog" :class="{ closing }" aria-labelledby="badge-detail-title" @cancel.prevent="closeBadge" @close="onClose" @click="closeOnBackdrop">
		<template v-if="selectedBadge">
			<button class="close-detail" type="button" aria-label="关闭徽章详情" autofocus @click="closeBadge">
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
	display: flex;
	align-items: center;
	justify-content: space-between;
	position: relative;
	overflow: hidden;
	min-height: 120px;
	margin-bottom: 1.25rem;
	padding: 1.5rem 1.75rem;
	border: 1px solid var(--c-border);
	border-radius: 1rem;
	background: radial-gradient(ellipse at 100% 80%, var(--c-primary-soft), transparent 65%), var(--ld-bg-card);

	h1 {
		position: relative;
		padding-bottom: 0.55rem;
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: 0.12em;

		&::after {
			content: "";
			position: absolute;
			bottom: 0;
			left: 0;
			width: 1.4rem;
			height: 3px;
			border-radius: 2px;
			background: var(--c-primary);
		}
	}
}

.header-art {
	flex: 0 0 180px;
	position: relative;
	height: 72px;
	color: var(--c-primary);
	pointer-events: none;
}

.header-orbit {
	position: absolute;
	opacity: 0.1;
	top: -55px;
	right: -55px;
	width: 190px;
	height: 190px;
	border: 1px solid currentcolor;
	border-radius: 50%;

	&::after {
		content: "";
		position: absolute;
		inset: 18px;
		border: 1px solid currentcolor;
		border-radius: inherit;
	}
}

.ornament-tile {
	display: grid;
	place-items: center;
	position: absolute;
	width: 68px;
	height: 76px;
	border: 1px solid color-mix(in srgb, var(--c-primary) 18%, var(--c-border));
	border-radius: 1rem;
	background: var(--ld-bg-card);
}

.tile-back {
	top: -6px;
	right: 68px;
	background: var(--c-primary-soft);
	font-size: 1.65rem;
	transform: rotate(-18deg);

	.iconify { opacity: 0.45; }
}

.tile-front {
	top: 3px;
	right: 25px;
	box-shadow: 0 6px 16px color-mix(in srgb, var(--c-primary) 8%, transparent);
	font-size: 2.6rem;
	transform: rotate(12deg);
}

.ornament-spark {
	position: absolute;
	opacity: 0.5;
	top: -9px;
	right: 3px;
	font-size: 0.85rem;
}

.ornament-dot {
	position: absolute;
	opacity: 0.35;
	bottom: 2px;
	left: 14px;
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: currentcolor;
}

.badge-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 168px), 1fr));
	gap: 0.75rem;
}

.badge-card {
	overflow: hidden;
	min-width: 0;
	border: 1px solid var(--c-border);
	border-radius: 0.9rem;
	background: var(--ld-bg-card);
	text-align: center;
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
	height: 164px;
	margin: 0.4rem;
	border-radius: 0.55rem;

	img {
		width: 132px;
		height: 148px;
		max-width: 90%;
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
	padding: 0.45rem 0.75rem 0.9rem;
}

.badge-name {
	display: block;
	overflow-wrap: anywhere;
	font-size: 0.9rem;
	font-weight: 650;
}

.badge-category {
	position: absolute;
	overflow: hidden;
	right: 0.45rem;
	bottom: 0.45rem;
	max-width: calc(100% - 0.9rem);
	padding: 0.15rem 0.4rem;
	border: 1px solid var(--c-border);
	border-radius: 0.3rem;
	background: var(--ld-bg-card);
	font-size: 0.6rem;
	line-height: 1.5;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-2);
}

.badge-date, .detail-date {
	display: block;
	margin-top: 0.6rem;
	font-size: 0.8rem;
	line-height: 1.7;
	color: var(--c-text-2);
}

.badge-date {
	margin-top: 0.25rem;
	font-size: 0.7rem;
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
	width: min(500px, calc(100% - 2rem));
	max-width: none;
	max-height: 85dvh;
	margin: auto;
	padding: 0;
	border: 1px solid var(--c-border);
	border-radius: 1.25rem;
	box-shadow: 0 24px 80px rgb(0 0 0 / 25%);
	background: var(--ld-bg-card);
	color: var(--c-text-1);
	transform-origin: center;
	overscroll-behavior: contain;

	&::backdrop {
		background: rgb(10 18 30 / 50%);
		backdrop-filter: blur(5px);
		animation: badge-backdrop-in 300ms ease both;
	}

	&.closing::backdrop { animation: badge-backdrop-out 260ms ease both; }
}

@keyframes badge-backdrop-in {
	from { opacity: 0; }
	to { opacity: 1; }
}

@keyframes badge-backdrop-out {
	from { opacity: 1; }
	to { opacity: 0; }
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

	h2 {
		overflow-wrap: anywhere;
		margin-top: 0.65rem;
		font-size: 1.6rem;
	}
}

.detail-story {
	overflow-wrap: anywhere;
	margin-top: 1.5rem;
	font-size: 0.9rem;
	line-height: 1.9;
	white-space: pre-line;
	color: var(--c-text-2);
}

@media (max-width: $breakpoint-phone) {
	.collection-header {
		min-height: 112px;
		padding: 1.25rem;
	}

	.header-art {
		flex-basis: 140px;
		margin-right: -0.5rem;
		transform: scale(0.85);
		transform-origin: right center;
	}

	.badge-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.6rem;
	}
	.badge-stage { height: 146px; }

	.badge-stage img {
		width: 116px;
		height: 130px;
	}
	.detail-body { padding: 1.25rem 1.5rem 1.75rem; }
}

@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
	.badge-stage img:hover { transform: rotate(-4deg) scale(1.04); }
}

@media (prefers-reduced-motion: reduce) {
	.badge-stage img { transition: none; }
	.badge-dialog::backdrop, .badge-dialog.closing::backdrop { animation: none; }
}
</style>

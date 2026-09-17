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
const dialogActive = ref(false)
const closing = ref(false)
const scrollLocked = useScrollLock(computed(() => import.meta.client ? document.body : null))
let sourceCard: HTMLElement | null = null
let disposed = false

function nextAnimationFrame() {
	return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

function waitForDialogTransition(dialog: HTMLDialogElement) {
	return new Promise<void>((resolve) => {
		let settled = false
		const controller = new AbortController()
		const finish = () => {
			if (settled)
				return
			settled = true
			controller.abort()
			resolve()
		}
		dialog.addEventListener('transitionend', (event) => {
			if (event.target === dialog && event.propertyName === 'opacity')
				finish()
		}, { signal: controller.signal })
		window.setTimeout(finish, 260)
	})
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
	if (reducedMotion.value !== 'reduce')
		await nextAnimationFrame()
	if (!disposed && dialog.open)
		dialogActive.value = true
}

async function closeBadge() {
	const dialog = detailDialog.value
	if (!dialog?.open || closing.value)
		return
	closing.value = true
	const transition = reducedMotion.value === 'reduce' ? Promise.resolve() : waitForDialogTransition(dialog)
	dialogActive.value = false
	await transition
	if (!disposed && dialog.open)
		dialog.close()
}

function onClose() {
	dialogActive.value = false
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
		<h1><Icon name="ph:medal-duotone" aria-hidden="true" />徽章</h1>
		<div class="header-art" aria-hidden="true">
			<span class="art-ring" />
			<span class="art-icon art-icon-back"><Icon name="ph:star-four-duotone" /></span>
			<span class="art-icon art-icon-front"><Icon name="ph:seal-check-duotone" /></span>
			<Icon class="art-spark" name="ph:sparkle-fill" />
		</div>
	</header>

	<section class="collection" aria-label="徽章收藏">
		<div v-if="badges.length" class="badge-grid" :class="{ 'single-badge': badges.length === 1 }">
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
					<span class="badge-halo" aria-hidden="true" />
					<img :src="badge.image" :alt="badge.name" width="320" height="360" loading="lazy">
				</span>
				<span class="badge-info">
					<span class="badge-name">{{ badge.name }}</span>
					<span class="badge-date"><Icon name="ph:calendar-blank" aria-hidden="true" /><time :datetime="badge.date">{{ badge.date }}</time></span>
					<span v-if="badge.category" class="badge-category" :title="badge.category">{{ badge.category }}</span>
				</span>
			</button>
		</div>
		<div v-else class="empty-collection">
			<Icon name="ph:medal-thin" aria-hidden="true" />
			<h3>等待第一枚徽章</h3>
			<p>新的故事，会从这里开始。</p>
		</div>
	</section>

	<dialog ref="detailDialog" class="badge-dialog" :class="{ 'dialog-active': dialogActive, closing }" aria-labelledby="badge-detail-title" @cancel.prevent="closeBadge" @close="onClose" @click="closeOnBackdrop">
		<template v-if="selectedBadge">
			<button class="close-detail" type="button" aria-label="关闭徽章详情" @click="closeBadge">
				<Icon name="ph:x-bold" />
			</button>
			<div class="detail-stage">
				<BadgeLaurel class="detail-laurel" />
				<img :src="selectedBadge.image" :alt="selectedBadge.name" width="320" height="360">
			</div>
			<div class="detail-body">
				<p class="detail-kicker">
					<Icon name="ph:seal-check-fill" aria-hidden="true" />徽章档案
				</p>
				<h2 id="badge-detail-title">
					{{ selectedBadge.name }}
				</h2>
				<div class="detail-meta">
					<span><Icon name="ph:calendar-blank" aria-hidden="true" />获得于 <time :datetime="selectedBadge.date">{{ selectedBadge.date }}</time></span>
					<span v-if="selectedBadge.category"><Icon name="ph:tag" aria-hidden="true" />{{ selectedBadge.category }}</span>
				</div>
				<p class="detail-story">
					{{ selectedBadge.description }}
				</p>
			</div>
		</template>
	</dialog>
</div>
</template>

<style lang="scss" scoped>
.badges-page {
	--badge-gold: #B58B42;

	padding: 1rem;
}

.collection-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	position: relative;
	overflow: hidden;
	min-height: 108px;
	margin-bottom: 1rem;
	padding: 1.25rem 1.6rem;
	border: 1px solid var(--c-border);
	border-radius: 1rem;
	background:
		linear-gradient(115deg, transparent 50%, color-mix(in srgb, var(--c-primary) 6%, transparent)),
		var(--ld-bg-card);

	&::after {
		content: "";
		position: absolute;
		top: 0;
		right: 0;
		width: 38%;
		height: 100%;
		border-left: 1px solid color-mix(in srgb, var(--c-primary) 9%, transparent);
		background-image: linear-gradient(color-mix(in srgb, var(--c-primary) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--c-primary) 7%, transparent) 1px, transparent 1px);
		background-size: 24px 24px;
		mask-image: linear-gradient(90deg, transparent, #000 50%);
		pointer-events: none;
	}

	h1 {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		position: relative;
		font-size: 2.15rem;
		font-weight: 720;
		letter-spacing: 0;
		z-index: 1;

		.iconify {
			font-size: 1.6rem;
			color: var(--c-primary);
		}
	}
}

.detail-kicker {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	font-size: 0.72rem;
	font-weight: 650;
	color: var(--c-primary);
}

.header-art {
	flex: 0 0 158px;
	position: relative;
	height: 74px;
	pointer-events: none;
	z-index: 1;
}

.art-ring {
	position: absolute;
	top: 50%;
	right: -48px;
	width: 160px;
	height: 160px;
	border: 1px solid color-mix(in srgb, var(--c-primary) 14%, transparent);
	border-radius: 50%;
	box-shadow: inset 0 0 0 18px color-mix(in srgb, var(--c-primary) 3%, transparent);
	transform: translateY(-50%);
}

.art-icon {
	display: grid;
	place-items: center;
	position: absolute;
	border: 1px solid color-mix(in srgb, var(--c-primary) 18%, var(--c-border));
	border-radius: 0.8rem;
	box-shadow: 0 8px 20px color-mix(in srgb, var(--c-primary) 8%, transparent);
	background: var(--ld-bg-card);
	color: var(--c-primary);
}

.art-icon-back {
	top: 4px;
	right: 74px;
	width: 54px;
	height: 60px;
	background: color-mix(in srgb, var(--c-primary) 5%, var(--ld-bg-card));
	font-size: 1.35rem;
	transform: rotate(-12deg);
}

.art-icon-front {
	top: 14px;
	right: 24px;
	width: 60px;
	height: 66px;
	font-size: 2rem;
	transform: rotate(8deg);
}

.art-spark {
	position: absolute;
	top: 1px;
	right: 4px;
	font-size: 0.75rem;
	color: var(--c-primary);
}

.badge-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
	gap: 0.9rem;

	&.single-badge {
		grid-template-columns: minmax(220px, 250px);
		justify-content: center;
	}
}

.badge-card {
	overflow: hidden;
	min-width: 0;
	border: 1px solid var(--c-border);
	border-radius: 0.75rem;
	box-shadow: 0 1px 0 rgb(0 0 0 / 2%);
	background: var(--ld-bg-card);
	text-align: center;
	transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
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
	contain: paint;
	min-height: 205px;
	margin: 0.45rem;
	border-radius: 0.45rem;

	img {
		position: relative;
		width: 148px;
		height: 166px;
		max-width: 78%;
		transition: filter 360ms var(--ease-out), transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
		filter: drop-shadow(0 10px 10px rgb(24 44 68 / 15%));
		object-fit: contain;
		z-index: 1;
	}
}

.badge-halo {
	position: absolute;
	width: 132px;
	height: 132px;
	border: 1px solid color-mix(in srgb, var(--c-primary) 12%, var(--c-border));
	border-radius: 50%;
	box-shadow: 0 0 0 18px color-mix(in srgb, var(--c-primary) 3%, transparent);
	transition: border-color 280ms var(--ease-out), box-shadow 360ms var(--ease-out), transform 420ms cubic-bezier(0.22, 1, 0.36, 1);

	&::after {
		content: "";
		position: absolute;
		opacity: 0;
		inset: 8px;
		border: 1px solid transparent;
		border-top-color: color-mix(in srgb, var(--c-primary) 52%, transparent);
		border-radius: 50%;
		transform: rotate(-45deg) scale(0.92);
		transition: opacity 220ms var(--ease-out), transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
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
	border-radius: 0.25rem;
	background: var(--ld-bg-card);
}

.badge-info {
	display: block;
	min-height: 66px;
	padding: 0.55rem 0.85rem 0.85rem;
}

.badge-name {
	display: block;
	overflow-wrap: anywhere;
	font-size: 0.92rem;
	font-weight: 650;
}

.badge-category {
	display: block;
	overflow: hidden;
	max-width: 100%;
	margin-top: 0.4rem;
	font-size: 0.6rem;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-3);
}

.badge-date {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.3rem;
	margin-top: 0.3rem;
	font-size: 0.7rem;
	font-variant-numeric: tabular-nums;
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
	opacity: 0;
	inset: 0;
	width: min(480px, calc(100% - 2rem));
	max-width: none;
	max-height: min(760px, calc(100dvh - 2rem));
	margin: auto;
	padding: 0;
	border: 1px solid var(--c-border);
	border-radius: 1rem;
	box-shadow: 0 24px 80px rgb(0 0 0 / 25%);
	background: var(--ld-bg-card);
	color: var(--c-text-1);
	transform: translateY(14px) scale(0.975);
	transform-origin: center;
	transition: opacity 220ms var(--ease-out), transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
	overscroll-behavior: contain;

	&::backdrop {
		opacity: 0;
		background: rgb(10 18 30 / 50%);
		backdrop-filter: blur(5px);
		transition: opacity 220ms ease;
	}

	&.dialog-active {
		opacity: 1;
		transform: none;

		&::backdrop { opacity: 1; }
	}

	&.closing {
		transition-duration: 180ms;
		transition-timing-function: var(--ease-in);

		&::backdrop { transition-duration: 180ms; }
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
	background: color-mix(in srgb, var(--ld-bg-card) 90%, transparent);
	color: var(--c-text-2);
	transition: background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
	z-index: 1;

	&:hover {
		background: var(--c-bg-2);
		color: var(--c-text);
		transform: rotate(4deg);
	}
}

.detail-stage {
	overflow: hidden;
	min-width: 0;
	min-height: 300px;
	padding: 2.25rem 1rem 1.5rem;

	&::after {
		content: "";
		position: absolute;
		bottom: 0;
		width: 72%;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--c-border), transparent);
	}

	img {
		position: relative;
		width: 220px;
		height: 248px;
		transform: scale(0.94);
		transition: transform 220ms var(--ease-in);
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
	color: var(--badge-gold);
	transform: scale(0.94);
	transition: opacity 350ms ease 60ms, transform 440ms cubic-bezier(0.22, 1, 0.36, 1) 60ms;
	pointer-events: none;
}

.detail-body {
	opacity: 0;
	min-width: 0;
	padding: 1.5rem 2.5rem 2.25rem;
	text-align: center;
	transition: opacity 220ms ease 80ms;

	h2 {
		overflow-wrap: anywhere;
		margin-top: 0.55rem;
		font-size: 1.6rem;
	}
}

.detail-kicker { justify-content: center; }

.detail-meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: 0.45rem 1rem;
	margin-top: 0.65rem;
	font-size: 0.76rem;
	font-variant-numeric: tabular-nums;
	color: var(--c-text-2);

	span {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
}

.dialog-active {
	.detail-stage img {
		animation: badge-detail-reveal 760ms cubic-bezier(0.22, 1, 0.36, 1) 30ms both;
	}

	.detail-laurel {
		opacity: 0.4;
		transform: none;
	}

	.detail-body {
		opacity: 1;
	}
}

.closing .detail-stage img {
	transition-delay: 0ms;
	animation: none;
}

.closing .detail-body { transition-delay: 0ms; }

@keyframes badge-detail-reveal {
	0% {
		opacity: 0.62;
		transform: rotate(-16deg) scale(0.9);
	}

	70% {
		opacity: 1;
		transform: rotate(2deg) scale(1.012);
	}

	100% {
		opacity: 1;
		transform: none;
	}
}

.detail-story {
	overflow-wrap: anywhere;
	margin-top: 1.35rem;
	padding-top: 1.15rem;
	border-top: 1px solid var(--c-border);
	font-size: 0.9rem;
	line-height: 1.9;
	white-space: pre-line;
	color: var(--c-text-2);
}

@media (max-width: $breakpoint-phone) {
	.badges-page { padding: 0.75rem; }

	.collection-header {
		min-height: 96px;
		margin-bottom: 0.8rem;
		padding: 1.1rem 1.25rem;

		&::after { width: 48%; }

		h1 { font-size: 1.8rem; }
	}

	.header-art {
		flex-basis: 126px;
		margin-right: -0.75rem;
		transform: scale(0.86);
		transform-origin: right center;
	}

	.badge-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.6rem;

		&.single-badge {
			grid-template-columns: minmax(0, 190px);
		}
	}
	.badge-stage { min-height: 156px; }

	.badge-stage img {
		width: 112px;
		height: 126px;
	}

	.badge-halo {
		width: 104px;
		height: 104px;
		box-shadow: 0 0 0 12px color-mix(in srgb, var(--c-primary) 3%, transparent);
	}

	.badge-info {
		min-height: 62px;
		padding: 0.45rem 0.65rem 0.75rem;
	}

	.detail-stage {
		min-height: 260px;

		img {
			width: 182px;
			height: 205px;
		}
	}

	.detail-laurel {
		width: 270px;
		height: 270px;
	}
	.detail-body { padding: 1.25rem 1.5rem 1.75rem; }
}

@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
	.badge-card:hover {
		border-color: color-mix(in srgb, var(--c-primary) 32%, var(--c-border));
		box-shadow: 0 10px 26px color-mix(in srgb, var(--c-primary) 9%, transparent);
		transform: translateY(-2px);

		.badge-stage img {
			transform: translateY(-4px) scale(1.035);
			filter: drop-shadow(0 14px 13px rgb(24 44 68 / 18%));
		}

		.badge-halo {
			border-color: color-mix(in srgb, var(--c-primary) 28%, var(--c-border));
			box-shadow: 0 0 0 20px color-mix(in srgb, var(--c-primary) 4%, transparent);
			transform: scale(1.055);

			&::after {
				opacity: 0.8;
				transform: rotate(135deg);
			}
		}
	}

	.badge-card:active { transform: translateY(-1px) scale(0.99); }
}

@media (prefers-reduced-motion: reduce) {
	.badge-card, .badge-stage img, .badge-halo, .badge-halo::after, .badge-dialog, .badge-dialog::backdrop, .detail-stage img, .detail-laurel, .detail-body { transition: none; }

	.detail-stage img { animation: none; }
}
</style>

<script setup lang="ts">
import photosData from '~~/data/photos.yml'

const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
layoutStore.setAside([])

useSeoMeta({
	title: '照片墙',
	ogType: 'website',
	description: `${appConfig.title}的照片墙，记录生活中的美好瞬间。`,
})

interface PhotoItem {
	src: string
	title: string
	date?: string
	location?: string
}

interface PhotoGroup {
	name: string
	items: PhotoItem[]
}

const groups = photosData.groups as PhotoGroup[]

// 分组切换
const groupNames = computed(() => ['全部', ...groups.map(g => g.name)])
const activeGroup = ref('全部')

const allPhotos = computed(() => groups.flatMap(g => g.items))

const filteredPhotos = computed(() => {
	if (activeGroup.value === '全部') return allPhotos.value
	const group = groups.find(g => g.name === activeGroup.value)
	return group?.items ?? []
})

// 灯箱
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
const lightboxEl = ref<HTMLImageElement>()

function openLightbox(index: number, event: MouseEvent) {
	lightboxIndex.value = index
	lightboxEl.value = event.currentTarget as HTMLImageElement
	lightboxOpen.value = true
}

function closeLightbox() {
	lightboxOpen.value = false
}

function prevPhoto() {
	lightboxIndex.value = (lightboxIndex.value - 1 + filteredPhotos.value.length) % filteredPhotos.value.length
}

function nextPhoto() {
	lightboxIndex.value = (lightboxIndex.value + 1) % filteredPhotos.value.length
}

// 键盘导航
onMounted(() => {
	useEventListener('keydown', (e: KeyboardEvent) => {
		if (!lightboxOpen.value) return
		if (e.key === 'ArrowLeft') prevPhoto()
		else if (e.key === 'ArrowRight') nextPhoto()
		else if (e.key === 'Escape') closeLightbox()
	})
})

const currentPhoto = computed(() => filteredPhotos.value[lightboxIndex.value])
</script>

<template>
<div class="photos proper-height">
	<div class="mobile-only">
		<BlogHeader to="/" suffix="照片墙" tag="h1" />
	</div>

	<header class="photos-header">
		<div>
			<h1 class="photos-title">
				照片墙
			</h1>
			<p class="photos-subtitle">
				生活中的美好瞬间
			</p>
		</div>
	</header>

	<!-- 分组标签栏 -->
	<nav class="group-tabs">
		<button
			v-for="name in groupNames"
			:key="name"
			class="group-tab"
			:class="{ active: activeGroup === name }"
			@click="activeGroup = name"
		>
			{{ name }}
		</button>
	</nav>

	<!-- 瀑布流 -->
	<TransitionGroup
		v-if="filteredPhotos.length"
		tag="div"
		class="masonry"
		name="float-in"
	>
		<div
			v-for="photo, index in filteredPhotos"
			:key="photo.src"
			class="masonry-item"
			:style="getFixedDelay(index * 0.03)"
		>
			<div class="photo-card" @click="openLightbox(index, $event)">
				<NuxtImg
					:src="photo.src"
					:alt="photo.title"
					loading="lazy"
					class="photo-img"
				/>
				<div class="photo-overlay">
					<span class="photo-title">{{ photo.title }}</span>
					<span v-if="photo.location" class="photo-location">
						<Icon name="ph:map-pin-bold" />
						{{ photo.location }}
					</span>
				</div>
			</div>
		</div>
	</TransitionGroup>

	<ZError
		v-else
		icon="ph:camera-bold"
		title="还没有上传照片"
	/>

	<!-- 灯箱 -->
	<Teleport to="body">
		<Transition name="fade">
			<div v-if="lightboxOpen && currentPhoto" class="lightbox" @click.self="closeLightbox">
				<div class="lightbox-content">
					<img :src="currentPhoto.src" :alt="currentPhoto.title" class="lightbox-img">
					<div class="lightbox-info">
						<span class="lightbox-title">{{ currentPhoto.title }}</span>
						<span v-if="currentPhoto.date || currentPhoto.location" class="lightbox-meta">
							{{ currentPhoto.location }}{{ currentPhoto.location && currentPhoto.date ? ' · ' : '' }}{{ currentPhoto.date }}
						</span>
					</div>
				</div>
				<button class="lightbox-btn lightbox-prev" aria-label="上一张" @click="prevPhoto">
					<Icon name="ph:caret-left-bold" />
				</button>
				<button class="lightbox-btn lightbox-next" aria-label="下一张" @click="nextPhoto">
					<Icon name="ph:caret-right-bold" />
				</button>
				<button class="lightbox-btn lightbox-close" aria-label="关闭" @click="closeLightbox">
					<Icon name="ph:x-bold" />
				</button>
			</div>
		</Transition>
	</Teleport>
</div>

<style lang="scss" scoped>
.photos {
	padding: 1rem;
}

.photos-header {
	margin-bottom: 1.5em;
}

.photos-title {
	margin: 0;
	font-size: 1.6em;
	font-weight: 800;
}

.photos-subtitle {
	margin: 0.2em 0 0;
	font-size: 0.9em;
	color: var(--c-text-3);
}

// 分组标签栏
.group-tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5em;
	margin-bottom: 1.5em;
}

.group-tab {
	padding: 0.35em 0.9em;
	border-radius: 1em;
	border: 1px solid var(--c-border);
	background-color: transparent;
	font-size: 0.9em;
	color: var(--c-text-2);
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		border-color: var(--c-primary);
		color: var(--c-primary);
	}

	&.active {
		background-color: var(--c-primary-soft);
		border-color: var(--c-primary);
		color: var(--c-primary);
		font-weight: 600;
	}
}

// 瀑布流
.masonry {
	column-count: 3;
	column-gap: 0.8em;
}

.masonry-item {
	break-inside: avoid;
	margin-bottom: 0.8em;
	animation: float-in 0.2s var(--delay) backwards;
}

.photo-card {
	position: relative;
	border-radius: 0.5em;
	box-shadow: var(--box-shadow-2);
	overflow: hidden;
	cursor: pointer;
	transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s;

	&:hover {
		transform: scale(1.03);
		box-shadow: var(--box-shadow-3);

		.photo-img {
			transform: scale(1.05);
		}

		.photo-overlay {
			opacity: 1;
		}

		.photo-title,
		.photo-location {
			transform: translateY(0);
		}
	}
}

.photo-img {
	width: 100%;
	display: block;
	transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.photo-overlay {
	position: absolute;
	bottom: 0;
	inset-inline: 0;
	padding: 2em 0.8em 0.6em;
	background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
	color: white;
	opacity: 0;
	transition: opacity 0.2s;
}

.photo-title {
	display: block;
	font-weight: 600;
	font-size: 0.95em;
	transform: translateY(0.5em);
	transition: transform 0.2s;
}

.photo-location {
	display: flex;
	align-items: center;
	gap: 0.3em;
	margin-top: 0.2em;
	font-size: 0.8em;
	opacity: 0.8;
	transform: translateY(0.5em);
	transition: transform 0.2s 0.05s;
}

// 灯箱
.lightbox {
	position: fixed;
	inset: 0;
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: rgba(0, 0, 0, 0.85);
	backdrop-filter: blur(0.5rem);
}

.lightbox-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	max-width: 90vw;
	max-height: 90vh;
}

.lightbox-img {
	max-width: 100%;
	max-height: 80vh;
	border-radius: 0.5em;
	object-fit: contain;
}

.lightbox-info {
	margin-top: 1em;
	text-align: center;
	color: rgba(255, 255, 255, 0.9);
}

.lightbox-title {
	display: block;
	font-size: 1.1em;
	font-weight: 600;
}

.lightbox-meta {
	display: block;
	margin-top: 0.3em;
	font-size: 0.85em;
	color: rgba(255, 255, 255, 0.6);
}

.lightbox-btn {
	position: absolute;
	padding: 0.5em;
	border-radius: 50%;
	border: none;
	background-color: rgba(255, 255, 255, 0.15);
	color: white;
	font-size: 1.5em;
	cursor: pointer;
	transition: background-color 0.2s;

	&:hover {
		background-color: rgba(255, 255, 255, 0.3);
	}
}

.lightbox-prev {
	left: 1em;
	top: 50%;
	transform: translateY(-50%);
}

.lightbox-next {
	right: 1em;
	top: 50%;
	transform: translateY(-50%);
}

.lightbox-close {
	top: 1em;
	right: 1em;
}

// 灯箱过渡
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

@media (max-width: $breakpoint-mobile) {
	.masonry {
		column-count: 2;
	}

	.lightbox-prev,
	.lightbox-next {
		font-size: 1.2em;
	}
}
</style>

<script setup lang="ts">
import type { CollectionBadge } from '~/utils/badge-collection'
import { parseBadgeCollection } from '~/utils/badge-collection'
import { validateBadgeSvg } from '~/utils/badge-svg'
import { moveArrayItem } from '~/utils/treasure-doc'

const props = defineProps<{
	enabled: boolean
	load: () => Promise<string>
	preview: (image: string) => string
	loadImage: (image: string) => Promise<string>
	save: (items: CollectionBadge[], uploads: Record<string, string>) => void
}>()

const items = ref<CollectionBadge[]>([])
const loading = ref(true)
const ready = ref(false)
const uploading = ref(false)
const error = ref('')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const uploadTarget = ref<string | null>(null)
const uploads = ref<Record<string, string>>({})
const previews = ref<Record<string, string>>({})
const failedImages = ref(new Set<string>())
const disabled = computed(() => !props.enabled || !ready.value || uploading.value)
const categorySuggestions = computed(() => [...new Set(items.value.map(item => item.category?.trim()).filter(Boolean))])
let disposed = false

function setPreview(image: string, source: string) {
	if (disposed)
		return
	if (previews.value[image])
		URL.revokeObjectURL(previews.value[image])
	previews.value[image] = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }))
}

async function loadCollection() {
	loading.value = true
	ready.value = false
	error.value = ''
	try {
		items.value = parseBadgeCollection(await props.load())
		ready.value = true
	}
	catch (cause) {
		error.value = cause instanceof Error ? cause.message : String(cause)
	}
	finally {
		loading.value = false
	}
}

function addBadge() {
	const date = new Date()
	const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
	items.value.push({ id: crypto.randomUUID(), name: '', image: '', description: '', date: today })
}

function selectSvg(id: string) {
	uploadTarget.value = id
	fileInput.value?.click()
}

async function uploadSvg(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	const target = uploadTarget.value
	input.value = ''
	if (!file || !target || disabled.value)
		return
	error.value = ''
	uploading.value = true
	try {
		if (!file.name.toLowerCase().endsWith('.svg'))
			throw new Error('请选择 SVG 格式的徽章。')
		if (file.size > 2 * 1024 * 1024)
			throw new Error('徽章 SVG 不能超过 2 MB。')
		const source = await file.text()
		validateBadgeSvg(source)
		const item = items.value.find(item => item.id === target)
		if (!item || disposed)
			return
		const image = `/images/badges/${crypto.randomUUID()}.svg`
		uploads.value[image] = source
		setPreview(image, source)
		item.image = image
		item.demo = false
		if (!item.name)
			item.name = file.name.slice(0, -4)
	}
	catch (cause) {
		error.value = cause instanceof Error ? cause.message : String(cause)
	}
	finally {
		uploading.value = false
	}
}

async function recoverPreview(image: string) {
	if (failedImages.value.has(image) || previews.value[image])
		return
	failedImages.value.add(image)
	try {
		const source = await props.loadImage(image)
		validateBadgeSvg(source)
		setPreview(image, source)
	}
	catch {
		// 保留表单和原始路径，避免预览失败导致误删已有徽章。
	}
}

function saveCollection() {
	if (disabled.value)
		return
	error.value = ''
	try {
		const collection = parseBadgeCollection(JSON.stringify(items.value))
		const referencedUploads = Object.fromEntries(collection
			.filter(item => uploads.value[item.image])
			.map(item => [item.image, uploads.value[item.image]!]))
		props.save(collection, referencedUploads)
	}
	catch (cause) {
		error.value = cause instanceof Error ? cause.message : String(cause)
	}
}

onMounted(loadCollection)
onBeforeUnmount(() => {
	disposed = true
	for (const url of Object.values(previews.value))
		URL.revokeObjectURL(url)
})
</script>

<template>
<div class="badges-editor">
	<p class="editor-note">
		上传 SVG，填写名称、分类、详情和获得日期，保存后点击「提交全部」发布。
	</p>
	<p v-if="!enabled" class="editor-error">
		请先完成 GitHub 配置，再管理徽章。
	</p>
	<p v-if="error" class="editor-error" role="alert">
		{{ error }}
	</p>
	<p v-if="loading" role="status">
		正在读取徽章…
	</p>
	<button v-if="!loading && !ready" type="button" @click="loadCollection">
		重新读取
	</button>
	<input ref="fileInput" class="file-input" type="file" accept=".svg,image/svg+xml" aria-label="选择徽章 SVG" @change="uploadSvg">
	<datalist id="badge-category-suggestions">
		<option v-for="category in categorySuggestions" :key="category" :value="category" />
	</datalist>
	<fieldset :disabled="disabled">
		<div v-for="(item, index) in items" :key="item.id" class="badge-editor-item">
			<div class="badge-editor-preview">
				<img v-if="item.image" :src="previews[item.image] || preview(item.image)" :alt="item.name || '徽章预览'" width="160" height="180" @error="recoverPreview(item.image)">
				<Icon v-else name="ph:medal-thin" aria-hidden="true" />
				<button type="button" @click="selectSvg(item.id)">
					<Icon name="ph:upload-simple-bold" />{{ item.image ? '替换 SVG' : '上传 SVG' }}
				</button>
				<small v-if="failedImages.has(item.image) && !previews[item.image]">预览暂不可用</small>
			</div>
			<div class="badge-editor-fields">
				<label>徽章名称<input v-model="item.name" type="text" maxlength="100" placeholder="例如：初次启程"></label>
				<label>获得日期<input v-model="item.date" type="date"></label>
				<label>徽章分类<input v-model="item.category" type="text" list="badge-category-suggestions" maxlength="30" placeholder="例如：活动纪念、学习成就（选填）"></label>
				<label>徽章详情<textarea v-model="item.description" rows="4" placeholder="记录获得徽章的经历与意义" /></label>
				<label class="demo-option"><input v-model="item.demo" type="checkbox">演示徽章（不参与统计）</label>
				<div class="item-actions">
					<button type="button" :aria-label="`上移第 ${index + 1} 枚徽章`" :disabled="index === 0" @click="moveArrayItem(items, index, -1)">
						<Icon name="ph:arrow-up-bold" />
					</button>
					<button type="button" :aria-label="`下移第 ${index + 1} 枚徽章`" :disabled="index === items.length - 1" @click="moveArrayItem(items, index, 1)">
						<Icon name="ph:arrow-down-bold" />
					</button>
					<button class="remove-badge" type="button" :aria-label="`移除第 ${index + 1} 枚徽章`" @click="items.splice(index, 1)">
						<Icon name="ph:trash-bold" />移除徽章
					</button>
				</div>
			</div>
		</div>
		<p v-if="ready && !items.length" class="editor-note">
			还没有徽章，添加第一枚吧。
		</p>
		<button type="button" @click="addBadge">
			<Icon name="ph:plus-bold" />添加徽章
		</button>
	</fieldset>
	<div class="editor-footer">
		<span v-if="uploading" role="status">正在处理 SVG…</span>
		<button class="save-badges" :disabled="disabled" type="button" @click="saveCollection">
			保存徽章到暂存区
		</button>
	</div>
</div>
</template>

<style lang="scss" scoped>
.badges-editor {
	display: grid;
	gap: 1rem;

	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-height: 2.4rem;
		padding: 0.4rem 0.8rem;
		border: 1px solid var(--c-border);
		border-radius: 0.45rem;
		background: var(--ld-bg-card);
		font-size: 0.85rem;

		&:disabled { opacity: 0.45; }

		&:focus-visible {
			outline: 2px solid var(--c-primary);
			outline-offset: 2px;
		}
	}

	fieldset {
		display: grid;
		gap: 1rem;
		min-width: 0;
	}
	fieldset:disabled { opacity: 0.6; }
}

.file-input { display: none; }

.editor-note {
	font-size: 0.85rem;
	line-height: 1.7;
	color: var(--c-text-2);
}

.editor-error {
	font-size: 0.85rem;
	color: var(--c-error);
}

.badge-editor-item {
	display: grid;
	grid-template-columns: 160px minmax(0, 1fr);
	gap: 1.25rem;
	padding: 1rem;
	border: 1px solid var(--c-border);
	border-radius: 0.75rem;
	background: var(--c-bg-1);
}

.badge-editor-preview {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;

	img {
		width: 160px;
		height: 180px;
		object-fit: contain;
	}

	> .iconify {
		margin: 3rem 0;
		font-size: 4rem;
		color: var(--c-text-2);
	}

	small {
		font-size: 0.75rem;
		color: var(--c-text-2);
	}
}

.badge-editor-fields {
	display: grid;
	gap: 0.75rem;
	min-width: 0;

	label {
		display: grid;
		gap: 0.35rem;
		font-size: 0.85rem;
	}

	input:not([type="checkbox"]), textarea {
		width: 100%;
		min-width: 0;
		padding: 0.6rem;
		border: 1px solid var(--c-border);
		border-radius: 0.4rem;
		background: var(--ld-bg-card);
	}

	textarea { resize: vertical; }

	.demo-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--c-text-2);
	}
}

.item-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.remove-badge {
	margin-left: auto;
	color: var(--c-error);
}

.editor-footer {
	display: flex;
	justify-content: flex-end;
	gap: 1rem;
}

.badges-editor .save-badges {
	background: var(--c-primary);
	color: var(--c-bg);
}

@media (max-width: $breakpoint-phone) {
	.badge-editor-item { grid-template-columns: minmax(0, 1fr); }
}
</style>

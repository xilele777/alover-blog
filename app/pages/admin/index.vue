<script setup lang="ts">
import blogConfig from '../../../blog.config'

interface GithubSettings {
	owner: string
	repo: string
	branch: string
	token: string
}

interface GithubTreeItem {
	path?: string
	type?: string
}

interface GithubPost {
	category?: string
	date?: string
	draft?: boolean
	name: string
	path: string
	recommend?: number
	sha?: string
	tags?: string[]
	title: string
}

interface CategoryDefinition {
	color?: string
	icon: string
	name: string
}

interface GithubContent {
	content: string
	html_url?: string
	path: string
	sha: string
}

interface PublishResult {
	commitUrl?: string
	htmlUrl?: string
	path?: string
}

interface PendingConfirmation {
	action: () => Promise<void> | void
	confirmLabel: string
	detail?: string
	message: string
	title: string
}

interface StagedChange {
	content?: string
	encoding?: 'utf-8' | 'base64'
	path: string
	delete?: boolean
}

const settingsKey = 'blog-admin:github-settings'
const postsKey = 'blog-admin:posts'
const customCategoriesKey = 'blog-admin:custom-categories'
const adminAccessKey = '叮当猫'
const adminAccessStorageKey = 'blog-admin:access-granted'
const quoteRegex = /['"]/g
const whitespaceRegex = /[\s_]+/g
const slugUnsafeRegex = /[^\p{L}\p{N}-]+/gu
const multiDashRegex = /-+/g
const trimDashRegex = /^-|-$/g
const tagSplitRegex = /[\s,，]+/
const fileUnsafeRegex = /[\\/:*?"<>|]/g
const fileWhitespaceRegex = /\s+/g
const newlineRegex = /\n/g
const lineBreakRegex = /\r?\n/
const encodedSlashRegex = /%2F/g
const leadingSlashRegex = /^\/+/
// Markdown files may be committed with either LF or CRLF line endings.
const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
const mdExtensionRegex = /\.md$/
const contentPrefixRegex = /^content/
const publicPrefixRegex = /^public\//
const bracketListRegex = /^\[(.*)\]$/
const listTokenRegex = /"[^"\\]*(?:\\.[^"\\]*)*"|'[^']*'|[^,\s]+/g
const surroundingQuoteRegex = /^["']|["']$/g
const contentPathRegex = /^content\/posts\/(\d{4})\/(.+)\.md$/
const fileExtensionRegex = /\.[^.]+$/
const categoryConfigBlockRegex = /\/\/ BLOG_ADMIN_CATEGORIES_START[\s\S]*?\/\/ BLOG_ADMIN_CATEGORIES_END/
const blogConfigDeclarationRegex = /^const\s+blogConfig\s*=/m
const categoriesPropertyRegex = /(\bcategories\s*:\s*\{\s*)/
const frontmatterTagsLineRegex = /^tags:[^\r\n]*$/m
const frontmatterUpdatedLineRegex = /^updated:[^\r\n]*$/m
const githubRequestTimeout = 30000
const maxImageSize = 8 * 1024 * 1024
const imageExtensionMap: Record<string, string> = {
	'image/avif': 'avif',
	'image/gif': 'gif',
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
}
const bodyImageSizeOptions = [
	{ label: '自适应', value: '' },
	{ label: '小图', value: '360' },
	{ label: '中图', value: '560' },
	{ label: '大图', value: '760' },
]

const defaultCategoryName = blogConfig.defaultCategory
const baseCategoryDefinitions = Object.entries(blogConfig.article.categories).map(([name, value]) => ({
	color: 'color' in value ? value.color : undefined,
	icon: value.icon || blogConfig.article.defaultCategoryIcon,
	name,
}))
const baseCategoryOptions = baseCategoryDefinitions.map(item => item.name)
const defaultArticleType = Object.keys(blogConfig.article.types)[0] || 'tech'
const categoryDefinitions = ref<CategoryDefinition[]>(baseCategoryDefinitions)
const categoryOptions = computed(() => categoryDefinitions.value.map(item => item.name))
const settings = reactive<GithubSettings>({
	owner: 'xilele777',
	repo: 'alover-blog',
	branch: 'main',
	token: '',
})

const form = reactive({
	title: '',
	slug: '',
	description: '',
	image: '',
	date: '',
	updated: '',
	category: baseCategoryOptions.includes('技术') ? '技术' : baseCategoryOptions[0],
	customCategory: '',
	customCategoryColor: '#64748b',
	customCategoryIcon: 'ph:folder-bold',
	tags: '',
	type: defaultArticleType,
	recommend: 1,
	draft: false,
	body: '',
})

const categoryDraft = reactive({
	name: '',
	color: '#64748b',
	icon: blogConfig.article.defaultCategoryIcon,
})
const accessKeyInput = ref('')
const accessKeyError = ref('')
const isAccessReady = ref(false)
const isAdminUnlocked = ref(false)
const stagedChanges = ref<StagedChange[]>([])
const isCommittingChanges = ref(false)
const bodyImageWidth = ref('')

const posts = ref<GithubPost[]>([])
const selectedPostPath = ref('')
const selectedPostSha = ref('')
const selectedPostOriginalPath = ref('')
const activeDialog = ref<'categories' | 'confirm' | 'delete' | 'github' | 'meta' | 'posts' | 'tags' | null>(null)
const pendingConfirmation = shallowRef<PendingConfirmation | null>(null)
const postSearch = ref('')
const postView = ref<'all' | 'drafts' | 'published'>('all')
const postPage = ref(1)
const isLoadingPosts = ref(false)
const isLoadingPost = ref(false)
const isSavingCategories = ref(false)
const isUpdatingTags = ref(false)
const isUploadingImage = ref(false)
const isUploadingBodyImage = ref(false)
const isHydratingForm = ref(false)
const statusMessage = ref('')
const errorMessage = ref('')
const publishResult = ref<PublishResult | null>(null)
const imageUploadInput = ref<HTMLInputElement>()
const bodyImageUploadInput = ref<HTMLInputElement>()
const bodyTextarea = ref<HTMLTextAreaElement>()
const tagInput = ref('')
const managedTag = ref('')
const mergedTag = ref('')
const coverPreviewUrl = ref('')
const bodyImagePreviewUrls = ref<Record<string, string>>({})

useSeoMeta({
	title: '博客后台',
	description: '博客文章管理后台。',
	robots: 'noindex, nofollow, noarchive',
})

const layoutStore = useLayoutStore()
layoutStore.setAside([])

function hydrateAdminState() {
	loadCustomCategories()
	loadCachedPosts()
	const raw = localStorage.getItem(settingsKey)
	if (!raw) {
		resetForm()
		return
	}

	try {
		Object.assign(settings, JSON.parse(raw))
	}
	catch {
		localStorage.removeItem(settingsKey)
	}
	resetForm()
	if (hasGithubSettings())
		loadPosts({ silent: posts.value.length > 0 })
}

function unlockAdmin() {
	if (accessKeyInput.value !== adminAccessKey) {
		accessKeyError.value = '访问密钥不正确。'
		return
	}

	sessionStorage.setItem(adminAccessStorageKey, 'true')
	isAdminUnlocked.value = true
	accessKeyInput.value = ''
	accessKeyError.value = ''
	hydrateAdminState()
}

onMounted(() => {
	isAdminUnlocked.value = sessionStorage.getItem(adminAccessStorageKey) === 'true'
	isAccessReady.value = true
	if (isAdminUnlocked.value)
		hydrateAdminState()
})

watch(settings, () => {
	localStorage.setItem(settingsKey, JSON.stringify(settings))
}, { deep: true })

watch(() => form.title, (title) => {
	if (selectedPostPath.value || form.slug)
		return

	const normalized = title
		.trim()
		.toLowerCase()
		.replace(quoteRegex, '')
		.replace(whitespaceRegex, '-')
		.replace(slugUnsafeRegex, '')
		.replace(multiDashRegex, '-')
		.replace(trimDashRegex, '')

	if (normalized)
		form.slug = normalized
})

watch(() => [form.title, form.description, form.image, form.category, form.customCategory, form.tags, form.type, form.recommend, form.draft, form.body], () => {
	if (isHydratingForm.value || isCommittingChanges.value)
		return
	form.updated = localDateTime()
}, { deep: true })

const repoPath = computed(() => `/repos/${settings.owner.trim()}/${settings.repo.trim()}`)
const selectedCategory = computed(() => form.category === '__custom' ? form.customCategory.trim() : form.category)
const tags = computed(() => [...new Set(form.tags.split(tagSplitRegex).map(tag => tag.trim()).filter(Boolean))])
const tagStats = computed(() => {
	const counts = new Map<string, number>()
	for (const post of posts.value) {
		for (const tag of post.tags || [])
			counts.set(tag, (counts.get(tag) || 0) + 1)
	}
	return Array.from(counts.entries(), ([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})
const tagSuggestions = computed(() => tagStats.value.map(item => item.name).filter(tag => !tags.value.includes(tag)))
const postsPerPage = 5

const searchedPosts = computed(() => {
	const keyword = postSearch.value.trim().toLowerCase()
	return posts.value.filter((post) => {
		if (postView.value === 'drafts' && !post.draft)
			return false
		if (postView.value === 'published' && post.draft)
			return false
		if (!keyword)
			return true
		return [
			post.title,
			post.category,
			post.date,
			post.path,
			...(post.tags || []),
		].some(value => value?.toLowerCase().includes(keyword))
	})
})

const postCounts = computed(() => ({
	all: posts.value.length,
	drafts: posts.value.filter(post => post.draft).length,
	published: posts.value.filter(post => !post.draft).length,
}))

const totalPostPages = computed(() => Math.max(1, Math.ceil(searchedPosts.value.length / postsPerPage)))
const pagedPosts = computed(() => {
	const start = (postPage.value - 1) * postsPerPage
	return searchedPosts.value.slice(start, start + postsPerPage)
})

const postPath = computed(() => {
	const year = (form.date || localDateTime()).slice(0, 4)
	const slug = sanitizeFileName(form.slug || form.title || defaultSlug())
	return `content/posts/${year}/${slug}.md`
})
const previewPath = computed(() => postPath.value.replace(contentPrefixRegex, '').replace(mdExtensionRegex, ''))

const isEditingExisting = computed(() => Boolean(selectedPostPath.value && selectedPostSha.value))
const pathChanged = computed(() => isEditingExisting.value && selectedPostOriginalPath.value !== postPath.value)
const postListRange = computed(() => {
	if (!searchedPosts.value.length)
		return '0 / 0'
	const start = (postPage.value - 1) * postsPerPage + 1
	const end = Math.min(start + postsPerPage - 1, searchedPosts.value.length)
	return `${start}-${end} / ${searchedPosts.value.length}`
})

const canUseGithub = computed(() => hasGithubSettings())
const stagedChangeCount = computed(() => stagedChanges.value.length)
const stagedChangeLabel = computed(() => stagedChangeCount.value ? `提交全部（${stagedChangeCount.value}）` : '提交全部')
const dialogMeta = computed(() => ({
	categories: { icon: 'ph:folders-bold', title: '分类管理' },
	confirm: { icon: 'ph:warning-circle-bold', title: pendingConfirmation.value?.title || '确认操作' },
	delete: { icon: 'ph:trash-bold', title: '删除文章' },
	github: { icon: 'ph:github-logo-bold', title: 'GitHub 配置' },
	meta: { icon: 'ph:sliders-horizontal-bold', title: '文章设置' },
	posts: { icon: 'ph:files-bold', title: postView.value === 'drafts' ? '草稿箱' : '文章列表' },
	tags: { icon: 'ph:tag-bold', title: '标签管理' },
})[activeDialog.value || 'meta'])

watch([postSearch, postView], () => {
	postPage.value = 1
})

watch(totalPostPages, (total) => {
	if (postPage.value > total)
		postPage.value = total
})

const markdown = computed(() => {
	const lines = [
		'---',
		`title: ${yamlString(form.title || '未命名文章')}`,
		`date: ${yamlString(form.date)}`,
		`updated: ${yamlString(form.updated || form.date)}`,
	]

	if (form.description.trim())
		lines.push(`description: ${yamlString(form.description.trim())}`)
	if (form.image.trim())
		lines.push(`image: ${yamlString(form.image.trim())}`)
	if (selectedCategory.value)
		lines.push(`categories: [${yamlString(selectedCategory.value)}]`)
	if (tags.value.length)
		lines.push(`tags: [${tags.value.map(tag => yamlString(tag)).join(', ')}]`)
	if (form.type && form.type !== defaultArticleType)
		lines.push(`type: ${yamlString(form.type)}`)
	if (Number(form.recommend) > 1)
		lines.push(`recommend: ${Math.round(Number(form.recommend))}`)
	if (form.draft)
		lines.push('draft: true')

	lines.push('---', '', form.body.trimEnd(), '')
	return lines.join('\n')
})
const previewBody = computed(() => {
	let value = form.body.trim() || ' '
	for (const [imagePath, previewUrl] of Object.entries(bodyImagePreviewUrls.value))
		value = value.replaceAll(imagePath, previewUrl)
	return value
})
const previewTypeClass = computed(() => getPostTypeClassName(form.type, { prefix: 'md' }))
const coverPreviewSrc = computed(() => coverPreviewUrl.value || form.image)

function openDialog(dialog: NonNullable<typeof activeDialog.value>) {
	activeDialog.value = dialog
}

function closeDialog() {
	activeDialog.value = null
	pendingConfirmation.value = null
}

function requestConfirmation(confirmation: PendingConfirmation) {
	pendingConfirmation.value = confirmation
	activeDialog.value = 'confirm'
}

async function runPendingConfirmation() {
	const confirmation = pendingConfirmation.value
	if (!confirmation)
		return
	activeDialog.value = null
	pendingConfirmation.value = null
	await confirmation.action()
}

function hasGithubSettings() {
	return Boolean(
		settings.owner.trim()
		&& settings.repo.trim()
		&& settings.branch.trim()
		&& settings.token.trim(),
	)
}

function loadCachedPosts() {
	const raw = localStorage.getItem(postsKey)
	if (!raw)
		return
	try {
		posts.value = JSON.parse(raw)
	}
	catch {
		localStorage.removeItem(postsKey)
	}
}

function cachePosts() {
	localStorage.setItem(postsKey, JSON.stringify(posts.value))
}

function loadCustomCategories() {
	const raw = localStorage.getItem(customCategoriesKey)
	if (!raw)
		return
	try {
		const values = JSON.parse(raw)
		if (!Array.isArray(values))
			return
		const cached = values
			.map((item): CategoryDefinition | null => {
				if (typeof item === 'string')
					return { icon: blogConfig.article.defaultCategoryIcon, name: item.trim() }
				if (!item || typeof item !== 'object' || typeof item.name !== 'string')
					return null
				return {
					color: typeof item.color === 'string' ? item.color : undefined,
					icon: typeof item.icon === 'string' && item.icon.trim() ? item.icon.trim() : blogConfig.article.defaultCategoryIcon,
					name: item.name.trim(),
				}
			})
			.filter((item): item is CategoryDefinition => Boolean(item?.name))
		const merged = new Map(baseCategoryDefinitions.map(item => [item.name, item]))
		for (const item of cached)
			merged.set(item.name, item)
		categoryDefinitions.value = [...merged.values()]
	}
	catch {
		localStorage.removeItem(customCategoriesKey)
	}
}

function cacheCustomCategories() {
	localStorage.setItem(customCategoriesKey, JSON.stringify(categoryDefinitions.value))
}

function upsertCategory(definition: CategoryDefinition) {
	const normalized = {
		color: definition.color?.trim() || undefined,
		icon: definition.icon.trim() || blogConfig.article.defaultCategoryIcon,
		name: definition.name.trim(),
	}
	if (!normalized.name)
		return
	const index = categoryDefinitions.value.findIndex(item => item.name === normalized.name)
	if (index >= 0)
		categoryDefinitions.value[index] = normalized
	else
		categoryDefinitions.value.push(normalized)
	categoryDefinitions.value.sort((a, b) => a.name.localeCompare(b.name))
	cacheCustomCategories()
}

async function createCategory(definition: CategoryDefinition) {
	const category = definition.name.trim()
	if (!category)
		return false
	upsertCategory({
		color: definition.color,
		icon: definition.icon,
		name: category,
	})
	// Keep the category available locally before GitHub is configured.
	// It can be pushed later from 分类管理 after credentials are supplied.
	if (canUseGithub.value)
		return await saveCategoryConfig()

	statusMessage.value = '分类已添加到本地。配置 GitHub 后可提交到仓库。'
	return true
}

async function confirmArticleCategory() {
	const category = form.customCategory.trim()
	const saved = await createCategory({
		color: form.customCategoryColor,
		icon: form.customCategoryIcon,
		name: category,
	})
	if (!saved)
		return
	form.category = category
	form.customCategory = ''
}

async function confirmManagedCategory() {
	const saved = await createCategory({
		color: categoryDraft.color,
		icon: categoryDraft.icon,
		name: categoryDraft.name,
	})
	if (!saved)
		return
	categoryDraft.name = ''
	categoryDraft.color = '#64748b'
	categoryDraft.icon = blogConfig.article.defaultCategoryIcon
}

function validatePublish() {
	if (!settings.owner.trim())
		return '请先在 GitHub 配置里填写 Owner。'
	if (!settings.repo.trim())
		return '请先在 GitHub 配置里填写 Repo。'
	if (!settings.branch.trim())
		return '请先在 GitHub 配置里填写 Branch。'
	if (!settings.token.trim())
		return '请先在 GitHub 配置里填写 Token。'
	if (!form.title.trim())
		return '请先填写文章标题。'
	if (!form.body.trim())
		return '请先填写正文。'
	return ''
}

function pad(value: number) {
	return value.toString().padStart(2, '0')
}

function localDateTime() {
	const value = new Date()
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`
}

function defaultSlug() {
	const value = new Date()
	return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}`
}

function clearMessages() {
	statusMessage.value = ''
	errorMessage.value = ''
	publishResult.value = null
}

function upsertPostListItem(path: string, sha?: string) {
	const item = {
		category: selectedCategory.value,
		date: form.date,
		draft: form.draft,
		name: path.split('/').at(-1) || path,
		path,
		recommend: Number(form.recommend) > 1 ? Math.round(Number(form.recommend)) : undefined,
		sha,
		tags: tags.value,
		title: form.title.trim() || path.split('/').at(-1)?.replace(mdExtensionRegex, '') || path,
	}
	const index = posts.value.findIndex(post => post.path === path)
	if (index >= 0)
		posts.value[index] = item
	else
		posts.value.unshift(item)
	posts.value.sort((a, b) => b.path.localeCompare(a.path))
}

function getPostSummary(path: string, markdownValue = '') {
	const fallbackTitle = path.split('/').at(-1)?.replace(mdExtensionRegex, '') || path
	const { meta } = parseMarkdownContent(markdownValue)
	const categories = Array.isArray(meta.categories) ? meta.categories : []
	const postTags = Array.isArray(meta.tags) ? meta.tags.filter((tag): tag is string => typeof tag === 'string') : []
	return {
		category: typeof categories[0] === 'string' ? categories[0] : undefined,
		date: typeof meta.date === 'string' ? meta.date : undefined,
		draft: meta.draft === true,
		recommend: parseRecommend(meta.recommend) > 1 ? parseRecommend(meta.recommend) : undefined,
		tags: postTags,
		title: typeof meta.title === 'string' ? meta.title : fallbackTitle,
	}
}

async function loadPostSummary(path: string) {
	const result = await githubRequest<GithubContent>(
		`${repoPath.value}/contents/${encodePath(path)}?ref=${encodeURIComponent(settings.branch.trim())}`,
	)
	const markdownValue = decodeBase64(result.content)
	return {
		...getPostSummary(path, markdownValue),
		name: path.split('/').at(-1) || path,
		path,
		sha: result.sha,
	}
}

function resetForm() {
	clearMessages()
	clearCoverPreviewUrl()
	clearBodyImagePreviewUrls()
	isHydratingForm.value = true
	selectedPostPath.value = ''
	selectedPostSha.value = ''
	selectedPostOriginalPath.value = ''
	Object.assign(form, {
		title: '',
		slug: defaultSlug(),
		description: '',
		image: '',
		date: localDateTime(),
		updated: localDateTime(),
		category: categoryOptions.value.includes('技术') ? '技术' : categoryOptions.value[0],
		customCategory: '',
		customCategoryColor: '#64748b',
		customCategoryIcon: blogConfig.article.defaultCategoryIcon,
		tags: '',
		type: defaultArticleType,
		recommend: 1,
		draft: false,
		body: '## 从这里开始\n\n',
	})
	nextTick(() => {
		isHydratingForm.value = false
	})
}

function yamlString(value: string) {
	return JSON.stringify(value)
}

function sanitizeFileName(value: string) {
	return value
		.trim()
		.replace(fileUnsafeRegex, '-')
		.replace(fileWhitespaceRegex, '-')
		.replace(multiDashRegex, '-')
		.replace(trimDashRegex, '')
		|| defaultSlug()
}

function encodePath(path: string) {
	return encodeURIComponent(path).replace(encodedSlashRegex, '/')
}

function bytesToBase64(bytes: Uint8Array) {
	let binary = ''
	for (const byte of bytes)
		binary += String.fromCharCode(byte)
	return btoa(binary)
}

function decodeBase64(value: string) {
	const binary = atob(value.replace(newlineRegex, ''))
	const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
	return new TextDecoder().decode(bytes)
}

function parseValue(value: string) {
	const trimmed = value.trim()
	if (trimmed === 'true')
		return true
	if (trimmed === 'false')
		return false
	if (bracketListRegex.test(trimmed)) {
		const inner = trimmed.replace(bracketListRegex, '$1').trim()
		if (!inner)
			return []
		try {
			const parsed = JSON.parse(trimmed)
			if (Array.isArray(parsed))
				return parsed
		}
		catch {
			// Fall back to a permissive parser for unquoted YAML lists.
		}
		return (inner.match(listTokenRegex) || [])
			.map(item => item.trim().replace(surroundingQuoteRegex, ''))
			.filter(Boolean)
	}
	return trimmed.replace(surroundingQuoteRegex, '')
}

function parseRecommend(value: unknown) {
	const parsed = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(parsed) && parsed > 1 ? Math.round(parsed) : 1
}

function parseMarkdownContent(value: string) {
	const matched = value.match(frontmatterRegex)
	if (!matched)
		return { body: value, meta: {} as Record<string, unknown> }

	const meta: Record<string, unknown> = {}
	for (const line of matched[1].split(lineBreakRegex)) {
		const separatorIndex = line.indexOf(':')
		if (separatorIndex <= 0)
			continue
		const key = line.slice(0, separatorIndex).trim()
		const value = line.slice(separatorIndex + 1)
		if (!key)
			continue
		meta[key] = parseValue(value)
	}

	return { body: matched[2] || '', meta }
}

function applyPostPath(path: string) {
	const matched = path.match(contentPathRegex)
	if (!matched)
		return

	form.date ||= `${matched[1]}-01-01 00:00`
	form.slug = matched[2]
}

function fillFormFromMarkdown(value: string, path: string) {
	isHydratingForm.value = true
	clearCoverPreviewUrl()
	clearBodyImagePreviewUrls()
	const { body, meta } = parseMarkdownContent(value)
	const categories = Array.isArray(meta.categories) ? meta.categories : []
	const firstCategory = typeof categories[0] === 'string' ? categories[0] : ''
	const tagsValue = Array.isArray(meta.tags) ? meta.tags.filter((tag): tag is string => typeof tag === 'string') : []

	Object.assign(form, {
		title: typeof meta.title === 'string' ? meta.title : '',
		description: typeof meta.description === 'string' ? meta.description : '',
		image: typeof meta.image === 'string' ? meta.image : '',
		date: typeof meta.date === 'string' ? meta.date : localDateTime(),
		updated: typeof meta.updated === 'string' ? meta.updated : typeof meta.date === 'string' ? meta.date : localDateTime(),
		category: firstCategory && categoryOptions.value.includes(firstCategory) ? firstCategory : firstCategory ? '__custom' : categoryOptions.value[0],
		customCategory: firstCategory && !categoryOptions.value.includes(firstCategory) ? firstCategory : '',
		tags: tagsValue.join(', '),
		type: typeof meta.type === 'string' ? meta.type : defaultArticleType,
		recommend: parseRecommend(meta.recommend),
		draft: meta.draft === true,
		body: body.trimStart() || '## 从这里开始\n\n',
	})
	if (firstCategory && !categoryOptions.value.includes(firstCategory)) {
		upsertCategory({
			icon: blogConfig.article.defaultCategoryIcon,
			name: firstCategory,
		})
	}
	applyPostPath(path)
	nextTick(() => {
		isHydratingForm.value = false
	})
}

async function githubRequest<T>(path: string, init: RequestInit = {}) {
	const controller = new AbortController()
	const timeout = window.setTimeout(() => controller.abort(), githubRequestTimeout)

	try {
		const response = await fetch(`https://api.github.com${path}`, {
			...init,
			signal: controller.signal,
			headers: {
				'Accept': 'application/vnd.github+json',
				'Authorization': `Bearer ${settings.token.trim()}`,
				'Content-Type': 'application/json',
				'X-GitHub-Api-Version': '2022-11-28',
				...init.headers,
			},
		})

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`GitHub API ${response.status}: ${text}`)
		}

		return response.json() as Promise<T>
	}
	catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError')
			throw new Error('GitHub 请求超时，请检查网络、Token 权限或仓库配置。')
		throw error
	}
	finally {
		window.clearTimeout(timeout)
	}
}

function stageChange(change: StagedChange) {
	const normalizedPath = change.path.replace(leadingSlashRegex, '')
	const nextChange = { ...change, path: normalizedPath }
	const index = stagedChanges.value.findIndex(item => item.path === normalizedPath)
	if (index >= 0)
		stagedChanges.value[index] = nextChange
	else
		stagedChanges.value.push(nextChange)
}

function getStagedContent(path: string) {
	const staged = stagedChanges.value.find(item => item.path === path && !item.delete && item.encoding !== 'base64')
	return staged?.content
}

function clearStagedChanges() {
	stagedChanges.value = []
}

async function commitStagedChanges() {
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再提交暂存修改。'
		return
	}
	if (!stagedChanges.value.length) {
		statusMessage.value = '当前没有待提交的修改。'
		return
	}

	isCommittingChanges.value = true
	clearMessages()
	statusMessage.value = `正在合并提交 ${stagedChanges.value.length} 项修改...`
	try {
		const branch = settings.branch.trim()
		const ref = await githubRequest<{ object?: { sha?: string } }>(`${repoPath.value}/git/ref/heads/${encodeURIComponent(branch)}`)
		const commitSha = ref.object?.sha
		if (!commitSha)
			throw new Error('无法读取当前分支 commit。')
		const commit = await githubRequest<{ tree?: { sha?: string } }>(`${repoPath.value}/git/commits/${commitSha}`)
		const treeEntries: Array<{ path: string, mode: '100644', type: 'blob', sha: string | null }> = []
		for (const change of stagedChanges.value) {
			if (change.delete) {
				treeEntries.push({ mode: '100644', path: change.path, sha: null, type: 'blob' })
				continue
			}
			if (!change.content)
				continue
			const blob = await githubRequest<{ sha?: string }>(`${repoPath.value}/git/blobs`, {
				method: 'POST',
				body: JSON.stringify({ content: change.content, encoding: change.encoding || 'utf-8' }),
			})
			if (!blob.sha)
				throw new Error(`无法创建暂存文件：${change.path}`)
			treeEntries.push({ mode: '100644', path: change.path, sha: blob.sha, type: 'blob' })
		}
		const tree = await githubRequest<{ sha?: string }>(`${repoPath.value}/git/trees`, {
			method: 'POST',
			body: JSON.stringify({ base_tree: commit.tree?.sha, tree: treeEntries }),
		})
		if (!tree.sha)
			throw new Error('无法创建暂存文件树。')
		const nextCommit = await githubRequest<{ sha?: string, html_url?: string }>(`${repoPath.value}/git/commits`, {
			method: 'POST',
			body: JSON.stringify({
				message: `update blog: ${treeEntries.length} staged change${treeEntries.length === 1 ? '' : 's'}`,
				tree: tree.sha,
				parents: [commitSha],
			}),
		})
		if (!nextCommit.sha)
			throw new Error('无法创建 GitHub commit。')
		await githubRequest(`${repoPath.value}/git/refs/heads/${encodeURIComponent(branch)}`, {
			method: 'PATCH',
			body: JSON.stringify({ sha: nextCommit.sha, force: false }),
		})
		publishResult.value = { commitUrl: nextCommit.html_url }
		clearStagedChanges()
		statusMessage.value = '暂存修改已一次性提交，GitHub Actions 将只触发一次。'
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
		statusMessage.value = ''
	}
	finally {
		isCommittingChanges.value = false
	}
}

async function loadPosts(options: { silent?: boolean } = {}) {
	if (!canUseGithub.value)
		return

	isLoadingPosts.value = true
	if (!options.silent) {
		clearMessages()
		statusMessage.value = '正在读取文章...'
	}

	try {
		const result = await githubRequest<{ tree: GithubTreeItem[] }>(
			`${repoPath.value}/git/trees/${encodeURIComponent(settings.branch.trim())}?recursive=1`,
		)
		const paths = result.tree
			.filter(item => item.type === 'blob' && item.path?.startsWith('content/posts/') && item.path.endsWith('.md'))
			.map(item => ({
				name: item.path!.split('/').at(-1) || item.path!,
				path: item.path!,
				title: item.path!.split('/').at(-1)?.replace(mdExtensionRegex, '') || item.path!,
			}))
			.sort((a, b) => b.path.localeCompare(a.path))
		posts.value = await Promise.all(paths.map(post => loadPostSummary(post.path).catch(() => post)))
		posts.value.sort((a, b) => (b.date || b.path).localeCompare(a.date || a.path))
		cachePosts()
		if (!options.silent)
			statusMessage.value = `已读取 ${posts.value.length} 篇文章。`
	}
	catch (error) {
		if (!options.silent) {
			errorMessage.value = error instanceof Error ? error.message : String(error)
			statusMessage.value = ''
		}
	}
	finally {
		isLoadingPosts.value = false
	}
}

async function loadPost(path: string) {
	if (!canUseGithub.value)
		return

	isLoadingPost.value = true
	clearMessages()
	statusMessage.value = '正在载入文章...'

	try {
		const result = await githubRequest<GithubContent>(
			`${repoPath.value}/contents/${encodePath(path)}?ref=${encodeURIComponent(settings.branch.trim())}`,
		)
		const decoded = decodeBase64(result.content)
		fillFormFromMarkdown(decoded, result.path)
		selectedPostPath.value = result.path
		selectedPostOriginalPath.value = result.path
		selectedPostSha.value = result.sha
		statusMessage.value = '文章已载入。'
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
		statusMessage.value = ''
	}
	finally {
		isLoadingPost.value = false
	}
}

function selectPost(path: string) {
	if (isLoadingPost.value)
		return
	void loadPost(path)
	closeDialog()
}

function getImageExtension(file: File) {
	const fromType = imageExtensionMap[file.type]
	if (fromType)
		return fromType
	const fromName = file.name.split('.').at(-1)?.toLowerCase()
	return fromName || 'jpg'
}

function getImageUploadPath(file: File) {
	const year = (form.date || localDateTime()).slice(0, 4)
	const extension = getImageExtension(file)
	const fileBaseName = file.name.replace(fileExtensionRegex, '')
	const articleName = sanitizeFileName(form.slug || form.title || defaultSlug())
	const imageName = sanitizeFileName(fileBaseName || 'cover')
	return `public/images/${year}/${articleName}-${imageName}-${Date.now()}.${extension}`
}

function validateImageFile(file: File) {
	if (!file.type.startsWith('image/'))
		return '请选择图片文件。'
	if (file.size > maxImageSize)
		return '图片不能超过 8MB。'
	return ''
}

async function uploadImageFile(file: File) {
	const uploadPath = getImageUploadPath(file)
	const bytes = new Uint8Array(await file.arrayBuffer())
	stageChange({
		content: bytesToBase64(bytes),
		encoding: 'base64',
		path: uploadPath,
	})
	return `/${uploadPath.replace(publicPrefixRegex, '')}`
}

function triggerImageUpload() {
	clearMessages()
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再上传图片。'
		return
	}
	imageUploadInput.value?.click()
}

function clearCoverPreviewUrl() {
	if (coverPreviewUrl.value)
		URL.revokeObjectURL(coverPreviewUrl.value)
	coverPreviewUrl.value = ''
}

function clearBodyImagePreviewUrls() {
	for (const previewUrl of Object.values(bodyImagePreviewUrls.value))
		URL.revokeObjectURL(previewUrl)
	bodyImagePreviewUrls.value = {}
}

function clearCoverImage() {
	clearCoverPreviewUrl()
	form.image = ''
}

async function uploadCoverImage(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''

	if (!file)
		return
	const invalidMessage = validateImageFile(file)
	if (invalidMessage) {
		errorMessage.value = invalidMessage
		return
	}

	isUploadingImage.value = true
	clearMessages()
	statusMessage.value = '正在上传封面图...'

	try {
		const imagePath = await uploadImageFile(file)
		clearCoverPreviewUrl()
		coverPreviewUrl.value = URL.createObjectURL(file)
		form.image = imagePath
		statusMessage.value = `封面图已上传：${imagePath}`
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
		statusMessage.value = ''
	}
	finally {
		isUploadingImage.value = false
	}
}

function serializeCategoryConfigBlock() {
	const managed = Object.fromEntries(
		categoryDefinitions.value
			.filter(item => item.name !== defaultCategoryName)
			.map(item => [item.name, {
				icon: item.icon || blogConfig.article.defaultCategoryIcon,
				...(item.color ? { color: item.color } : {}),
			}]),
	)
	return [
		'// BLOG_ADMIN_CATEGORIES_START',
		`const managedCategories = ${JSON.stringify(managed, null, '\t')} satisfies Record<string, { icon: string, color?: string }>`,
		'// BLOG_ADMIN_CATEGORIES_END',
	].join('\n')
}

function migrateCategoryConfigSource(source: string) {
	if (categoryConfigBlockRegex.test(source))
		return source.replace(categoryConfigBlockRegex, serializeCategoryConfigBlock())

	// Older blog.config.ts files do not have the admin markers. Add the managed
	// object before blogConfig and wire it into article.categories in one commit.
	const categoriesMatch = source.match(categoriesPropertyRegex)
	if (!categoriesMatch || categoriesMatch.index === undefined)
		throw new Error('blog.config.ts 中找不到 article.categories 配置，无法自动迁移。')

	const declarationIndex = source.search(blogConfigDeclarationRegex)
	if (declarationIndex < 0)
		throw new Error('blog.config.ts 中找不到 blogConfig 配置，无法自动迁移。')

	const withManagedSpread = source.replace(categoriesPropertyRegex, (match, prefix: string) => `${prefix}\n\t\t\t...managedCategories,`)
	const insertion = `${serializeCategoryConfigBlock()}\n\n`
	return `${withManagedSpread.slice(0, declarationIndex)}${insertion}${withManagedSpread.slice(declarationIndex)}`
}

async function saveCategoryConfig() {
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再保存分类。'
		return false
	}
	isSavingCategories.value = true
	clearMessages()
	try {
		const path = 'blog.config.ts'
		const current = await githubRequest<GithubContent>(
			`${repoPath.value}/contents/${path}?ref=${encodeURIComponent(settings.branch.trim())}`,
		)
		const source = getStagedContent(path) || decodeBase64(current.content)
		const nextSource = migrateCategoryConfigSource(source)
		stageChange({ content: nextSource, path })
		cacheCustomCategories()
		statusMessage.value = '分类配置已暂存，点击“提交全部”后统一发布。'
		return true
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
		return false
	}
	finally {
		isSavingCategories.value = false
	}
}

function removeCategory(category: string) {
	if (category === defaultCategoryName)
		return
	const usedCount = posts.value.filter(post => post.category === category).length
	if (usedCount) {
		errorMessage.value = `分类“${category}”仍被 ${usedCount} 篇文章使用，不能删除。`
		return
	}
	requestConfirmation({
		action: async () => {
			const previousDefinitions = categoryDefinitions.value.map(item => ({ ...item }))
			categoryDefinitions.value = categoryDefinitions.value.filter(item => item.name !== category)
			cacheCustomCategories()
			if (!await saveCategoryConfig()) {
				categoryDefinitions.value = previousDefinitions
				cacheCustomCategories()
			}
		},
		confirmLabel: '删除分类',
		message: `确定删除分类“${category}”吗？`,
		title: '删除分类',
	})
}

function setFormTags(values: string[]) {
	form.tags = [...new Set(values.map(tag => tag.trim()).filter(Boolean))].join(', ')
}

function addFormTag(value = tagInput.value) {
	const additions = value.split(tagSplitRegex).map(tag => tag.trim()).filter(Boolean)
	if (!additions.length)
		return
	setFormTags([...tags.value, ...additions])
	tagInput.value = ''
}

function removeFormTag(tag: string) {
	setFormTags(tags.value.filter(item => item !== tag))
}

function replaceMarkdownTags(markdownValue: string, nextTags: string[]) {
	const matched = markdownValue.match(frontmatterRegex)
	if (!matched)
		throw new Error('文章缺少可识别的 frontmatter，无法更新标签。')
	const updated = `updated: ${yamlString(localDateTime())}`
	let hasUpdated = false
	const lines = matched[1].split('\n').flatMap((line) => {
		if (frontmatterTagsLineRegex.test(line))
			return []
		if (frontmatterUpdatedLineRegex.test(line)) {
			hasUpdated = true
			return [updated]
		}
		return [line]
	})
	if (!hasUpdated)
		lines.push(updated)
	if (nextTags.length)
		lines.push(`tags: [${nextTags.map(tag => yamlString(tag)).join(', ')}]`)
	return `---\n${lines.join('\n')}\n---\n${matched[2] || ''}`
}

function updateManagedTag(target = '') {
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再管理标签。'
		return
	}
	const source = managedTag.value.trim()
	const normalizedTarget = target.trim()
	if (!source) {
		errorMessage.value = '请先选择要处理的标签。'
		return
	}
	if (normalizedTarget === source) {
		errorMessage.value = '新标签与原标签相同。'
		return
	}
	const affected = posts.value.filter(post => post.tags?.includes(source))
	if (!affected.length) {
		errorMessage.value = `没有文章使用标签“${source}”。`
		return
	}
	const actionText = normalizedTarget ? `合并到“${normalizedTarget}”` : '删除'
	requestConfirmation({
		action: () => performManagedTagUpdate(source, normalizedTarget, affected),
		confirmLabel: normalizedTarget ? '确认合并' : '确认删除',
		detail: `影响 ${affected.length} 篇文章，修改会暂存到“提交全部”。`,
		message: `将标签“${source}”${actionText}。`,
		title: normalizedTarget ? '合并标签' : '删除标签',
	})
}

async function performManagedTagUpdate(source: string, normalizedTarget: string, affected: GithubPost[]) {
	isUpdatingTags.value = true
	clearMessages()
	try {
		for (const [index, post] of affected.entries()) {
			statusMessage.value = `正在更新标签 ${index + 1} / ${affected.length}：${post.title}`
			const current = await githubRequest<GithubContent>(
				`${repoPath.value}/contents/${encodePath(post.path)}?ref=${encodeURIComponent(settings.branch.trim())}`,
			)
			const sourceMarkdown = getStagedContent(post.path) || decodeBase64(current.content)
			const currentTags = getPostSummary(post.path, sourceMarkdown).tags || []
			const nextTags = [...new Set(currentTags.flatMap(tag => tag === source ? (normalizedTarget ? [normalizedTarget] : []) : [tag]))]
			const nextMarkdown = replaceMarkdownTags(sourceMarkdown, nextTags)
			stageChange({ content: nextMarkdown, path: post.path })
			post.tags = nextTags
			post.sha = current.sha
		}
		if (selectedPostPath.value && affected.some(post => post.path === selectedPostPath.value)) {
			const selectedPost = affected.find(post => post.path === selectedPostPath.value)
			selectedPostSha.value = selectedPost?.sha || selectedPostSha.value
			setFormTags(tags.value.flatMap(tag => tag === source ? (normalizedTarget ? [normalizedTarget] : []) : [tag]))
			form.updated = localDateTime()
		}
		cachePosts()
		managedTag.value = normalizedTarget
		mergedTag.value = ''
		statusMessage.value = normalizedTarget
			? `标签“${source}”已暂存合并到“${normalizedTarget}”。`
			: `标签“${source}”的删除已暂存，共 ${affected.length} 篇文章。`
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
		statusMessage.value = '部分修改可能已经暂存，请检查待提交数量后重试。'
	}
	finally {
		isUpdatingTags.value = false
	}
}

async function deleteSelectedPost() {
	if (!isEditingExisting.value || !selectedPostOriginalPath.value || !selectedPostSha.value)
		return
	clearMessages()
	const deletedPath = selectedPostOriginalPath.value
	const deletedTitle = form.title || deletedPath
	try {
		stageChange({ delete: true, path: deletedPath })
		posts.value = posts.value.filter(post => post.path !== deletedPath)
		cachePosts()
		closeDialog()
		resetForm()
		statusMessage.value = `文章“${deletedTitle}”的删除已暂存，点击“提交全部”后统一发布。`
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
	}
}

function stageArticle() {
	const invalidMessage = validatePublish()
	if (invalidMessage) {
		errorMessage.value = invalidMessage
		return
	}
	form.updated = localDateTime()
	const targetPath = postPath.value
	if (isEditingExisting.value && pathChanged.value) {
		errorMessage.value = '当前修改会改变文件路径。请先保持文件名和日期不变，或新建文章暂存。'
		return
	}
	stageChange({ content: markdown.value, path: targetPath })
	selectedPostPath.value = targetPath
	selectedPostOriginalPath.value = targetPath
	upsertPostListItem(targetPath, selectedPostSha.value)
	cachePosts()
	statusMessage.value = '文章修改已暂存，点击“提交全部”后统一发布。'
}

function triggerBodyImageUpload() {
	clearMessages()
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再插入图片。'
		return
	}
	bodyImageUploadInput.value?.click()
}

async function uploadArticleImage(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''

	if (!file)
		return
	const invalidMessage = validateImageFile(file)
	if (invalidMessage) {
		errorMessage.value = invalidMessage
		return
	}

	isUploadingBodyImage.value = true
	clearMessages()
	statusMessage.value = '正在上传正文插图...'

	try {
		const imagePath = await uploadImageFile(file)
		const alt = file.name.replace(fileExtensionRegex, '').trim() || '图片'
		const sizeAttrs = bodyImageWidth.value ? `{width="${bodyImageWidth.value}"}` : ''
		const markdownImage = `![${alt}](${imagePath})${sizeAttrs}`
		const textarea = bodyTextarea.value
		const start = textarea?.selectionStart ?? form.body.length
		const end = textarea?.selectionEnd ?? start
		form.body = `${form.body.slice(0, start)}${markdownImage}${form.body.slice(end)}`
		bodyImagePreviewUrls.value[imagePath] = URL.createObjectURL(file)
		statusMessage.value = '图片已上传并插入正文。'

		await nextTick()
		if (textarea) {
			const cursor = start + markdownImage.length
			textarea.focus()
			textarea.setSelectionRange(cursor, cursor)
		}
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
		statusMessage.value = ''
	}
	finally {
		isUploadingBodyImage.value = false
	}
}

onBeforeUnmount(() => {
	clearCoverPreviewUrl()
	clearBodyImagePreviewUrls()
})
</script>

<template>
<div v-if="!isAccessReady" class="admin-access-screen">
	<div class="admin-access-card" aria-live="polite">
		<Icon name="line-md:loading-twotone-loop" />
		<span>正在验证后台访问权限…</span>
	</div>
</div>
<div v-else-if="!isAdminUnlocked" class="admin-access-screen">
	<form class="admin-access-card" @submit.prevent="unlockAdmin">
		<Icon name="ph:lock-key-bold" />
		<h1>博客后台</h1>
		<p>请输入访问密钥后继续。</p>
		<label>
			<span>访问密钥</span>
			<input
				v-model="accessKeyInput"
				autofocus
				autocomplete="current-password"
				placeholder="请输入访问密钥"
				type="password"
			>
		</label>
		<p v-if="accessKeyError" class="admin-access-error" role="alert">
			{{ accessKeyError }}
		</p>
		<button class="publish-button" type="submit">
			<Icon name="ph:arrow-right-bold" />
			<span>进入后台</span>
		</button>
	</form>
</div>
<div v-else class="admin-page">
	<header class="topbar">
		<div class="brand">
			<UtilLink class="icon-button" to="/" title="返回博客">
				<Icon name="ph:caret-left-bold" />
			</UtilLink>
			<div>
				<h1>博客后台</h1>
			</div>
		</div>
		<div class="topbar-actions">
			<button class="secondary-button" type="button" @click="openDialog('github')">
				<Icon name="ph:github-logo-bold" />
				<span>GitHub</span>
			</button>
			<button class="secondary-button" type="button" @click="openDialog('posts')">
				<Icon name="ph:files-bold" />
				<span>文章</span>
			</button>
			<button class="secondary-button" type="button" @click="openDialog('categories')">
				<Icon name="ph:folders-bold" />
				<span>分类</span>
			</button>
			<button class="secondary-button" type="button" @click="openDialog('tags')">
				<Icon name="ph:tag-bold" />
				<span>标签</span>
			</button>
			<button class="secondary-button" type="button" @click="openDialog('meta')">
				<Icon name="ph:sliders-horizontal-bold" />
				<span>设置</span>
			</button>
			<button class="secondary-button" type="button" @click="resetForm">
				<Icon name="ph:file-plus-bold" />
				<span>新建</span>
			</button>
			<button v-if="isEditingExisting" class="secondary-button danger-button" type="button" @click="openDialog('delete')">
				<Icon name="ph:trash-bold" />
				<span>删除</span>
			</button>
			<button class="publish-button" :disabled="isCommittingChanges || !stagedChangeCount" type="button" @click="commitStagedChanges">
				<Icon :name="isCommittingChanges ? 'line-md:loading-twotone-loop' : 'ph:paper-plane-tilt-bold'" />
				<span>{{ isCommittingChanges ? '提交中' : stagedChangeLabel }}</span>
			</button>
			<button class="secondary-button" type="button" @click="stageArticle">
				<Icon name="ph:tray-arrow-down-bold" />
				<span>暂存文章</span>
			</button>
		</div>
	</header>

	<div class="workspace">
		<main class="editor-pane">
			<div class="title-row">
				<label class="title-field">
					<span>标题</span>
					<input v-model.trim="form.title" placeholder="未命名文章">
				</label>
				<div class="path-chip" :class="{ warning: pathChanged }">
					<Icon name="ph:git-branch-bold" />
					<span>{{ postPath }}</span>
				</div>
			</div>

			<label class="body-field">
				<div class="field-heading">
					<span>正文</span>
					<div class="editor-actions">
						<select v-model="bodyImageWidth" aria-label="插入图片尺寸">
							<option v-for="option in bodyImageSizeOptions" :key="option.value" :value="option.value">
								{{ option.label }}
							</option>
						</select>
						<input
							ref="bodyImageUploadInput"
							accept="image/*"
							class="visually-hidden"
							type="file"
							@change="uploadArticleImage"
						>
						<button :disabled="!canUseGithub || isUploadingBodyImage" type="button" @click.prevent="triggerBodyImageUpload">
							<Icon :name="isUploadingBodyImage ? 'line-md:loading-twotone-loop' : 'ph:image-square-bold'" />
							<span>{{ isUploadingBodyImage ? '上传中' : '插入图片' }}</span>
						</button>
					</div>
				</div>
				<textarea ref="bodyTextarea" v-model="form.body" spellcheck="false" />
			</label>
		</main>

		<aside class="preview-pane">
			<section class="pane-section article-preview-section">
				<div class="section-heading">
					<Icon name="ph:article-bold" />
					<h2>实时预览</h2>
				</div>
				<div class="article-preview">
					<PostHeader
						:categories="selectedCategory ? [selectedCategory] : []"
						:date="form.date"
						:description="form.description"
						:image="coverPreviewSrc"
						:path="previewPath"
						:title="form.title || '未命名文章'"
						:updated="form.updated"
					/>
					<PostExcerpt v-if="form.description" :excerpt="form.description" />
					<MDC
						class="article"
						:class="previewTypeClass"
						:value="previewBody"
						tag="article"
					/>
				</div>
			</section>

			<div v-if="errorMessage || statusMessage || publishResult" class="status-box" :class="{ error: errorMessage, success: publishResult }">
				<Icon :name="errorMessage ? 'ph:warning-circle-bold' : publishResult ? 'ph:check-circle-bold' : 'ph:info-bold'" />
				<div>
					<p>{{ errorMessage || statusMessage }}</p>
					<div v-if="publishResult" class="result-links">
						<a v-if="publishResult.commitUrl" :href="publishResult.commitUrl" rel="noreferrer" target="_blank">查看 commit</a>
						<a v-if="publishResult.htmlUrl" :href="publishResult.htmlUrl" rel="noreferrer" target="_blank">查看仓库文件</a>
					</div>
				</div>
			</div>
		</aside>
	</div>

	<Teleport to="body">
		<div v-if="activeDialog" class="dialog-backdrop" @click.self="closeDialog">
			<section class="dialog-panel" :class="`dialog-${activeDialog}`">
				<header class="dialog-header">
					<div class="section-heading">
						<Icon :name="dialogMeta.icon" />
						<h2>{{ dialogMeta.title }}</h2>
					</div>
					<button class="icon-button" type="button" @click="closeDialog">
						<Icon name="ph:x-bold" />
					</button>
				</header>

				<div v-if="activeDialog === 'github'" class="dialog-content github-form">
					<label>
						<span>Owner</span>
						<input v-model.trim="settings.owner" autocomplete="username">
					</label>
					<label>
						<span>Repo</span>
						<input v-model.trim="settings.repo">
					</label>
					<label>
						<span>Branch</span>
						<input v-model.trim="settings.branch">
					</label>
					<label>
						<span>Token</span>
						<input v-model.trim="settings.token" autocomplete="off" placeholder="github_pat_..." type="password">
					</label>
					<button class="secondary-button full" :disabled="!canUseGithub || isLoadingPosts" type="button" @click="loadPosts">
						<Icon :name="isLoadingPosts ? 'line-md:loading-twotone-loop' : 'ph:arrow-clockwise-bold'" />
						<span>读取文章</span>
					</button>
				</div>

				<div v-else-if="activeDialog === 'posts'" class="dialog-content posts-dialog-content">
					<div class="segmented-control" aria-label="文章状态筛选">
						<button :class="{ active: postView === 'all' }" type="button" @click="postView = 'all'">
							全部 {{ postCounts.all }}
						</button>
						<button :class="{ active: postView === 'published' }" type="button" @click="postView = 'published'">
							已发布 {{ postCounts.published }}
						</button>
						<button :class="{ active: postView === 'drafts' }" type="button" @click="postView = 'drafts'">
							草稿箱 {{ postCounts.drafts }}
						</button>
					</div>
					<div class="dialog-toolbar">
						<label class="search-field">
							<Icon name="ph:magnifying-glass-bold" />
							<input v-model.trim="postSearch" placeholder="搜索标题、分类、标签、日期或路径">
						</label>
						<span class="post-count">{{ postListRange }}</span>
						<button class="secondary-button" :disabled="!canUseGithub || isLoadingPosts" type="button" @click="loadPosts">
							<Icon :name="isLoadingPosts ? 'line-md:loading-twotone-loop' : 'ph:arrow-clockwise-bold'" />
							<span>刷新</span>
						</button>
					</div>
					<div class="post-list dialog-post-list">
						<div
							v-for="post in pagedPosts"
							:key="post.path"
							class="post-item"
							:class="{ active: post.path === selectedPostPath }"
							:aria-disabled="isLoadingPost"
							role="button"
							tabindex="0"
							@click="selectPost(post.path)"
							@keydown.enter.prevent="selectPost(post.path)"
						>
							<span>{{ post.title }}</span>
							<small>
								<b v-if="post.category">{{ post.category }}</b>
								<b v-if="post.recommend && post.recommend > 1" class="recommend-badge">权重 {{ post.recommend }}</b>
								<b v-if="post.draft" class="draft-badge">草稿</b>
								<time v-if="post.date">{{ post.date }}</time>
							</small>
							<em>{{ post.path }}</em>
							<ul v-if="post.tags?.length" class="post-tags">
								<li v-for="tag in post.tags" :key="tag">
									{{ tag }}
								</li>
							</ul>
						</div>
						<p v-if="!searchedPosts.length" class="empty-text">
							{{ posts.length ? '没有匹配的文章' : '暂无文章' }}
						</p>
					</div>
					<div v-if="searchedPosts.length > postsPerPage" class="post-pagination">
						<button class="secondary-button" :disabled="postPage <= 1" type="button" @click="postPage--">
							<Icon name="ph:caret-left-bold" />
							<span>上一页</span>
						</button>
						<span>第 {{ postPage }} / {{ totalPostPages }} 页</span>
						<button class="secondary-button" :disabled="postPage >= totalPostPages" type="button" @click="postPage++">
							<span>下一页</span>
							<Icon name="ph:caret-right-bold" />
						</button>
					</div>
				</div>

				<div v-else-if="activeDialog === 'categories'" class="dialog-content manager-content">
					<div class="manager-list category-manager-list">
						<div v-for="definition in categoryDefinitions" :key="definition.name" class="manager-row category-row">
							<span class="category-identity">
								<Icon :name="definition.icon" :style="{ color: definition.color }" />
								<strong>{{ definition.name }}</strong>
							</span>
							<label>
								<span>图标</span>
								<input v-model.trim="definition.icon" placeholder="ph:folder-bold">
							</label>
							<label>
								<span>颜色</span>
								<span class="color-field">
									<input v-model="definition.color" aria-label="分类颜色" type="color">
									<input v-model.trim="definition.color" placeholder="#64748b">
								</span>
							</label>
							<button
								class="icon-button danger-button"
								:disabled="definition.name === defaultCategoryName || isSavingCategories"
								title="删除分类"
								type="button"
								@click="removeCategory(definition.name)"
							>
								<Icon name="ph:trash-bold" />
							</button>
						</div>
					</div>
					<div class="category-create-row">
						<label>
							<span>新增分类</span>
							<input v-model.trim="categoryDraft.name" placeholder="例如：旅行">
						</label>
						<label>
							<span>图标</span>
							<input v-model.trim="categoryDraft.icon" placeholder="ph:folder-bold">
						</label>
						<label>
							<span>颜色</span>
							<span class="color-field">
								<input v-model="categoryDraft.color" aria-label="新增分类颜色" type="color">
								<input v-model.trim="categoryDraft.color" placeholder="#64748b">
							</span>
						</label>
						<button class="secondary-button" :disabled="!categoryDraft.name.trim() || isSavingCategories" type="button" @click="confirmManagedCategory">
							<Icon name="ph:plus-bold" />
							<span>新增分类</span>
						</button>
					</div>
					<div class="manager-footer">
						<button class="secondary-button" :disabled="!canUseGithub || isSavingCategories" type="button" @click="saveCategoryConfig">
							<Icon :name="isSavingCategories ? 'line-md:loading-twotone-loop' : 'ph:floppy-disk-bold'" />
							<span>{{ isSavingCategories ? '暂存中' : '暂存分类配置' }}</span>
						</button>
					</div>
				</div>

				<div v-else-if="activeDialog === 'tags'" class="dialog-content manager-content">
					<div class="tag-cloud">
						<button
							v-for="item in tagStats"
							:key="item.name"
							:class="{ active: managedTag === item.name }"
							type="button"
							@click="managedTag = item.name"
						>
							<span>{{ item.name }}</span>
							<small>{{ item.count }}</small>
						</button>
						<p v-if="!tagStats.length" class="empty-text">
							读取文章后可管理标签
						</p>
					</div>
					<div class="tag-merge-panel">
						<label>
							<span>当前标签</span>
							<select v-model="managedTag">
								<option value="">选择标签</option>
								<option v-for="item in tagStats" :key="item.name" :value="item.name">{{ item.name }}（{{ item.count }}）</option>
							</select>
						</label>
						<label>
							<span>合并到</span>
							<input v-model.trim="mergedTag" list="admin-tag-options" placeholder="已有或新标签">
						</label>
						<div class="manager-actions">
							<button class="secondary-button" :disabled="!canUseGithub || !managedTag || !mergedTag || isUpdatingTags" type="button" @click="updateManagedTag(mergedTag)">
								<Icon name="ph:arrows-merge-bold" />
								<span>合并标签</span>
							</button>
							<button class="secondary-button danger-button" :disabled="!canUseGithub || !managedTag || isUpdatingTags" type="button" @click="updateManagedTag()">
								<Icon name="ph:trash-bold" />
								<span>全局删除</span>
							</button>
						</div>
					</div>
				</div>

				<div v-else-if="activeDialog === 'confirm' && pendingConfirmation" class="dialog-content delete-confirmation">
					<Icon name="ph:warning-circle-bold" />
					<p>{{ pendingConfirmation.message }}</p>
					<small v-if="pendingConfirmation.detail">{{ pendingConfirmation.detail }}</small>
					<div class="manager-actions">
						<button class="secondary-button" type="button" @click="closeDialog">
							取消
						</button>
						<button class="secondary-button danger-button" type="button" @click="runPendingConfirmation">
							<Icon name="ph:check-bold" />
							<span>{{ pendingConfirmation.confirmLabel }}</span>
						</button>
					</div>
				</div>

				<div v-else-if="activeDialog === 'delete'" class="dialog-content delete-confirmation">
					<Icon name="ph:warning-circle-bold" />
					<p>将暂存删除文章 <strong>{{ form.title }}</strong>，点击“提交全部”后统一发布。</p>
					<code>{{ selectedPostOriginalPath }}</code>
					<div class="manager-actions">
						<button class="secondary-button" type="button" @click="closeDialog">
							取消
						</button>
						<button class="secondary-button danger-button" type="button" @click="deleteSelectedPost">
							<Icon name="ph:trash-bold" />
							<span>确认暂存删除</span>
						</button>
					</div>
				</div>

				<div v-else class="dialog-content meta-grid">
					<label>
						<span>文件名</span>
						<input v-model.trim="form.slug">
					</label>
					<label>
						<span>分类</span>
						<select v-model="form.category">
							<option v-for="category in categoryOptions" :key="category" :value="category">
								{{ category }}
							</option>
							<option value="__custom">
								添加新分类...
							</option>
						</select>
					</label>
					<div v-if="form.category === '__custom'" class="add-category-row wide">
						<label>
							<span>新分类</span>
							<input v-model.trim="form.customCategory" placeholder="例如：旅行">
						</label>
						<label>
							<span>图标</span>
							<input v-model.trim="form.customCategoryIcon" placeholder="ph:folder-bold">
						</label>
						<label>
							<span>颜色</span>
							<span class="color-field">
								<input v-model="form.customCategoryColor" aria-label="新分类颜色" type="color">
								<input v-model.trim="form.customCategoryColor" placeholder="#64748b">
							</span>
						</label>
						<button class="secondary-button" :disabled="!form.customCategory.trim() || isSavingCategories" type="button" @click="confirmArticleCategory">
							<Icon name="ph:plus-bold" />
							<span>新增分类</span>
						</button>
					</div>
					<label>
						<span>创建时间</span>
						<input v-model.trim="form.date">
					</label>
					<label>
						<span>更新时间</span>
						<input v-model.trim="form.updated">
					</label>
					<div class="tag-editor wide">
						<span>标签</span>
						<div v-if="tags.length" class="selected-tags">
							<button v-for="tag in tags" :key="tag" :title="`移除 ${tag}`" type="button" @click="removeFormTag(tag)">
								<span>{{ tag }}</span>
								<Icon name="ph:x-bold" />
							</button>
						</div>
						<div class="tag-input-row">
							<input v-model.trim="tagInput" list="admin-tag-options" placeholder="输入标签后按回车" @keydown.enter.prevent="addFormTag()">
							<button class="icon-button" title="添加标签" type="button" @click="addFormTag()">
								<Icon name="ph:plus-bold" />
							</button>
						</div>
						<datalist id="admin-tag-options">
							<option v-for="tag in tagSuggestions" :key="tag" :value="tag" />
						</datalist>
					</div>
					<label>
						<span>推荐权重</span>
						<input v-model.number="form.recommend" min="1" placeholder="1" step="1" type="number">
						<small>默认值为 1，数值越大，被首页轮播抽中的概率越高。</small>
					</label>
					<label class="wide">
						<span>封面图</span>
						<input v-model.trim="form.image" placeholder="/images/example.png 或 https://example.com/cover.jpg" @input="clearCoverPreviewUrl">
					</label>
					<div class="cover-actions wide">
						<input
							ref="imageUploadInput"
							accept="image/*"
							class="visually-hidden"
							type="file"
							@change="uploadCoverImage"
						>
						<button class="secondary-button" :disabled="!canUseGithub || isUploadingImage" type="button" @click="triggerImageUpload">
							<Icon :name="isUploadingImage ? 'line-md:loading-twotone-loop' : 'ph:upload-simple-bold'" />
							<span>{{ isUploadingImage ? '上传中' : '上传图片' }}</span>
						</button>
						<small>会上传到 public/images，并自动填写封面图地址。</small>
					</div>
					<div v-if="coverPreviewSrc" class="cover-preview wide">
						<img :src="coverPreviewSrc" alt="封面图预览">
						<button class="secondary-button" type="button" @click="clearCoverImage">
							<Icon name="ph:trash-bold" />
							<span>移除封面</span>
						</button>
					</div>
					<label class="wide">
						<span>摘要</span>
						<textarea v-model="form.description" rows="4" />
					</label>
					<ZToggle v-model="form.draft" label="草稿" />
				</div>
			</section>
		</div>
	</Teleport>
</div>
</template>

<style lang="scss" scoped>
.admin-access-screen {
	display: grid;
	place-items: center;
	min-height: 100vh;
	padding: 1.25rem;
	background-color: var(--c-bg-1);
}

.admin-access-card {
	display: grid;
	gap: 0.9rem;
	width: min(24rem, 100%);
	padding: 2rem;
	border: 1px solid var(--c-border);
	border-radius: 0.6rem;
	box-shadow: var(--box-shadow-2);
	background-color: var(--ld-bg-card);
	text-align: center;

	> .iconify {
		justify-self: center;
		font-size: 2rem;
		color: var(--c-primary);
	}

	h1 {
		font-size: 1.25rem;
	}

	p {
		color: var(--c-text-2);
	}

	label {
		text-align: start;
	}

	input {
		height: 2.65rem;
	}
}

.admin-access-error {
	font-size: 0.82rem;
	color: var(--c-error) !important;
}

.admin-page {
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	overflow: hidden;
	height: 100vh;
	background-color: var(--c-bg-1);
}

.topbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	min-height: 4.5rem;
	padding: 0.75rem 1.25rem;
	border-block-end: 1px solid var(--c-border);
	background-color: var(--c-bg);
	z-index: 10;
}

.brand,
.topbar-actions {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	min-width: 0;
}

.brand {
	h1 {
		font-size: 1.2rem;
		line-height: 1.1;
	}
}

.icon-button,
.secondary-button,
.publish-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.35rem;
	height: 2.45rem;
	border-radius: 0.45rem;
	font-weight: 700;
	white-space: nowrap;
}

.icon-button {
	width: 2.4rem;
	border: 1px solid var(--c-border);
	background-color: var(--ld-bg-card);
}

.secondary-button {
	padding-inline: 0.8rem;
	border: 1px solid var(--c-border);
	background-color: var(--ld-bg-card);
	color: var(--c-text-1);

	&.full {
		width: 100%;
	}
}

.danger-button {
	border-color: var(--c-error);
	color: var(--c-error);
}

.publish-button {
	min-width: 7.5rem;
	padding-inline: 1rem;
	background-color: var(--c-primary);
	color: var(--c-bg);
}

button:disabled {
	opacity: 0.55;
	cursor: not-allowed;
}

.workspace {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	gap: 0;
	min-height: 0;
}

.preview-pane {
	display: grid;
	grid-template-rows: minmax(0, 1fr) auto;
	align-content: start;
	gap: 0.85rem;
	overflow: auto;
	min-width: 0;
	min-height: 0;
	padding: 1rem;
	border-inline-start: 1px solid var(--c-border);
	scrollbar-width: thin;
}

.pane-section,
.editor-pane {
	border: 1px solid var(--c-border);
	border-radius: 0.5rem;
	background-color: var(--ld-bg-card);
}

.pane-section {
	display: grid;
	gap: 0.75rem;
	padding: 0.85rem;
}

.section-heading {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	color: var(--c-text-1);

	h2 {
		font-size: 0.95rem;
	}
}

.dialog-backdrop {
	display: grid;
	place-items: start center;
	position: fixed;
	overflow: auto;
	inset: 0;
	padding: 8vh 1rem 1rem;
	background-color: #0004;
	backdrop-filter: blur(0.3rem);
	z-index: 1000;
}

.dialog-panel {
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	width: min(42rem, 100%);
	max-height: 84vh;
	border: 1px solid var(--c-border);
	border-radius: 0.5rem;
	box-shadow: var(--box-shadow-3);
	background-color: var(--ld-bg-card);
}

.dialog-posts {
	width: min(48rem, 100%);
}

.dialog-categories,
.dialog-tags {
	width: min(52rem, 100%);
}

.dialog-delete {
	width: min(30rem, 100%);
}

.dialog-meta {
	width: min(38rem, 100%);
}

.dialog-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.85rem 1rem;
	border-block-end: 1px solid var(--c-border);
}

.dialog-content {
	display: grid;
	gap: 0.75rem;
	overflow: auto;
	padding: 1rem;
	scrollbar-width: thin;
}

.posts-dialog-content {
	grid-template-rows: auto auto minmax(0, 1fr) auto;
	overflow: hidden;
}

.segmented-control {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	padding: 0.2rem;
	border: 1px solid var(--c-border);
	border-radius: 0.45rem;
	background-color: var(--c-bg-1);

	button {
		min-height: 2.15rem;
		padding-inline: 0.5rem;
		border-radius: 0.35rem;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--c-text-2);

		&.active {
			box-shadow: var(--box-shadow-1);
			background-color: var(--ld-bg-card);
			color: var(--c-primary);
		}
	}
}

.github-form {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dialog-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.6rem;
	min-width: 0;
}

.dialog-post-list {
	overflow: auto;
	min-height: 0;
	padding-inline-end: 0.2rem;
	scrollbar-width: thin;
}

.search-field {
	display: flex;
	flex: 1;
	align-items: center;
	gap: 0.4rem;
	height: 2.45rem;
	min-width: 10rem;
	padding-inline: 0.7rem;
	border: 1px solid var(--c-border);
	border-radius: 0.45rem;
	background-color: var(--c-bg-1);
	color: var(--c-text-2);

	&:focus-within {
		border-color: var(--c-primary);
		box-shadow: 0 0 0 3px var(--c-primary-soft);
		color: var(--c-text-1);
	}

	input {
		height: auto;
		padding: 0;
		border: none;
		box-shadow: none;
		outline: none;
		background: transparent;

		&:focus {
			border: none;
			box-shadow: none;
		}
	}
}

.post-count {
	font-size: 0.78rem;
	white-space: nowrap;
	color: var(--c-text-2);
}

label {
	display: grid;
	gap: 0.35rem;
	min-width: 0;

	span {
		font-size: 0.78rem;
		color: var(--c-text-2);
	}
}

input,
select,
textarea {
	width: 100%;
	min-width: 0;
	border: 1px solid var(--c-border);
	border-radius: 0.45rem;
	outline: none;
	background-color: var(--c-bg-1);
	color: var(--c-text-1);

	&:focus {
		border-color: var(--c-primary);
		box-shadow: 0 0 0 3px var(--c-primary-soft);
	}
}

input,
select {
	height: 2.25rem;
	padding-inline: 0.65rem;
}

textarea {
	padding: 0.65rem;
	resize: vertical;
}

.post-list {
	display: grid;
	align-content: start;
	grid-auto-rows: max-content;
	gap: 0.45rem;
	min-height: 0;
}

.post-item {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 0.18rem;
	overflow: hidden;
	min-height: 5.25rem;
	padding: 0.65rem 0.8rem;
	border: 1px solid transparent;
	border-radius: 0.45rem;
	background-color: var(--c-bg-1);
	line-height: 1.35;
	text-align: start;
	color: var(--c-text-1);
	cursor: pointer;

	&[aria-disabled="true"] {
		opacity: 0.55;
		cursor: wait;
	}

	&:hover {
		background-color: var(--c-primary-soft);
		color: var(--c-primary);
	}

	&.active {
		border-color: var(--c-primary);
		box-shadow: inset 3px 0 0 var(--c-primary);
		background-color: var(--ld-bg-card);
		color: var(--c-text-1);
	}

	span,
	small,
	em {
		display: block;
		overflow: hidden;
		min-width: 0;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	span {
		font-weight: 700;
	}

	small {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 1rem;
		font-size: 0.72rem;
		white-space: nowrap;
		color: var(--c-text-3);

		b {
			flex: none;
			font-weight: 700;
			color: var(--c-primary);
		}

		time {
			overflow: hidden;
			min-width: 0;
			text-overflow: ellipsis;
		}

		.draft-badge {
			color: var(--c-warning);
		}

		.recommend-badge {
			color: var(--c-primary);
		}
	}

	em {
		font-family: var(--font-monospace);
		font-size: 0.7rem;
		font-style: normal;
		color: var(--c-text-3);
	}

	.post-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		min-height: 1.2rem;
		overflow: hidden;
		margin-block-start: 0.15rem;

		li {
			flex: none;
			padding: 0.08rem 0.35rem;
			border-radius: 0.25rem;
			background-color: var(--c-bg-soft);
			font-size: 0.68rem;
			color: var(--c-text-2);
		}
	}
}

.empty-text {
	padding: 1rem 0;
	text-align: center;
	color: var(--c-text-3);
}

.post-pagination {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	padding-block-start: 0.25rem;

	> span {
		font-size: 0.82rem;
		white-space: nowrap;
		color: var(--c-text-2);
	}
}

.editor-pane {
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	gap: 1rem;
	min-width: 0;
	min-height: 0;
	padding: 1.25rem;
	border: none;
	border-radius: 0;
	background-color: var(--c-bg-1);
}

.title-row {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	align-items: end;
	gap: 0.8rem;
}

.title-field input {
	height: 3.2rem;
	background-color: var(--ld-bg-card);
	font-size: 1.5rem;
	font-weight: 700;
}

.path-chip {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	min-height: 2rem;
	padding: 0.3rem 0;
	font-family: var(--font-monospace);
	font-size: 0.76rem;
	color: var(--c-text-2);

	&.warning {
		color: var(--c-text-1);
	}

	span {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}

.body-field {
	grid-template-rows: auto minmax(0, 1fr);
	min-height: 0;

	.field-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.editor-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;

		select {
			width: auto;
			height: 2rem;
			padding-inline: 0.45rem;
			font-size: 0.78rem;
		}

		button {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			padding: 0.3rem 0.55rem;
			border: 1px solid var(--c-border);
			border-radius: 0.4rem;
			background-color: var(--ld-bg-card);
			font-size: 0.78rem;
			color: var(--c-text-2);

			&:hover {
				border-color: var(--c-primary);
				color: var(--c-primary);
			}

			&:disabled {
				opacity: 0.55;
				cursor: not-allowed;
			}
		}
	}

	textarea {
		height: 100%;
		min-height: 0;
		background-color: var(--ld-bg-card);
		font-family: var(--font-monospace);
		font-size: 0.95rem;
		line-height: 1.7;
		resize: none;
	}
}

.meta-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 0.65rem;
}

.wide {
	grid-column: 1 / -1;
}

.visually-hidden {
	position: absolute;
	overflow: hidden;
	width: 1px;
	height: 1px;
	clip-path: inset(50%);
	white-space: nowrap;
}

.add-category-row {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
	align-items: end;
	gap: 0.65rem;
}

.color-field {
	display: grid;
	grid-template-columns: 2.5rem minmax(0, 1fr);
	gap: 0.4rem;

	input[type='color'] {
		padding: 0.2rem;
	}
}

.manager-content {
	grid-template-rows: minmax(0, 1fr) auto;
	overflow: hidden;
}

.manager-list {
	display: grid;
	align-content: start;
	gap: 0.5rem;
	overflow: auto;
	min-height: 0;
	padding-inline-end: 0.2rem;
}

.manager-row {
	display: grid;
	align-items: end;
	gap: 0.65rem;
	padding-block: 0.55rem;
	border-block-end: 1px solid var(--c-border);
}

.category-row {
	grid-template-columns: minmax(8rem, 0.8fr) minmax(10rem, 1fr) minmax(10rem, 1fr) auto;
}

.category-create-row {
	display: grid;
	grid-template-columns: minmax(8rem, 0.8fr) minmax(10rem, 1fr) minmax(10rem, 1fr) auto;
	align-items: end;
	gap: 0.65rem;
	padding-block-start: 0.75rem;
	border-block-start: 1px solid var(--c-border);
}

.category-identity {
	display: flex;
	align-items: center;
	align-self: center;
	gap: 0.5rem;
	min-width: 0;

	.iconify {
		flex: none;
		font-size: 1.25rem;
	}

	strong {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}

.manager-footer,
.manager-actions {
	display: flex;
	justify-content: flex-end;
	gap: 0.65rem;
}

.tag-cloud {
	display: flex;
	align-content: flex-start;
	flex-wrap: wrap;
	gap: 0.45rem;
	overflow: auto;
	min-height: 8rem;

	button {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		height: 2rem;
		padding-inline: 0.65rem;
		border: 1px solid var(--c-border);
		border-radius: 0.4rem;
		background-color: var(--c-bg-1);
		color: var(--c-text-1);

		&.active {
			border-color: var(--c-primary);
			background-color: var(--c-primary-soft);
			color: var(--c-primary);
		}

		small {
			color: var(--c-text-3);
		}
	}
}

.tag-merge-panel {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	align-items: end;
	gap: 0.65rem;
	padding-block-start: 0.75rem;
	border-block-start: 1px solid var(--c-border);

	.manager-actions {
		grid-column: 1 / -1;
	}
}

.tag-editor {
	display: grid;
	gap: 0.4rem;

	> span {
		font-size: 0.78rem;
		color: var(--c-text-2);
	}
}

.selected-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 0.35rem;

	button {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		min-height: 1.8rem;
		padding-inline: 0.5rem;
		border-radius: 0.35rem;
		background-color: var(--c-primary-soft);
		font-size: 0.76rem;
		color: var(--c-primary);
	}
}

.tag-input-row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 0.5rem;
}

.delete-confirmation {
	justify-items: center;
	padding: 1.5rem;
	text-align: center;

	> .iconify {
		font-size: 2.5rem;
		color: var(--c-error);
	}

	code {
		max-width: 100%;
		overflow-wrap: anywhere;
		font-size: 0.78rem;
		color: var(--c-text-2);
	}

	.manager-actions {
		width: 100%;
		margin-block-start: 0.5rem;
	}
}

.cover-actions {
	display: flex;
	align-items: center;
	gap: 0.65rem;

	> small {
		font-size: 0.76rem;
		color: var(--c-text-3);
	}
}

.cover-preview {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: end;
	gap: 0.65rem;

	img {
		width: 100%;
		height: 9rem;
		border: 1px solid var(--c-border);
		border-radius: 0.45rem;
		background-color: var(--c-bg-1);
		object-fit: cover;
	}
}

.article-preview-section {
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	min-height: 0;
}

.article-preview {
	overflow: auto;
	min-height: 0;
	padding: 0.25rem;
	scrollbar-width: thin;
}

.status-box {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: 0.5rem;
	padding: 0.75rem;
	border: 1px solid var(--c-border);
	border-radius: 0.5rem;
	background-color: var(--ld-bg-card);
	color: var(--c-text-2);

	&.success {
		border-color: var(--c-success);
		background-color: var(--c-success-soft);
		color: var(--c-text-1);
	}

	&.error {
		border-color: var(--c-error);
		background-color: var(--c-error-soft);
		color: var(--c-text-1);
	}
}

.result-links {
	display: flex;
	gap: 0.75rem;
	margin-block-start: 0.35rem;
	font-weight: 700;
	color: var(--c-primary);
}

@media (max-width: $breakpoint-widescreen) {
	.workspace {
		grid-template-columns: minmax(0, 1fr) minmax(20rem, 0.55fr);
	}
}

@media (max-width: $breakpoint-mobile) {
	.admin-page {
		overflow: visible;
		height: auto;
		min-height: 100vh;
	}

	.topbar,
	.topbar-actions,
	.title-row,
	.dialog-toolbar,
	.post-pagination {
		flex-direction: column;
		align-items: stretch;
	}

	.workspace {
		grid-template-columns: 1fr;
		overflow: visible;
		min-height: auto;
		padding: 0.75rem;
	}

	.preview-pane {
		overflow: visible;
		min-height: 0;
		max-height: none;
		padding: 0;
		border: none;
	}

	.editor-pane {
		grid-template-rows: auto minmax(28rem, 1fr);
		padding: 0;
		border: none;
	}

	.github-form {
		grid-template-columns: 1fr;
	}

	.add-category-row {
		grid-template-columns: 1fr;
	}

	.category-row,
	.category-create-row,
	.tag-merge-panel {
		grid-template-columns: 1fr;
	}

	.tag-merge-panel .manager-actions {
		grid-column: auto;
		flex-direction: column;
	}

	.cover-actions {
		flex-direction: column;
		align-items: stretch;
	}

	.cover-preview {
		grid-template-columns: 1fr;
	}
}
</style>

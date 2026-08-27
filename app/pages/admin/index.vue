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
	sha?: string
	size?: number
	type?: string
}

interface RepoImage {
	path: string
	sha?: string
	size?: number
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
const stagedChangesKey = 'blog-admin:staged-changes'
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
const crlfRegex = /\r\n/g
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
const memoryContentPathRegex = /^content\/posts\/memory\/(\d{4})\/(.+)\.md$/
const weeklyFileYearRegex = /^(\d{4})(?:-|$)/
const treasureCategoriesRegex = /^\s*categories\s*:/m
const fileExtensionRegex = /\.[^.]+$/
const categoryConfigBlockRegex = /\/\/ BLOG_ADMIN_CATEGORIES_START[\s\S]*?\/\/ BLOG_ADMIN_CATEGORIES_END/
const blogConfigDeclarationRegex = /^const\s+blogConfig\s*=/m
const categoriesPropertyRegex = /(\bcategories\s*:\s*\{\s*)/
const frontmatterTagsLineRegex = /^tags:[^\r\n]*$/m
const frontmatterUpdatedLineRegex = /^updated:[^\r\n]*$/m
const markdownImageRefRegex = /!\[[^\]]*\]\((\/images\/[^)\s]+)\)/g
const imageFileRegex = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i
const timeEstablishedRegex = /timeEstablished:\s*(['"])[^'"]*\1/
const birthYearRegex = /birthYear:\s*\d+/
const wordCountRegex = /wordCount:\s*(['"])[^'"]*\1/
const logConfigBlockRegex = /\/\/ BLOG_ADMIN_LOG_START[\s\S]*?\/\/ BLOG_ADMIN_LOG_END/
const logArrayRegex = /const blogLog = \[[\s\S]*?\n\]/
const logEntryRegex = /\{\s*label:\s*'((?:[^'\\]|\\.)*)',\s*value:\s*'((?:[^'\\]|\\.)*)'\s*\}/g
const logEscapeRegex = /[\\']/g
const logUnescapeRegex = /\\(['\\])/g
const logFilePath = 'app/components/widget/BlogLog.vue'
const treasureFilePath = 'data/treasure.yml'
const githubRequestTimeout = 30000
const maxImageSize = 8 * 1024 * 1024
const imageExtensionMap: Record<string, string> = {
	'image/avif': 'avif',
	'image/gif': 'gif',
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
}
const imageMimeMap: Record<string, string> = {
	avif: 'image/avif',
	gif: 'image/gif',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	png: 'image/png',
	svg: 'image/svg+xml',
	webp: 'image/webp',
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
const stagedPersistFailed = ref(false)
const isCommittingChanges = ref(false)
const bodyImageWidth = ref('')

const appConfig = useAppConfig()
const siteForm = reactive({
	timeEstablished: blogConfig.timeEstablished,
	birthYear: appConfig.component.stats.birthYear,
	wordCount: appConfig.component.stats.wordCount,
})
const isSavingSite = ref(false)

const logEntries = ref<{ label: string, value: string }[]>([])
const logDraft = reactive({ label: '', value: '' })
const isLoadingLog = ref(false)
const isSavingLog = ref(false)

const treasureSource = ref('')
const weeklyDocument = ref('')
const weeklyFileName = ref('')
const isLoadingTreasure = ref(false)

const repoImages = ref<RepoImage[]>([])
const isLoadingImages = ref(false)
const imageSearch = ref('')
const imageFolder = ref('')
const imageOnlyUnused = ref(false)
const imageUsage = ref<Record<string, number> | null>(null)
const isScanningImageUsage = ref(false)
const imageApiPreviews = ref<Record<string, string>>({})
const selectedImagePaths = ref<string[]>([])
const imageLibraryMode = ref<'browse' | 'cover' | 'insert'>('browse')
const deleteImageCandidates = ref<{ checked: boolean, path: string, ref: string, usedElsewhere: boolean }[]>([])
const isCheckingDeleteImages = ref(false)

const posts = ref<GithubPost[]>([])
const selectedPostPath = ref('')
const selectedPostSha = ref('')
const selectedPostOriginalPath = ref('')
const activeDialog = ref<'categories' | 'confirm' | 'delete' | 'github' | 'images' | 'log' | 'meta' | 'posts' | 'site' | 'staged' | 'tags' | 'treasure' | 'weekly' | null>(null)
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
	loadStagedChanges()
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
	window.addEventListener('beforeunload', handleBeforeUnload)
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
	if (form.type === 'memory')
		return `content/posts/memory/${year}/${slug}.md`
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

const weeklyFilePath = computed(() => {
	const name = sanitizeFileName(weeklyFileName.value.replace(mdExtensionRegex, ''))
	const year = name.match(weeklyFileYearRegex)?.[1] || new Date().getFullYear().toString()
	return `content/posts/weekly/${year}/${name || '未命名周报'}.md`
})

const canUseGithub = computed(() => hasGithubSettings())
const stagedChangeCount = computed(() => stagedChanges.value.length)
const stagedChangeLabel = computed(() => stagedChangeCount.value ? `提交全部（${stagedChangeCount.value}）` : '提交全部')
const dialogMeta = computed(() => ({
	categories: { icon: 'ph:folders-bold', title: '分类管理' },
	confirm: { icon: 'ph:warning-circle-bold', title: pendingConfirmation.value?.title || '确认操作' },
	delete: { icon: 'ph:trash-bold', title: '删除文章' },
	github: { icon: 'ph:github-logo-bold', title: 'GitHub 配置' },
	images: {
		icon: 'ph:images-bold',
		title: imageLibraryMode.value === 'insert' ? '图片库 · 点击图片插入正文' : imageLibraryMode.value === 'cover' ? '图片库 · 点击图片设为封面' : '图片库',
	},
	log: { icon: 'ph:clock-counter-clockwise-bold', title: '更新日志' },
	meta: { icon: 'ph:sliders-horizontal-bold', title: '文章设置' },
	posts: { icon: 'ph:files-bold', title: postView.value === 'drafts' ? '草稿箱' : '文章列表' },
	site: { icon: 'ph:gear-bold', title: '站点设置' },
	staged: { icon: 'ph:tray-bold', title: '暂存区' },
	tags: { icon: 'ph:tag-bold', title: '标签管理' },
	treasure: { icon: 'ph:treasure-chest-bold', title: '藏宝阁发布' },
	weekly: { icon: 'ph:newspaper-bold', title: '发布周报' },
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
		`title: ${yamlString(form.title || (form.type === 'memory' ? '' : '未命名文章'))}`,
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
	imageLibraryMode.value = 'browse'
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
	if (form.type !== 'memory' && !form.title.trim())
		return '请先填写文章标题。'
	if (!form.body.trim() && !(form.type === 'memory' && form.image.trim()))
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

function defaultMemorySlug() {
	const value = new Date()
	const milliseconds = value.getMilliseconds().toString().padStart(3, '0')
	return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}-${pad(value.getHours())}${pad(value.getMinutes())}${pad(value.getSeconds())}-${milliseconds}`
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

function startMemoryDraft() {
	resetForm()
	form.type = 'memory'
	form.slug = defaultMemorySlug()
	form.category = categoryOptions.value.includes('网络记忆') ? '网络记忆' : form.category
	form.body = ''
	statusMessage.value = '已切换到网络记忆发布模式。'
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
	const memoryMatch = path.match(memoryContentPathRegex)
	const matched = memoryMatch || path.match(contentPathRegex)
	if (!matched)
		return

	form.date ||= `${matched[1]}-01-01 00:00`
	form.slug = matched[2]
	if (memoryMatch)
		form.type = 'memory'
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

function loadStagedChanges() {
	const raw = localStorage.getItem(stagedChangesKey)
	if (!raw)
		return
	try {
		const values = JSON.parse(raw)
		if (Array.isArray(values))
			stagedChanges.value = values.filter(item => item && typeof item.path === 'string')
	}
	catch {
		localStorage.removeItem(stagedChangesKey)
	}
}

watch(stagedChanges, () => {
	try {
		if (stagedChanges.value.length)
			localStorage.setItem(stagedChangesKey, JSON.stringify(stagedChanges.value))
		else
			localStorage.removeItem(stagedChangesKey)
		stagedPersistFailed.value = false
	}
	catch {
		// localStorage 配额不足（通常是大图 base64），暂存只保留在内存中。
		stagedPersistFailed.value = true
	}
}, { deep: true })

function handleBeforeUnload(event: BeforeUnloadEvent) {
	if (stagedPersistFailed.value && stagedChanges.value.length) {
		event.preventDefault()
		event.returnValue = ''
	}
}

function describeStagedChange(change: StagedChange) {
	if (change.delete)
		return { label: '删除', tone: 'danger' }
	if (change.encoding === 'base64')
		return { label: '新图片', tone: 'normal' }
	if (change.path === treasureFilePath)
		return { label: '藏宝阁', tone: 'normal' }
	if (change.path.startsWith('content/posts/weekly/'))
		return { label: '周报', tone: 'normal' }
	if (change.path.startsWith('content/posts/memory/'))
		return { label: '网络记忆', tone: 'normal' }
	if (change.path.endsWith('.md'))
		return { label: '文章', tone: 'normal' }
	return { label: '配置', tone: 'normal' }
}

function unstageChange(path: string) {
	stagedChanges.value = stagedChanges.value.filter(item => item.path !== path)
	statusMessage.value = `已撤销暂存：${path}`
	if (path.endsWith('.md') && canUseGithub.value)
		void loadPosts({ silent: true })
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
	closeDialog()
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
		// 文件树与父提交完全一致时，创建出来的会是一个没有任何改动的空 commit
		if (tree.sha === commit.tree?.sha) {
			clearStagedChanges()
			statusMessage.value = '暂存内容与仓库现有文件完全一致，没有需要提交的改动。'
			return
		}
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

async function insertImageMarkdown(imagePath: string, alt = '图片') {
	const sizeAttrs = bodyImageWidth.value ? `{width="${bodyImageWidth.value}"}` : ''
	const markdownImage = `![${alt}](${imagePath})${sizeAttrs}`
	const textarea = bodyTextarea.value
	const start = textarea?.selectionStart ?? form.body.length
	const end = textarea?.selectionEnd ?? start
	form.body = `${form.body.slice(0, start)}${markdownImage}${form.body.slice(end)}`

	await nextTick()
	if (textarea) {
		const cursor = start + markdownImage.length
		textarea.focus()
		textarea.setSelectionRange(cursor, cursor)
	}
}

function imageRefPath(path: string) {
	return `/${path.replace(publicPrefixRegex, '')}`
}

function getImageMime(path: string) {
	const extension = path.split('.').at(-1)?.toLowerCase() || 'png'
	return imageMimeMap[extension] || 'image/png'
}

/**
 * 缩略图优先使用站点自身的 /images/... 路径（public 目录里的文件在开发和线上都由站点直接提供，
 * 不依赖 raw.githubusercontent.com）。尚未提交的暂存图用 base64 data URL。
 */
function getImagePreviewSrc(path: string) {
	const staged = stagedChanges.value.find(item => item.path === path && !item.delete && item.encoding === 'base64' && item.content)
	if (staged)
		return `data:${getImageMime(path)};base64,${staged.content}`
	return imageApiPreviews.value[path] || imageRefPath(path)
}

/** 本地没有这张图（例如上传后还没部署）时，改用带 token 的 Blob API 拉取缩略图。 */
async function loadImageApiPreview(path: string) {
	if (imageApiPreviews.value[path] !== undefined)
		return
	const image = repoImages.value.find(item => item.path === path)
	if (!image?.sha || !canUseGithub.value)
		return
	imageApiPreviews.value[path] = ''
	try {
		const blob = await githubRequest<{ content?: string }>(`${repoPath.value}/git/blobs/${image.sha}`)
		if (!blob.content)
			return
		const binary = atob(blob.content.replace(newlineRegex, ''))
		const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
		imageApiPreviews.value[path] = URL.createObjectURL(new Blob([bytes], { type: getImageMime(path) }))
	}
	catch {
		// 拉取失败时保留站点路径作为兜底。
	}
}

function clearImageApiPreviews() {
	for (const previewUrl of Object.values(imageApiPreviews.value)) {
		if (previewUrl)
			URL.revokeObjectURL(previewUrl)
	}
	imageApiPreviews.value = {}
}

function formatBytes(size?: number) {
	if (!size)
		return ''
	if (size < 1024)
		return `${size} B`
	if (size < 1024 * 1024)
		return `${(size / 1024).toFixed(1)} KB`
	return `${(size / 1024 / 1024).toFixed(2)} MB`
}

async function loadRepoImages() {
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再查看图片库。'
		return
	}
	isLoadingImages.value = true
	try {
		const result = await githubRequest<{ tree: GithubTreeItem[] }>(
			`${repoPath.value}/git/trees/${encodeURIComponent(settings.branch.trim())}?recursive=1`,
		)
		repoImages.value = result.tree
			.filter(item => item.type === 'blob' && item.path?.startsWith('public/images/') && imageFileRegex.test(item.path))
			.map(item => ({ path: item.path!, sha: item.sha, size: item.size }))
			.sort((a, b) => b.path.localeCompare(a.path))
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
	}
	finally {
		isLoadingImages.value = false
	}
}

const imageFolders = computed(() => {
	const folders = new Set<string>()
	for (const image of repoImages.value)
		folders.add(image.path.split('/').slice(0, -1).join('/'))
	return [...folders].toSorted((a, b) => b.localeCompare(a))
})

function imageFolderLabel(folder: string) {
	return folder === 'public/images' ? '未分组' : folder.slice('public/images/'.length)
}

function getImageUsage(path: string) {
	return imageUsage.value?.[path]
}

const galleryImages = computed(() => {
	const deletedPaths = new Set(stagedChanges.value.filter(item => item.delete).map(item => item.path))
	const stagedImages = stagedChanges.value
		.filter(item => !item.delete && item.encoding === 'base64' && item.path.startsWith('public/images/') && item.content)
		.map(item => ({ path: item.path, size: undefined as number | undefined, staged: true }))
	const stagedPaths = new Set(stagedImages.map(item => item.path))
	const committedImages = repoImages.value
		.filter(image => !deletedPaths.has(image.path) && !stagedPaths.has(image.path))
		.map(image => ({ path: image.path, size: image.size, staged: false }))
	const keyword = imageSearch.value.trim().toLowerCase()
	return [...stagedImages, ...committedImages].filter((item) => {
		if (imageFolder.value && !item.path.startsWith(`${imageFolder.value}/`))
			return false
		if (imageOnlyUnused.value && getImageUsage(item.path) !== 0)
			return false
		if (keyword && !item.path.toLowerCase().includes(keyword))
			return false
		return true
	})
})

/** 扫描所有文章（含暂存中的修改），统计每张图片被引用的次数。 */
async function scanImageUsage() {
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再检测图片引用。'
		return
	}
	isScanningImageUsage.value = true
	try {
		const contents = await Promise.all(posts.value.map(post => fetchPostMarkdown(post.path).catch(() => '')))
		const usage: Record<string, number> = {}
		const allPaths = [
			...repoImages.value.map(image => image.path),
			...stagedChanges.value.filter(item => !item.delete && item.encoding === 'base64').map(item => item.path),
		]
		for (const path of allPaths) {
			const refPath = imageRefPath(path)
			usage[path] = contents.filter(content => content.includes(refPath)).length
		}
		imageUsage.value = usage
		const unusedCount = Object.values(usage).filter(count => count === 0).length
		statusMessage.value = unusedCount
			? `引用检测完成：${unusedCount} 张图片未被任何文章引用。`
			: '引用检测完成：所有图片都在使用中。'
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
	}
	finally {
		isScanningImageUsage.value = false
	}
}

function openImageLibrary(mode: 'browse' | 'cover' | 'insert' = 'browse') {
	imageLibraryMode.value = mode
	openDialog('images')
	if (!repoImages.value.length)
		void loadRepoImages()
}

async function handleGalleryImageClick(path: string) {
	if (imageLibraryMode.value === 'insert')
		await insertImageFromLibrary(path)
	else if (imageLibraryMode.value === 'cover')
		setCoverFromLibrary(path)
}

function toggleImageSelection(path: string) {
	selectedImagePaths.value = selectedImagePaths.value.includes(path)
		? selectedImagePaths.value.filter(item => item !== path)
		: [...selectedImagePaths.value, path]
}

function selectFilteredImages() {
	selectedImagePaths.value = galleryImages.value.map(item => item.path)
}

function clearImageSelection() {
	selectedImagePaths.value = []
}

/** 暂存的新图直接撤销暂存；已提交的图暂存一条删除记录。 */
function removeGalleryImage(path: string) {
	const stagedAddition = stagedChanges.value.find(item => item.path === path && !item.delete && item.encoding === 'base64')
	if (stagedAddition) {
		stagedChanges.value = stagedChanges.value.filter(item => item.path !== path)
		return
	}
	stageChange({ delete: true, path })
}

async function insertImageFromLibrary(path: string) {
	const refPath = imageRefPath(path)
	const alt = path.split('/').at(-1)?.replace(fileExtensionRegex, '') || '图片'
	await insertImageMarkdown(refPath, alt)
	closeDialog()
	statusMessage.value = `已插入图片：${refPath}`
}

function setCoverFromLibrary(path: string) {
	clearCoverPreviewUrl()
	form.image = imageRefPath(path)
	if (imageLibraryMode.value === 'cover') {
		imageLibraryMode.value = 'browse'
		openDialog('meta')
	}
	else {
		closeDialog()
	}
	statusMessage.value = `封面图已设置：${form.image}`
}

async function copyImagePath(path: string) {
	const refPath = imageRefPath(path)
	try {
		await navigator.clipboard.writeText(refPath)
		statusMessage.value = `已复制图片路径：${refPath}`
	}
	catch {
		errorMessage.value = '复制失败，请手动复制路径。'
	}
}

function removeLibraryImage(path: string) {
	const usage = getImageUsage(path)
	requestConfirmation({
		action: () => {
			removeGalleryImage(path)
			selectedImagePaths.value = selectedImagePaths.value.filter(item => item !== path)
			statusMessage.value = `图片“${path}”的删除已暂存，点击“提交全部”后统一发布。`
		},
		confirmLabel: '暂存删除',
		detail: usage === undefined
			? '尚未检测引用，请先确认没有文章正在使用这张图片。'
			: usage > 0
				? `注意：仍有 ${usage} 篇文章引用这张图片，删除后文章中会出现坏图。`
				: '这张图片未被任何文章引用，可以放心删除。',
		message: `确定删除图片 ${path} 吗？`,
		title: '删除图片',
	})
}

function removeSelectedImages() {
	const paths = [...selectedImagePaths.value]
	if (!paths.length)
		return
	const usedCount = paths.filter(path => (getImageUsage(path) || 0) > 0).length
	requestConfirmation({
		action: () => {
			for (const path of paths)
				removeGalleryImage(path)
			clearImageSelection()
			statusMessage.value = `${paths.length} 张图片的删除已暂存，点击“提交全部”后统一发布。`
		},
		confirmLabel: '批量暂存删除',
		detail: usedCount
			? `注意：其中 ${usedCount} 张仍被文章引用，删除后会出现坏图。`
			: imageUsage.value
				? '所选图片均未被文章引用。'
				: '尚未检测引用，建议先点击“检测引用”确认。',
		message: `确定删除选中的 ${paths.length} 张图片吗？`,
		title: '批量删除图片',
	})
}

async function fetchPostMarkdown(path: string) {
	const staged = getStagedContent(path)
	if (staged !== undefined)
		return staged
	const result = await githubRequest<GithubContent>(
		`${repoPath.value}/contents/${encodePath(path)}?ref=${encodeURIComponent(settings.branch.trim())}`,
	)
	return decodeBase64(result.content)
}

function extractImageRefs(markdownValue: string) {
	const refs = new Set<string>()
	const { meta } = parseMarkdownContent(markdownValue)
	if (typeof meta.image === 'string' && meta.image.startsWith('/images/'))
		refs.add(meta.image)
	for (const matched of markdownValue.matchAll(markdownImageRefRegex))
		refs.add(matched[1]!)
	return [...refs]
}

async function openDeleteDialog() {
	openDialog('delete')
	deleteImageCandidates.value = []
	if (!selectedPostOriginalPath.value || !canUseGithub.value)
		return

	isCheckingDeleteImages.value = true
	try {
		const targetPath = selectedPostOriginalPath.value
		const refs = extractImageRefs(await fetchPostMarkdown(targetPath))
		if (!refs.length)
			return

		const otherPosts = posts.value.filter(post => post.path !== targetPath)
		const otherContents = await Promise.all(
			otherPosts.map(post => fetchPostMarkdown(post.path).catch(() => '')),
		)
		deleteImageCandidates.value = refs.map((ref) => {
			const usedElsewhere = otherContents.some(content => content.includes(ref))
			return { checked: !usedElsewhere, path: `public${ref}`, ref, usedElsewhere }
		})
	}
	catch {
		// 检测失败不阻塞删除，仅不提供图片清理选项。
		deleteImageCandidates.value = []
	}
	finally {
		isCheckingDeleteImages.value = false
	}
}

async function saveSiteSettings() {
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再保存站点设置。'
		return
	}
	isSavingSite.value = true
	clearMessages()
	try {
		const blogConfigPath = 'blog.config.ts'
		const blogConfigCurrent = await githubRequest<GithubContent>(
			`${repoPath.value}/contents/${blogConfigPath}?ref=${encodeURIComponent(settings.branch.trim())}`,
		)
		const blogConfigSource = getStagedContent(blogConfigPath) || decodeBase64(blogConfigCurrent.content)
		if (!timeEstablishedRegex.test(blogConfigSource))
			throw new Error('blog.config.ts 中找不到 timeEstablished 配置。')
		const timeEstablished = siteForm.timeEstablished.trim()
		stageChange({
			content: blogConfigSource.replace(timeEstablishedRegex, `timeEstablished: '${timeEstablished.replace(quoteRegex, '')}'`),
			path: blogConfigPath,
		})

		const appConfigPath = 'app/app.config.ts'
		const appConfigCurrent = await githubRequest<GithubContent>(
			`${repoPath.value}/contents/${encodePath(appConfigPath)}?ref=${encodeURIComponent(settings.branch.trim())}`,
		)
		const appConfigSource = getStagedContent(appConfigPath) || decodeBase64(appConfigCurrent.content)
		if (!birthYearRegex.test(appConfigSource) || !wordCountRegex.test(appConfigSource))
			throw new Error('app/app.config.ts 中找不到 birthYear 或 wordCount 配置。')
		const birthYear = Math.round(Number(siteForm.birthYear)) || appConfig.component.stats.birthYear
		const wordCount = siteForm.wordCount.trim().replace(quoteRegex, '')
		stageChange({
			content: appConfigSource
				.replace(birthYearRegex, `birthYear: ${birthYear}`)
				.replace(wordCountRegex, `wordCount: '${wordCount}'`),
			path: appConfigPath,
		})

		closeDialog()
		statusMessage.value = '站点设置已暂存，点击“提交全部”后统一发布，部署完成后前台生效。'
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
	}
	finally {
		isSavingSite.value = false
	}
}

function escapeLogText(value: string) {
	return value.replace(logEscapeRegex, match => `\\${match}`)
}

function parseLogEntries(source: string) {
	const block = source.match(logConfigBlockRegex)?.[0] ?? source.match(logArrayRegex)?.[0]
	if (!block)
		throw new Error('BlogLog.vue 中找不到 blogLog 配置，无法读取更新日志。')
	return Array.from(block.matchAll(logEntryRegex), match => ({
		label: (match[1] ?? '').replace(logUnescapeRegex, '$1'),
		value: (match[2] ?? '').replace(logUnescapeRegex, '$1'),
	}))
}

function serializeLogConfigBlock() {
	const rows = logEntries.value
		.map(item => `\t{ label: '${escapeLogText(item.label.trim())}', value: '${escapeLogText(item.value.trim())}' },`)
		.join('\n')
	return [
		'// BLOG_ADMIN_LOG_START',
		'const blogLog = [',
		rows,
		']',
		'// BLOG_ADMIN_LOG_END',
	].join('\n')
}

function migrateLogConfigSource(source: string) {
	if (logConfigBlockRegex.test(source))
		return source.replace(logConfigBlockRegex, serializeLogConfigBlock())
	if (logArrayRegex.test(source))
		return source.replace(logArrayRegex, serializeLogConfigBlock())
	throw new Error('BlogLog.vue 中找不到 blogLog 配置，无法自动更新。')
}

async function fetchLogSource() {
	const current = await githubRequest<GithubContent>(
		`${repoPath.value}/contents/${encodePath(logFilePath)}?ref=${encodeURIComponent(settings.branch.trim())}`,
	)
	return decodeBase64(current.content)
}

async function openLogDialog() {
	openDialog('log')
	logDraft.label = localDateTime().slice(0, 10)
	logDraft.value = ''
	clearMessages()
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再编辑更新日志。'
		return
	}
	isLoadingLog.value = true
	try {
		const source = getStagedContent(logFilePath) || await fetchLogSource()
		logEntries.value = parseLogEntries(source)
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
	}
	finally {
		isLoadingLog.value = false
	}
}

function addLogEntry() {
	const label = logDraft.label.trim()
	const value = logDraft.value.trim()
	if (!label || !value)
		return
	logEntries.value = [...logEntries.value, { label, value }].toSorted((a, b) => a.label.localeCompare(b.label))
	logDraft.label = localDateTime().slice(0, 10)
	logDraft.value = ''
}

function removeLogEntry(index: number) {
	logEntries.value = logEntries.value.filter((_, itemIndex) => itemIndex !== index)
}

async function saveLogConfig() {
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再保存更新日志。'
		return
	}
	// 未点“新增一条”就直接暂存时，自动收编草稿，避免填写内容被静默丢弃
	const draftLabel = logDraft.label.trim()
	const draftValue = logDraft.value.trim()
	if (draftLabel && draftValue) {
		addLogEntry()
	}
	else if (draftValue) {
		// 日期在打开弹窗时已自动填好，只可能是被手动清空
		errorMessage.value = '新增的更新日志还没填日期。'
		return
	}
	if (!logEntries.value.length) {
		errorMessage.value = '至少保留一条更新日志。'
		return
	}
	if (logEntries.value.some(item => !item.label.trim() || !item.value.trim())) {
		errorMessage.value = '更新日志的日期和内容不能为空。'
		return
	}
	isSavingLog.value = true
	clearMessages()
	try {
		const source = getStagedContent(logFilePath) || await fetchLogSource()
		const nextSource = migrateLogConfigSource(source)
		if (nextSource === source) {
			errorMessage.value = '更新日志没有任何改动，无需暂存。'
			return
		}
		stageChange({ content: nextSource, path: logFilePath })
		closeDialog()
		statusMessage.value = '更新日志已暂存，点击“提交全部”后统一发布，部署完成后归档页生效。'
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
	}
	finally {
		isSavingLog.value = false
	}
}

async function fetchTextFile(path: string) {
	const current = await githubRequest<GithubContent>(
		`${repoPath.value}/contents/${encodePath(path)}?ref=${encodeURIComponent(settings.branch.trim())}`,
	)
	return decodeBase64(current.content)
}

async function openTreasureDialog() {
	openDialog('treasure')
	clearMessages()
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再编辑藏宝阁。'
		return
	}
	isLoadingTreasure.value = true
	try {
		treasureSource.value = getStagedContent(treasureFilePath) || await fetchTextFile(treasureFilePath)
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
	}
	finally {
		isLoadingTreasure.value = false
	}
}

function stageTreasure() {
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再发布藏宝阁。'
		return
	}
	if (!treasureSource.value.trim()) {
		errorMessage.value = '藏宝阁内容不能为空。'
		return
	}
	if (!treasureCategoriesRegex.test(treasureSource.value)) {
		errorMessage.value = '藏宝阁 YAML 必须包含 categories 顶级字段。'
		return
	}
	stageChange({ content: treasureSource.value.replace(crlfRegex, '\n'), path: treasureFilePath })
	closeDialog()
	statusMessage.value = '藏宝阁修改已暂存，点击“提交全部”后统一发布。'
}

function openWeeklyDialog() {
	if (!weeklyFileName.value)
		weeklyFileName.value = `${localDateTime().slice(0, 10)}-issue-`
	openDialog('weekly')
}

function stageWeeklyDocument() {
	stageChange({ content: weeklyDocument.value.replace(crlfRegex, '\n'), path: weeklyFilePath.value })
	upsertPostListItem(weeklyFilePath.value)
	cachePosts()
	closeDialog()
	statusMessage.value = '周报已暂存，点击“提交全部”后统一发布。'
}

function stageWeekly() {
	if (!canUseGithub.value) {
		errorMessage.value = '请先完成 GitHub 配置，再发布周报。'
		return
	}
	if (!weeklyFileName.value.trim()) {
		errorMessage.value = '请先填写周报文件名。'
		return
	}
	if (!weeklyDocument.value.trim()) {
		errorMessage.value = '请粘贴完整的周报 Markdown 文档。'
		return
	}
	if (!frontmatterRegex.test(weeklyDocument.value)) {
		errorMessage.value = '周报文档必须包含完整的 YAML frontmatter。'
		return
	}
	const existing = posts.value.some(post => post.path === weeklyFilePath.value)
	if (existing && !getStagedContent(weeklyFilePath.value)) {
		requestConfirmation({
			action: stageWeeklyDocument,
			confirmLabel: '覆盖并暂存',
			detail: weeklyFilePath.value,
			message: '同名周报已存在，继续会用当前完整文档覆盖它。',
			title: '覆盖已有周报',
		})
		return
	}
	stageWeeklyDocument()
}

async function deleteSelectedPost() {
	if (!isEditingExisting.value || !selectedPostOriginalPath.value || !selectedPostSha.value)
		return
	clearMessages()
	const deletedPath = selectedPostOriginalPath.value
	const deletedTitle = form.title || deletedPath
	try {
		stageChange({ delete: true, path: deletedPath })
		const removedImages = deleteImageCandidates.value.filter(item => item.checked)
		for (const item of removedImages)
			stageChange({ delete: true, path: item.path })
		deleteImageCandidates.value = []
		posts.value = posts.value.filter(post => post.path !== deletedPath)
		cachePosts()
		closeDialog()
		resetForm()
		statusMessage.value = removedImages.length
			? `文章“${deletedTitle}”与 ${removedImages.length} 张关联图片的删除已暂存，点击“提交全部”后统一发布。`
			: `文章“${deletedTitle}”的删除已暂存，点击“提交全部”后统一发布。`
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
		await insertImageMarkdown(imagePath, alt)
		bodyImagePreviewUrls.value[imagePath] = URL.createObjectURL(file)
		statusMessage.value = '图片已上传并插入正文。'
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
	clearImageApiPreviews()
	window.removeEventListener('beforeunload', handleBeforeUnload)
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
			<button class="secondary-button" type="button" @click="openImageLibrary()">
				<Icon name="ph:images-bold" />
				<span>图片库</span>
			</button>
			<button class="secondary-button" type="button" @click="openDialog('meta')">
				<Icon name="ph:sliders-horizontal-bold" />
				<span>设置</span>
			</button>
			<button class="secondary-button" type="button" @click="openDialog('site')">
				<Icon name="ph:gear-bold" />
				<span>站点</span>
			</button>
			<button class="secondary-button" type="button" @click="openLogDialog">
				<Icon name="ph:clock-counter-clockwise-bold" />
				<span>日志</span>
			</button>
			<button class="secondary-button" type="button" @click="openTreasureDialog">
				<Icon name="ph:treasure-chest-bold" />
				<span>藏宝阁</span>
			</button>
			<button class="secondary-button" type="button" @click="openWeeklyDialog">
				<Icon name="ph:newspaper-bold" />
				<span>周报</span>
			</button>
			<button class="secondary-button" type="button" @click="startMemoryDraft">
				<Icon name="ph:globe-hemisphere-west-bold" />
				<span>网络记忆</span>
			</button>
			<button class="secondary-button" type="button" @click="resetForm">
				<Icon name="ph:file-plus-bold" />
				<span>新建</span>
			</button>
			<button v-if="isEditingExisting" class="secondary-button danger-button" type="button" @click="openDeleteDialog">
				<Icon name="ph:trash-bold" />
				<span>删除</span>
			</button>
			<button class="publish-button" :disabled="isCommittingChanges || !stagedChangeCount" type="button" @click="openDialog('staged')">
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
					<span>{{ form.type === 'memory' ? '标题（可选）' : '标题' }}</span>
					<input v-model.trim="form.title" :placeholder="form.type === 'memory' ? '可选，例如：某个网站又消失了' : '未命名文章'">
				</label>
				<div class="path-chip" :class="{ warning: pathChanged }">
					<Icon name="ph:git-branch-bold" />
					<span>{{ postPath }}</span>
				</div>
			</div>

			<label class="body-field">
				<div class="field-heading">
					<span>{{ form.type === 'memory' ? '内容' : '正文' }}</span>
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
						<button :disabled="!canUseGithub" title="从已上传的图片中选择并插入" type="button" @click.prevent="openImageLibrary('insert')">
							<Icon name="ph:images-bold" />
							<span>从图片库插入</span>
						</button>
					</div>
				</div>
				<textarea ref="bodyTextarea" v-model="form.body" :placeholder="form.type === 'memory' ? '写几句话，或粘贴 Markdown 图片。内容会直接出现在网络记忆时间流里。' : ''" spellcheck="false" />
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
					<p v-if="isCheckingDeleteImages" class="delete-images-checking">
						<Icon name="line-md:loading-twotone-loop" />
						正在检测文章引用的图片…
					</p>
					<div v-else-if="deleteImageCandidates.length" class="delete-images-list">
						<p>文章引用了以下图片，勾选后将一并暂存删除：</p>
						<label v-for="item in deleteImageCandidates" :key="item.path" class="delete-image-row">
							<input v-model="item.checked" type="checkbox">
							<img :src="getImagePreviewSrc(item.path)" alt="" @error="loadImageApiPreview(item.path)">
							<span class="delete-image-info">
								<code>{{ item.ref }}</code>
								<small v-if="item.usedElsewhere" class="warning-text">其他文章仍在引用，默认保留</small>
								<small v-else>仅此文章使用</small>
							</span>
						</label>
					</div>
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

				<div v-else-if="activeDialog === 'staged'" class="dialog-content staged-dialog-content">
					<p v-if="!stagedChanges.length" class="empty-text">
						当前没有待提交的修改
					</p>
					<div v-else class="staged-list">
						<div v-for="change in stagedChanges" :key="change.path" class="staged-row">
							<span class="staged-type" :class="{ danger: change.delete }">{{ describeStagedChange(change).label }}</span>
							<code>{{ change.path }}</code>
							<button class="icon-button" title="撤销此项暂存" type="button" @click="unstageChange(change.path)">
								<Icon name="ph:arrow-counter-clockwise-bold" />
							</button>
						</div>
					</div>
					<p v-if="stagedPersistFailed" class="warning-text">
						暂存内容过大，无法保存到浏览器本地，刷新页面会丢失，请尽快提交。
					</p>
					<div class="manager-actions">
						<button class="secondary-button" type="button" @click="closeDialog">
							继续编辑
						</button>
						<button class="publish-button" :disabled="isCommittingChanges || !stagedChanges.length" type="button" @click="commitStagedChanges">
							<Icon :name="isCommittingChanges ? 'line-md:loading-twotone-loop' : 'ph:paper-plane-tilt-bold'" />
							<span>{{ isCommittingChanges ? '提交中' : `确认提交 ${stagedChanges.length} 项` }}</span>
						</button>
					</div>
				</div>

				<div v-else-if="activeDialog === 'images'" class="dialog-content images-dialog-content">
					<p v-if="imageLibraryMode !== 'browse'" class="image-mode-hint">
						<Icon name="ph:cursor-click-bold" />
						<span>{{ imageLibraryMode === 'insert' ? '点击任意图片，即可插入到正文光标处。' : '点击任意图片，即可设为文章封面。' }}</span>
					</p>
					<div class="dialog-toolbar">
						<label class="search-field">
							<Icon name="ph:magnifying-glass-bold" />
							<input v-model.trim="imageSearch" placeholder="搜索图片路径">
						</label>
						<select v-model="imageFolder" class="folder-select" aria-label="按目录筛选">
							<option value="">
								全部目录
							</option>
							<option v-for="folder in imageFolders" :key="folder" :value="folder">
								{{ imageFolderLabel(folder) }}
							</option>
						</select>
						<button class="secondary-button" :disabled="!canUseGithub || isLoadingImages" type="button" @click="loadRepoImages">
							<Icon :name="isLoadingImages ? 'line-md:loading-twotone-loop' : 'ph:arrow-clockwise-bold'" />
							<span>刷新</span>
						</button>
					</div>
					<div class="image-manage-bar">
						<button class="secondary-button" :disabled="!canUseGithub || isScanningImageUsage" type="button" @click="scanImageUsage">
							<Icon :name="isScanningImageUsage ? 'line-md:loading-twotone-loop' : 'ph:magnifying-glass-plus-bold'" />
							<span>{{ isScanningImageUsage ? '检测中' : '检测引用' }}</span>
						</button>
						<label v-if="imageUsage" class="unused-toggle">
							<input v-model="imageOnlyUnused" type="checkbox">
							<span>仅看未使用</span>
						</label>
						<span class="manage-bar-spacer" />
						<button v-if="galleryImages.length" class="secondary-button" type="button" @click="selectFilteredImages">
							<Icon name="ph:selection-all-bold" />
							<span>全选</span>
						</button>
						<button v-if="selectedImagePaths.length" class="secondary-button" type="button" @click="clearImageSelection">
							<span>取消选择</span>
						</button>
						<button v-if="selectedImagePaths.length" class="secondary-button danger-button" type="button" @click="removeSelectedImages">
							<Icon name="ph:trash-bold" />
							<span>删除选中（{{ selectedImagePaths.length }}）</span>
						</button>
					</div>
					<div class="image-grid">
						<figure
							v-for="item in galleryImages"
							:key="item.path"
							class="image-card"
							:class="{ clickable: imageLibraryMode !== 'browse', selected: selectedImagePaths.includes(item.path) }"
						>
							<label class="image-select">
								<input
									:checked="selectedImagePaths.includes(item.path)"
									type="checkbox"
									@change="toggleImageSelection(item.path)"
								>
							</label>
							<img
								:src="getImagePreviewSrc(item.path)"
								alt=""
								loading="lazy"
								@click="handleGalleryImageClick(item.path)"
								@error="loadImageApiPreview(item.path)"
							>
							<span v-if="item.staged" class="image-badge">未提交</span>
							<span v-else-if="getImageUsage(item.path) === 0" class="image-badge unused">未使用</span>
							<span v-else-if="getImageUsage(item.path)" class="image-badge used">引用 {{ getImageUsage(item.path) }}</span>
							<figcaption :title="item.path">
								<span>{{ item.path.split('/').at(-1) }}</span>
								<small v-if="formatBytes(item.size)">{{ formatBytes(item.size) }}</small>
							</figcaption>
							<div class="image-actions">
								<button title="插入到正文光标处" type="button" @click="insertImageFromLibrary(item.path)">
									<Icon name="ph:text-indent-bold" />
									<span>插入</span>
								</button>
								<button title="设为文章封面图" type="button" @click="setCoverFromLibrary(item.path)">
									<Icon name="ph:image-square-bold" />
									<span>封面</span>
								</button>
								<button title="复制图片路径" type="button" @click="copyImagePath(item.path)">
									<Icon name="ph:copy-bold" />
									<span>复制</span>
								</button>
								<button class="danger" title="暂存删除这张图片" type="button" @click="removeLibraryImage(item.path)">
									<Icon name="ph:trash-bold" />
									<span>删除</span>
								</button>
							</div>
						</figure>
						<p v-if="!galleryImages.length" class="empty-text">
							{{ isLoadingImages ? '正在读取图片…' : repoImages.length ? '没有匹配的图片' : '仓库中还没有已上传的图片' }}
						</p>
					</div>
				</div>

				<div v-else-if="activeDialog === 'treasure'" class="dialog-content publish-source-form">
					<p class="manager-hint">
						直接编辑 <code>data/treasure.yml</code>。封面图可先用图片库上传，再填入 <code>/images/...</code> 路径。
					</p>
					<textarea
						v-model="treasureSource"
						:disabled="isLoadingTreasure"
						aria-label="藏宝阁 YAML"
						placeholder="正在读取藏宝阁数据..."
						spellcheck="false"
					/>
					<div class="manager-actions">
						<button class="secondary-button" :disabled="!canUseGithub || isLoadingTreasure" type="button" @click="openTreasureDialog">
							<Icon :name="isLoadingTreasure ? 'line-md:loading-twotone-loop' : 'ph:arrow-clockwise-bold'" />
							<span>{{ isLoadingTreasure ? '读取中' : '重新读取' }}</span>
						</button>
						<button class="publish-button" :disabled="!canUseGithub || isLoadingTreasure" type="button" @click="stageTreasure">
							<Icon name="ph:tray-arrow-down-bold" />
							<span>暂存藏宝阁</span>
						</button>
					</div>
				</div>

				<div v-else-if="activeDialog === 'weekly'" class="dialog-content publish-source-form">
					<label>
						<span>文件名</span>
						<input v-model.trim="weeklyFileName" placeholder="2026-08-27-issue-003">
						<small>会保存为 <code>{{ weeklyFilePath }}</code></small>
					</label>
					<label>
						<span>完整周报 Markdown</span>
						<textarea v-model="weeklyDocument" aria-label="完整周报 Markdown" placeholder="粘贴包含 YAML frontmatter 的完整周报文档" spellcheck="false" />
					</label>
					<div class="manager-actions">
						<button class="publish-button" :disabled="!canUseGithub" type="button" @click="stageWeekly">
							<Icon name="ph:tray-arrow-down-bold" />
							<span>暂存周报</span>
						</button>
					</div>
				</div>

				<div v-else-if="activeDialog === 'log'" class="dialog-content manager-content">
					<div class="manager-list log-manager-list">
						<div v-for="(entry, index) in logEntries" :key="index" class="manager-row log-row">
							<label>
								<span>日期</span>
								<input v-model.trim="entry.label" placeholder="2026-08-02">
							</label>
							<label>
								<span>内容</span>
								<input v-model.trim="entry.value" placeholder="例如：新增图片库">
							</label>
							<button class="icon-button danger-button" :disabled="isSavingLog" title="删除这条日志" type="button" @click="removeLogEntry(index)">
								<Icon name="ph:trash-bold" />
							</button>
						</div>
						<p v-if="!logEntries.length" class="empty-text">
							{{ isLoadingLog ? '正在读取更新日志…' : '还没有更新日志，先在下方新增一条' }}
						</p>
					</div>
					<div class="log-create-row">
						<label>
							<span>日期</span>
							<input v-model.trim="logDraft.label" placeholder="2026-08-02">
						</label>
						<label>
							<span>内容</span>
							<input v-model.trim="logDraft.value" placeholder="例如：新增图片库" @keyup.enter="addLogEntry">
						</label>
						<button class="secondary-button" :disabled="!logDraft.label.trim() || !logDraft.value.trim() || isSavingLog" type="button" @click="addLogEntry">
							<Icon name="ph:plus-bold" />
							<span>新增一条</span>
						</button>
					</div>
					<div class="manager-footer">
						<small class="manager-hint">编辑的是归档页“更新日志”卡片，新增时按日期自动排序。</small>
						<button class="secondary-button" :disabled="!canUseGithub || isLoadingLog || isSavingLog" type="button" @click="saveLogConfig">
							<Icon :name="isSavingLog ? 'line-md:loading-twotone-loop' : 'ph:floppy-disk-bold'" />
							<span>{{ isSavingLog ? '暂存中' : '暂存更新日志' }}</span>
						</button>
					</div>
				</div>

				<div v-else-if="activeDialog === 'site'" class="dialog-content site-form">
					<label>
						<span>建站时间</span>
						<input v-model.trim="siteForm.timeEstablished" placeholder="2026-03-16 21:00:00">
						<small>用于“博客统计”卡片的运营时长计算。</small>
					</label>
					<label>
						<span>生日年份</span>
						<input v-model.number="siteForm.birthYear" min="1900" step="1" type="number">
						<small>用于归档页面每年标题旁的年龄显示。</small>
					</label>
					<label>
						<span>字数标语</span>
						<input v-model.trim="siteForm.wordCount" placeholder="持续更新中">
						<small>“博客统计”卡片的预置文本；文章数与字数由内容自动统计，无需手填。</small>
					</label>
					<div class="manager-actions">
						<button class="secondary-button" :disabled="!canUseGithub || isSavingSite" type="button" @click="saveSiteSettings">
							<Icon :name="isSavingSite ? 'line-md:loading-twotone-loop' : 'ph:floppy-disk-bold'" />
							<span>{{ isSavingSite ? '暂存中' : '暂存站点设置' }}</span>
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
					<label>
						<span>文章版式</span>
						<select v-model="form.type">
							<option v-for="type in Object.keys(blogConfig.article.types)" :key="type" :value="type">
								{{ type === 'memory' ? '网络记忆' : type === 'weekly' ? '周报' : type === 'story' ? '故事' : '技术' }}
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
						<span>{{ form.type === 'memory' ? '图片' : '封面图' }}</span>
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
						<button class="secondary-button" :disabled="!canUseGithub" type="button" @click="openImageLibrary('cover')">
							<Icon name="ph:images-bold" />
							<span>从图片库选择</span>
						</button>
						<small>可上传新图，或从已上传的图片中选择作为封面。</small>
					</div>
					<div v-if="coverPreviewSrc" class="cover-preview wide">
						<img :src="coverPreviewSrc" alt="封面图预览">
						<button class="secondary-button" type="button" @click="clearCoverImage">
							<Icon name="ph:trash-bold" />
							<span>移除封面</span>
						</button>
					</div>
					<label class="wide">
						<span>{{ form.type === 'memory' ? '描述（可选）' : '摘要' }}</span>
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
	align-items: flex-start;
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
	width: min(34rem, 100%);
}

.dialog-images {
	width: min(52rem, 100%);
}

.dialog-staged {
	width: min(40rem, 100%);
}

.dialog-site {
	width: min(30rem, 100%);
}

.topbar-actions {
	flex: 1 1 auto;
	flex-wrap: wrap;
	justify-content: flex-end;
}

.dialog-treasure,
.dialog-weekly {
	width: min(54rem, 100%);
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

.log-row {
	grid-template-columns: minmax(8rem, 0.4fr) minmax(12rem, 1fr) auto;
}

.log-create-row {
	display: grid;
	grid-template-columns: minmax(8rem, 0.4fr) minmax(12rem, 1fr) auto;
	align-items: end;
	gap: 0.65rem;
	padding-block-start: 0.75rem;
	border-block-start: 1px solid var(--c-border);
}

.manager-hint {
	align-self: center;
	margin-inline-end: auto;
	color: var(--c-text-3);
}

.publish-source-form {
	grid-template-rows: auto minmax(20rem, 1fr) auto;

	textarea {
		min-height: 20rem;
		font-family: var(--font-monospace);
		font-size: 0.86rem;
		line-height: 1.65;
		resize: vertical;
	}

	label:has(textarea) {
		min-height: 0;
	}

	label textarea {
		height: 100%;
	}
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

.warning-text {
	font-size: 0.78rem;
	color: var(--c-warning);
}

.delete-images-checking {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	font-size: 0.82rem;
	color: var(--c-text-2);
}

.delete-images-list {
	display: grid;
	gap: 0.5rem;
	width: 100%;
	text-align: start;

	> p {
		font-size: 0.82rem;
		color: var(--c-text-2);
	}
}

.delete-image-row {
	display: grid;
	grid-template-columns: auto 3.5rem minmax(0, 1fr);
	align-items: center;
	gap: 0.6rem;
	padding: 0.4rem 0.5rem;
	border: 1px solid var(--c-border);
	border-radius: 0.45rem;
	cursor: pointer;

	input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
	}

	img {
		width: 3.5rem;
		height: 2.5rem;
		border-radius: 0.3rem;
		background-color: var(--c-bg-1);
		object-fit: cover;
	}
}

.delete-image-info {
	display: grid;
	gap: 0.15rem;
	min-width: 0;

	code {
		overflow: hidden;
		font-size: 0.74rem;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	small {
		font-size: 0.72rem;
		color: var(--c-text-3);
	}
}

.staged-dialog-content {
	grid-template-rows: minmax(0, 1fr) auto auto;
	overflow: hidden;
}

.staged-list {
	display: grid;
	align-content: start;
	gap: 0.4rem;
	overflow: auto;
	min-height: 0;
	scrollbar-width: thin;
}

.staged-row {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto;
	align-items: center;
	gap: 0.6rem;
	padding: 0.45rem 0.6rem;
	border: 1px solid var(--c-border);
	border-radius: 0.45rem;
	background-color: var(--c-bg-1);

	code {
		overflow: hidden;
		font-size: 0.76rem;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}

.staged-type {
	flex: none;
	padding: 0.1rem 0.45rem;
	border-radius: 0.3rem;
	background-color: var(--c-primary-soft);
	font-size: 0.72rem;
	font-weight: 700;
	color: var(--c-primary);

	&.danger {
		background-color: var(--c-error-soft);
		color: var(--c-error);
	}
}

.images-dialog-content {
	display: flex;
	flex-direction: column;
	overflow: hidden;

	.image-grid {
		flex: 1;
		min-height: 0;
	}
}

.image-mode-hint {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	padding: 0.5rem 0.7rem;
	border: 1px solid var(--c-primary);
	border-radius: 0.45rem;
	background-color: var(--c-primary-soft);
	font-size: 0.82rem;
	font-weight: 700;
	color: var(--c-primary);
}

.folder-select {
	width: auto;
	min-width: 7rem;
	height: 2.45rem;
}

.image-manage-bar {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 0.5rem;

	.secondary-button {
		height: 2.1rem;
		padding-inline: 0.6rem;
		font-size: 0.78rem;
	}
}

.manage-bar-spacer {
	flex: 1;
}

.unused-toggle {
	display: inline-flex;
	align-items: center;
	flex-direction: row;
	gap: 0.35rem;
	font-size: 0.78rem;
	color: var(--c-text-2);
	cursor: pointer;

	input {
		width: 1rem;
		height: 1rem;
	}

	span {
		font-size: inherit;
	}
}

.image-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
	align-content: start;
	gap: 0.65rem;
	overflow: auto;
	min-height: 12rem;
	padding-inline-end: 0.2rem;
	scrollbar-width: thin;

	.empty-text {
		grid-column: 1 / -1;
	}
}

.image-card {
	display: grid;
	position: relative;
	gap: 0.35rem;
	overflow: hidden;
	padding: 0.45rem;
	border: 1px solid var(--c-border);
	border-radius: 0.45rem;
	background-color: var(--c-bg-1);

	&.selected {
		border-color: var(--c-primary);
		box-shadow: 0 0 0 2px var(--c-primary-soft);
	}

	&.clickable img {
		cursor: pointer;

		&:hover {
			outline: 2px solid var(--c-primary);
			outline-offset: -2px;
		}
	}

	img {
		width: 100%;
		height: 6rem;
		border-radius: 0.3rem;
		background-color: var(--ld-bg-card);
		object-fit: cover;
	}

	figcaption {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.4rem;
		overflow: hidden;
		font-size: 0.72rem;
		white-space: nowrap;
		color: var(--c-text-2);

		span {
			overflow: hidden;
			text-overflow: ellipsis;
		}

		small {
			flex: none;
			color: var(--c-text-3);
		}
	}
}

.image-select {
	display: grid;
	place-items: center;
	position: absolute;
	inset-block-start: 0.65rem;
	inset-inline-end: 0.65rem;
	width: 1.5rem;
	height: 1.5rem;
	border-radius: 0.3rem;
	background-color: #FFFC;
	cursor: pointer;
	z-index: 2;

	input {
		width: 1rem;
		height: 1rem;
	}
}

.image-badge {
	position: absolute;
	inset-block-start: 0.65rem;
	inset-inline-start: 0.65rem;
	padding: 0.08rem 0.4rem;
	border-radius: 0.3rem;
	background-color: var(--c-primary);
	font-size: 0.68rem;
	font-weight: 700;
	color: var(--c-bg);

	&.unused {
		background-color: var(--c-warning);
	}

	&.used {
		background-color: #0008;
		color: #FFF;
	}
}

.image-actions {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 0.25rem;

	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		min-height: 1.8rem;
		border: 1px solid var(--c-border);
		border-radius: 0.35rem;
		background-color: var(--ld-bg-card);
		font-size: 0.72rem;
		color: var(--c-text-2);

		&:hover {
			border-color: var(--c-primary);
			color: var(--c-primary);
		}

		&.danger:hover {
			border-color: var(--c-error);
			color: var(--c-error);
		}
	}
}

.site-form {
	label small {
		font-size: 0.72rem;
		color: var(--c-text-3);
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

	.topbar-actions {
		width: 100%;
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
	.log-row,
	.log-create-row,
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

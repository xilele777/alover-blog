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
	draft?: boolean
	name: string
	path: string
	sha?: string
	title: string
	date?: string
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

const settingsKey = 'blog-admin:github-settings'
const postsKey = 'blog-admin:posts'
const customCategoriesKey = 'blog-admin:custom-categories'
const quoteRegex = /['"]/g
const whitespaceRegex = /[\s_]+/g
const slugUnsafeRegex = /[^\p{L}\p{N}-]+/gu
const multiDashRegex = /-+/g
const trimDashRegex = /^-|-$/g
const tagSplitRegex = /[\s,，]+/
const fileUnsafeRegex = /[\\/:*?"<>|]/g
const fileWhitespaceRegex = /\s+/g
const newlineRegex = /\n/g
const encodedSlashRegex = /%2F/g
const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/
const mdExtensionRegex = /\.md$/
const contentPrefixRegex = /^content/
const bracketListRegex = /^\[(.*)\]$/
const surroundingQuoteRegex = /^["']|["']$/g
const contentPathRegex = /^content\/posts\/(\d{4})\/(.+)\.md$/
const githubRequestTimeout = 30000

const baseCategoryOptions = Object.keys(blogConfig.article.categories)
const defaultArticleType = Object.keys(blogConfig.article.types)[0] || 'tech'
const customCategoryOptions = ref<string[]>([])
const categoryOptions = computed(() => [...new Set([...baseCategoryOptions, ...customCategoryOptions.value])])
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
	date: '',
	updated: '',
	category: baseCategoryOptions.includes('技术') ? '技术' : baseCategoryOptions[0],
	customCategory: '',
	tags: '',
	type: defaultArticleType,
	draft: false,
	body: '',
})

const posts = ref<GithubPost[]>([])
const selectedPostPath = ref('')
const selectedPostSha = ref('')
const selectedPostOriginalPath = ref('')
const activeDialog = ref<'github' | 'posts' | 'meta' | null>(null)
const postSearch = ref('')
const postPage = ref(1)
const isLoadingPosts = ref(false)
const isLoadingPost = ref(false)
const isPublishing = ref(false)
const isHydratingForm = ref(false)
const statusMessage = ref('')
const errorMessage = ref('')
const publishResult = ref<PublishResult | null>(null)

useSeoMeta({
	title: '博客后台',
	description: '博客文章管理后台。',
})

const layoutStore = useLayoutStore()
layoutStore.setAside([])

onMounted(() => {
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

watch(() => [form.title, form.description, form.category, form.customCategory, form.tags, form.draft, form.body], () => {
	if (isHydratingForm.value || isPublishing.value)
		return
	form.updated = localDateTime()
}, { deep: true })

const repoPath = computed(() => `/repos/${settings.owner.trim()}/${settings.repo.trim()}`)
const selectedCategory = computed(() => form.category === '__custom' ? form.customCategory.trim() : form.category)
const tags = computed(() => form.tags.split(tagSplitRegex).map(tag => tag.trim()).filter(Boolean))
const postsPerPage = 5

const searchedPosts = computed(() => {
	const keyword = postSearch.value.trim().toLowerCase()
	if (!keyword)
		return posts.value
	return posts.value.filter(post => [
		post.title,
		post.category,
		post.date,
		post.path,
	].some(value => value?.toLowerCase().includes(keyword)))
})

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
const publishButtonText = computed(() => isEditingExisting.value ? '提交修改' : '提交新文章')
const postListRange = computed(() => {
	if (!searchedPosts.value.length)
		return '0 / 0'
	const start = (postPage.value - 1) * postsPerPage + 1
	const end = Math.min(start + postsPerPage - 1, searchedPosts.value.length)
	return `${start}-${end} / ${searchedPosts.value.length}`
})

const canUseGithub = computed(() => hasGithubSettings())

watch(postSearch, () => {
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
	if (selectedCategory.value)
		lines.push(`categories: [${yamlString(selectedCategory.value)}]`)
	if (tags.value.length)
		lines.push(`tags: [${tags.value.map(tag => yamlString(tag)).join(', ')}]`)
	if (form.type && form.type !== defaultArticleType)
		lines.push(`type: ${yamlString(form.type)}`)
	if (form.draft)
		lines.push('draft: true')

	lines.push('---', '', form.body.trimEnd(), '')
	return lines.join('\n')
})
const previewBody = computed(() => form.body.trim() || ' ')
const previewTypeClass = computed(() => getPostTypeClassName(form.type, { prefix: 'md' }))

function openDialog(dialog: 'github' | 'posts' | 'meta') {
	activeDialog.value = dialog
}

function closeDialog() {
	activeDialog.value = null
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
		if (Array.isArray(values))
			customCategoryOptions.value = values.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
	}
	catch {
		localStorage.removeItem(customCategoriesKey)
	}
}

function cacheCustomCategories() {
	localStorage.setItem(customCategoriesKey, JSON.stringify(customCategoryOptions.value))
}

function addCustomCategory(value: string) {
	const category = value.trim()
	if (!category || categoryOptions.value.includes(category))
		return
	customCategoryOptions.value = [...customCategoryOptions.value, category].sort((a, b) => a.localeCompare(b))
	cacheCustomCategories()
}

function confirmCustomCategory() {
	const category = form.customCategory.trim()
	if (!category)
		return
	addCustomCategory(category)
	form.category = category
	form.customCategory = ''
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
		draft: form.draft,
		name: path.split('/').at(-1) || path,
		path,
		sha,
		title: form.title.trim() || path.split('/').at(-1)?.replace(mdExtensionRegex, '') || path,
		date: form.date,
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
	return {
		category: typeof categories[0] === 'string' ? categories[0] : undefined,
		date: typeof meta.date === 'string' ? meta.date : undefined,
		draft: meta.draft === true,
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
	isHydratingForm.value = true
	selectedPostPath.value = ''
	selectedPostSha.value = ''
	selectedPostOriginalPath.value = ''
	Object.assign(form, {
		title: '',
		slug: defaultSlug(),
		description: '',
		date: localDateTime(),
		updated: localDateTime(),
		category: categoryOptions.value.includes('技术') ? '技术' : categoryOptions.value[0],
		customCategory: '',
		tags: '',
		type: defaultArticleType,
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

function encodeBase64(value: string) {
	const bytes = new TextEncoder().encode(value)
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
		return inner.split(tagSplitRegex).map(item => item.trim().replace(surroundingQuoteRegex, '')).filter(Boolean)
	}
	return trimmed.replace(surroundingQuoteRegex, '')
}

function parseMarkdownContent(value: string) {
	const matched = value.match(frontmatterRegex)
	if (!matched)
		return { body: value, meta: {} as Record<string, unknown> }

	const meta: Record<string, unknown> = {}
	for (const line of matched[1].split('\n')) {
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
	const { body, meta } = parseMarkdownContent(value)
	const categories = Array.isArray(meta.categories) ? meta.categories : []
	const firstCategory = typeof categories[0] === 'string' ? categories[0] : ''
	const tagsValue = Array.isArray(meta.tags) ? meta.tags.filter((tag): tag is string => typeof tag === 'string') : []

	Object.assign(form, {
		title: typeof meta.title === 'string' ? meta.title : '',
		description: typeof meta.description === 'string' ? meta.description : '',
		date: typeof meta.date === 'string' ? meta.date : localDateTime(),
		updated: typeof meta.updated === 'string' ? meta.updated : typeof meta.date === 'string' ? meta.date : localDateTime(),
		category: firstCategory && categoryOptions.value.includes(firstCategory) ? firstCategory : firstCategory ? '__custom' : categoryOptions.value[0],
		customCategory: firstCategory && !categoryOptions.value.includes(firstCategory) ? firstCategory : '',
		tags: tagsValue.join(', '),
		type: typeof meta.type === 'string' ? meta.type : defaultArticleType,
		draft: meta.draft === true,
		body: body.trimStart() || '## 从这里开始\n\n',
	})
	if (firstCategory && !categoryOptions.value.includes(firstCategory))
		addCustomCategory(firstCategory)
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

async function findExistingSha(path: string) {
	const result = await githubRequest<GithubContent>(
		`${repoPath.value}/contents/${encodePath(path)}?ref=${encodeURIComponent(settings.branch.trim())}`,
	).catch((error) => {
		if (String(error).includes('GitHub API 404'))
			return null
		throw error
	})
	return result?.sha
}

async function publishPost() {
	const invalidMessage = validatePublish()
	if (invalidMessage) {
		errorMessage.value = invalidMessage
		return
	}

	isPublishing.value = true
	clearMessages()
	statusMessage.value = isEditingExisting.value
		? `正在向 ${settings.branch.trim()} 分支提交修改...`
		: `正在向 ${settings.branch.trim()} 分支提交新文章...`
	form.updated = localDateTime()

	try {
		const targetPath = postPath.value
		let sha = !pathChanged.value && isEditingExisting.value ? selectedPostSha.value : undefined

		if (!sha)
			sha = await findExistingSha(targetPath)

		if (!sha && isEditingExisting.value && pathChanged.value)
			throw new Error('当前修改会改变文件路径。请先保持文件名和日期不变，或新建文章发布。')

		const result = await githubRequest<{
			content?: { html_url?: string, path?: string, sha?: string }
			commit?: { html_url?: string }
		}>(`${repoPath.value}/contents/${encodePath(targetPath)}`, {
			method: 'PUT',
			body: JSON.stringify({
				message: `${sha ? 'update' : 'add'} post: ${form.title.trim()}`,
				content: encodeBase64(markdown.value),
				branch: settings.branch.trim(),
				sha,
			}),
		})

		selectedPostPath.value = result.content?.path || targetPath
		selectedPostOriginalPath.value = selectedPostPath.value
		selectedPostSha.value = result.content?.sha || selectedPostSha.value
		publishResult.value = {
			commitUrl: result.commit?.html_url,
			htmlUrl: result.content?.html_url,
			path: result.content?.path || targetPath,
		}
		upsertPostListItem(selectedPostPath.value, selectedPostSha.value)
		cachePosts()
		statusMessage.value = '已生成 GitHub commit，GitHub Actions 会自动开始部署。'
	}
	catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
		statusMessage.value = ''
	}
	finally {
		isPublishing.value = false
	}
}
</script>

<template>
<div class="admin-page">
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
			<button class="secondary-button" type="button" @click="openDialog('meta')">
				<Icon name="ph:sliders-horizontal-bold" />
				<span>设置</span>
			</button>
			<button class="secondary-button" type="button" @click="resetForm">
				<Icon name="ph:file-plus-bold" />
				<span>新建</span>
			</button>
			<button class="publish-button" :disabled="isPublishing" type="button" @click="publishPost">
				<Icon :name="isPublishing ? 'line-md:loading-twotone-loop' : 'ph:paper-plane-tilt-bold'" />
				<span>{{ publishButtonText }}</span>
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
				<span>正文</span>
				<textarea v-model="form.body" spellcheck="false" />
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
						<Icon :name="activeDialog === 'github' ? 'ph:github-logo-bold' : activeDialog === 'posts' ? 'ph:files-bold' : 'ph:sliders-horizontal-bold'" />
						<h2>{{ activeDialog === 'github' ? 'GitHub 配置' : activeDialog === 'posts' ? '文章列表' : '文章设置' }}</h2>
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
					<div class="dialog-toolbar">
						<label class="search-field">
							<Icon name="ph:magnifying-glass-bold" />
							<input v-model.trim="postSearch" placeholder="搜索标题、分类、日期或路径">
						</label>
						<span class="post-count">{{ postListRange }}</span>
						<button class="secondary-button" :disabled="!canUseGithub || isLoadingPosts" type="button" @click="loadPosts">
							<Icon :name="isLoadingPosts ? 'line-md:loading-twotone-loop' : 'ph:arrow-clockwise-bold'" />
							<span>刷新</span>
						</button>
					</div>
					<div class="post-list dialog-post-list">
						<button
							v-for="post in pagedPosts"
							:key="post.path"
							class="post-item"
							:class="{ active: post.path === selectedPostPath }"
							:disabled="isLoadingPost"
							type="button"
							@click="loadPost(post.path); closeDialog()"
						>
							<span>{{ post.title }}</span>
							<small>
								<b v-if="post.category">{{ post.category }}</b>
								<b v-if="post.draft" class="draft-badge">草稿</b>
								<time v-if="post.date">{{ post.date }}</time>
							</small>
							<em>{{ post.path }}</em>
						</button>
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
					<div v-if="form.category === '__custom'" class="add-category-row">
						<label>
							<span>新分类</span>
							<input v-model.trim="form.customCategory" placeholder="例如：旅行">
						</label>
						<button class="secondary-button" :disabled="!form.customCategory.trim()" type="button" @click="confirmCustomCategory">
							<Icon name="ph:plus-bold" />
							<span>添加</span>
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
	grid-template-columns: minmax(34rem, 1fr) minmax(22rem, 0.45fr);
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
	grid-template-rows: auto minmax(0, 1fr) auto;
	overflow: hidden;
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
	gap: 0.45rem;
	min-height: 0;
}

.post-item {
	display: grid;
	gap: 0.2rem;
	min-height: 4.25rem;
	padding: 0.65rem 0.8rem;
	border: 1px solid transparent;
	border-radius: 0.45rem;
	background-color: var(--c-bg-1);
	text-align: start;
	color: var(--c-text-1);

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
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	span {
		font-weight: 700;
	}

	small {
		display: flex;
		gap: 0.5rem;
		font-size: 0.72rem;
		color: var(--c-text-3);

		b {
			font-weight: 700;
			color: var(--c-primary);
		}

		.draft-badge {
			color: var(--c-warning);
		}
	}

	em {
		font-family: var(--font-monospace);
		font-size: 0.7rem;
		font-style: normal;
		color: var(--c-text-3);
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

.add-category-row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: end;
	gap: 0.65rem;
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
}
</style>

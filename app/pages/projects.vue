<script setup lang="ts">
import projectsData from '~~/data/projects.yml'

const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
layoutStore.setAside(['blog-stats', 'github-contribution', 'github-stats'])

useSeoMeta({
	title: '项目',
	ogType: 'website',
	description: `${appConfig.title}的开源项目与作品展示。`,
})

interface GitHubRepo {
	name: string
	description: string | null
	html_url: string
	language: string | null
	topics: string[]
	archived: boolean
	pushed_at: string
	fork: boolean
	private: boolean
}

const githubConfig = projectsData.github

// GitHub 语言颜色映射
const languageColors: Record<string, string> = {
	'TypeScript': '#3178c6',
	'JavaScript': '#f1e05a',
	'Vue': '#41b883',
	'Python': '#3572A5',
	'Rust': '#dea584',
	'Go': '#00ADD8',
	'Java': '#b07219',
	'SCSS': '#c6538c',
	'CSS': '#563d7c',
	'HTML': '#e34c26',
	'Shell': '#89e051',
	'Dart': '#00B4AB',
	'Kotlin': '#A97BFF',
	'Swift': '#F05138',
	'Ruby': '#701516',
	'C': '#555555',
	'C++': '#f34b7d',
}

function getLanguageColor(lang: string | null): string {
	if (!lang)
		return 'var(--c-text-3)'
	return languageColors[lang] || 'var(--c-text-3)'
}

function formatRepoUpdatedAt(pushedAt: string): string {
	const rel = formatRelativeTime(pushedAt)
	return rel === '—' ? rel : `${rel}更新`
}

const { data: repos, pending } = await useAsyncData<GitHubRepo[]>(
	'github_repos',
	() => $fetch('/api/github/repos'),
	{
		default: () => [],
		lazy: true,
	},
)

const filteredRepos = computed(() => {
	if (!repos.value)
		return []
	return repos.value
		.filter(repo => !repo.archived)
		.filter(repo => githubConfig.include.includes(repo.name))
		.sort((a, b) => {
			const ta = new Date(a.pushed_at).getTime() || 0
			const tb = new Date(b.pushed_at).getTime() || 0
			return tb - ta
		})
})
</script>

<template>
<div class="projects proper-height">
	<div class="mobile-only">
		<BlogHeader to="/" suffix="项目" tag="h1" />
	</div>

	<header class="projects-header">
		<div>
			<h1 class="projects-title">
				项目
			</h1>
			<p class="projects-subtitle">
				我的开源项目与作品
			</p>
		</div>
		<UtilLink
			class="github-link"
			:to="`https://github.com/${githubConfig.username}`"
			target="_blank"
			rel="noopener"
			title="GitHub 主页"
		>
			<Icon name="ph:github-logo-bold" />
			<span>GitHub</span>
		</UtilLink>
	</header>

	<!-- GitHub 仓库 -->
	<section class="repos-section">
		<!-- 骨架屏 -->
		<div v-if="pending" class="repos-grid">
			<div v-for="i in 6" :key="i" class="skeleton-card">
				<div class="skeleton-row skeleton-lang" />
				<div class="skeleton-row skeleton-name" />
				<div class="skeleton-row skeleton-desc" />
			</div>
		</div>

		<TransitionGroup
			v-else-if="filteredRepos.length"
			tag="div"
			class="repos-grid"
			name="float-in"
		>
			<a
				v-for="repo, index in filteredRepos"
				:key="repo.name"
				class="repo-card"
				:href="repo.html_url"
				target="_blank"
				rel="noopener"
				:style="[getFixedDelay(index * 0.04), { '--lang-color': getLanguageColor(repo.language) }]"
			>
				<div class="repo-header">
					<span class="lang-dot" :style="{ backgroundColor: getLanguageColor(repo.language) }" />
					<span class="repo-name">{{ repo.name }}</span>
				</div>
				<p class="repo-desc">{{ repo.description || '暂无描述' }}</p>
				<div class="repo-meta">
					<span
						class="repo-badge"
						:class="{ 'badge-fork': repo.fork, 'badge-private': repo.private }"
					>
						<Icon :name="repo.fork ? 'ph:git-fork-bold' : repo.private ? 'ph:lock-bold' : 'ph:globe-bold'" />
						{{ repo.fork ? 'Fork' : repo.private ? '私有' : '公开' }}
					</span>
					<span class="repo-lang">
						<span class="lang-dot" :style="{ backgroundColor: getLanguageColor(repo.language) }" />
						{{ repo.language || '未知' }}
					</span>
					<span class="repo-time">
						<Icon name="ph:clock-bold" />
						{{ formatRepoUpdatedAt(repo.pushed_at) }}
					</span>
				</div>
			</a>
		</TransitionGroup>

		<ZError
			v-else-if="!pending"
			icon="ph:code-bold"
			title="暂无公开仓库"
		/>
	</section>
</div>
</template>

<style lang="scss" scoped>
.projects {
	padding: 1rem;
}

.projects-header {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 1em;
	margin-bottom: 2em;
}

.projects-title {
	margin: 0;
	font-size: 1.6em;
	font-weight: 800;
}

.projects-subtitle {
	margin: 0.2em 0 0;
	font-size: 0.9em;
	color: var(--c-text-3);
}

.github-link {
	display: flex;
	align-items: center;
	gap: 0.3em;
	padding: 0.3em 0.8em;
	border-radius: 0.5em;
	background-color: var(--c-bg-soft);
	font-size: 0.9em;
	color: var(--c-text-2);
	transition: color 0.2s, background-color 0.2s;

	&:hover {
		background-color: var(--c-primary-soft);
		color: var(--c-primary);
	}
}

// GitHub 仓库
.repos-section {
	margin-bottom: 2em;
}

.repos-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 0.8em;
}

.repo-card {
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	padding: 1em;
	border-radius: 0.75em;
	box-shadow: var(--box-shadow-2);
	background-color: var(--ld-bg-card);
	transition: transform 0.2s, box-shadow 0.2s;
	animation: float-in 0.2s var(--delay) backwards;

	&:hover {
		box-shadow: inset 3px 0 0 var(--lang-color), var(--box-shadow-3);
		transform: translateY(-3px);
	}
}

.repo-header {
	display: flex;
	align-items: center;
	gap: 0.5em;
}

.lang-dot {
	flex-shrink: 0;
	width: 10px;
	height: 10px;
	border-radius: 50%;
}

.repo-name {
	overflow: hidden;
	font-size: 0.95em;
	font-weight: 600;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.repo-desc {
	display: -webkit-box;
	overflow: hidden;
	margin: 0;
	font-size: 0.85em;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	color: var(--c-text-2);
	-webkit-box-orient: vertical;
}

.repo-meta {
	display: flex;
	align-items: center;
	gap: 0.6em;
	margin-top: auto;
	font-size: 0.8em;
	color: var(--c-text-3);
}

.repo-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.25em;
	padding: 0.15em 0.5em;
	border-radius: 1em;
	background-color: var(--c-bg-soft);
	line-height: 1.4;
	color: var(--c-text-2);

	&.badge-fork {
		background-color: var(--c-primary-soft);
		color: var(--c-primary);
	}

	&.badge-private {
		background-color: var(--c-warning-soft);
		color: var(--c-warning);
	}
}

.repo-lang {
	display: inline-flex;
	align-items: center;
	gap: 0.3em;

	.lang-dot {
		width: 8px;
		height: 8px;
	}
}

.repo-time {
	display: inline-flex;
	align-items: center;
	gap: 0.25em;
	margin-inline-start: auto;
	white-space: nowrap;
}

// 骨架屏
.skeleton-card {
	display: flex;
	flex-direction: column;
	gap: 0.6em;
	padding: 1em;
	border-radius: 0.75em;
	background-color: var(--c-bg-2);
}

.skeleton-row {
	border-radius: 0.3em;
	background: linear-gradient(90deg, var(--c-bg-3) 25%, var(--c-bg-2) 50%, var(--c-bg-3) 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
}

.skeleton-lang {
	width: 30%;
	height: 10px;
}

.skeleton-name {
	width: 70%;
	height: 14px;
}

.skeleton-desc {
	width: 90%;
	height: 12px;
}

@keyframes shimmer {
	0% { background-position: 200% 0; }
	100% { background-position: -200% 0; }
}

@media (max-width: $breakpoint-mobile) {
	.repos-grid {
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	}
}
</style>

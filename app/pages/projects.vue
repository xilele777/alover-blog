<script setup lang="ts">
import projectsData from '~~/data/projects.yml'

const appConfig = useAppConfig()
const layoutStore = useLayoutStore()
layoutStore.setAside(['blog-stats'])

useSeoMeta({
	title: '项目',
	ogType: 'website',
	description: `${appConfig.title}的开源项目与作品展示。`,
})

interface PinnedProject {
	title: string
	description: string
	link: string
	cover?: string
	tags?: string[]
	icon?: string
}

interface GitHubRepo {
	name: string
	description: string | null
	html_url: string
	stargazers_count: number
	forks_count: number
	language: string | null
	topics: string[]
	archived: boolean
}

const pinned = projectsData.pinned as PinnedProject[]
const githubConfig = projectsData.github

// GitHub 语言颜色映射
const languageColors: Record<string, string> = {
	TypeScript: '#3178c6',
	JavaScript: '#f1e05a',
	Vue: '#41b883',
	Python: '#3572A5',
	Rust: '#dea584',
	Go: '#00ADD8',
	Java: '#b07219',
	'SCSS': '#c6538c',
	CSS: '#563d7c',
	HTML: '#e34c26',
	Shell: '#89e051',
	Dart: '#00B4AB',
	Kotlin: '#A97BFF',
	Swift: '#F05138',
	Ruby: '#701516',
	C: '#555555',
	'C++': '#f34b7d',
}

function getLanguageColor(lang: string | null): string {
	if (!lang) return 'var(--c-text-3)'
	return languageColors[lang] || 'var(--c-text-3)'
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
	if (!repos.value) return []
	return repos.value
		.filter(repo => !repo.archived)
		.filter(repo => !githubConfig.exclude.includes(repo.name))
		.filter(repo => !pinned.some(p => p.link === repo.html_url))
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

	<!-- 置顶项目 -->
	<section v-if="pinned.length" class="pinned-section">
		<h2 class="section-title">
			<Icon name="ph:pin-bold" />
			<span>精选项目</span>
		</h2>
		<div class="pinned-grid">
			<a
				v-for="project, index in pinned"
				:key="project.title"
				class="pinned-card gradient-card"
				:href="project.link"
				target="_blank"
				rel="noopener"
				:style="getFixedDelay(index * 0.05)"
			>
				<div class="pinned-cover">
					<NuxtImg
						v-if="project.cover"
						:src="project.cover"
						:alt="project.title"
						loading="lazy"
						class="cover-img"
					/>
					<Icon v-else :name="project.icon || 'ph:cube-bold'" class="pinned-icon" />
				</div>
				<div class="pinned-info">
					<span class="pinned-title">{{ project.title }}</span>
					<span class="pinned-desc">{{ project.description }}</span>
					<div v-if="project.tags" class="pinned-tags">
						<span v-for="tag in project.tags" :key="tag" class="tag-badge">{{ tag }}</span>
					</div>
				</div>
			</a>
		</div>
	</section>

	<!-- GitHub 仓库 -->
	<section class="repos-section">
		<h2 class="section-title">
			<Icon name="simple-icons:github" />
			<span>开源仓库</span>
		</h2>

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
				class="repo-card gradient-card"
				:href="repo.html_url"
				target="_blank"
				rel="noopener"
				:style="getFixedDelay(index * 0.04)"
			>
				<div class="repo-header">
					<span class="lang-dot" :style="{ backgroundColor: getLanguageColor(repo.language) }" />
					<span class="repo-name">{{ repo.name }}</span>
				</div>
				<p class="repo-desc">{{ repo.description || '暂无描述' }}</p>
				<div class="repo-stats">
					<span v-if="repo.stargazers_count" class="stat-item">
						<Icon name="ph:star-bold" />
						{{ repo.stargazers_count }}
					</span>
					<span v-if="repo.forks_count" class="stat-item">
						<Icon name="ph:git-fork-bold" />
						{{ repo.forks_count }}
					</span>
					<span v-if="repo.language" class="stat-item lang-name">{{ repo.language }}</span>
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

.section-title {
	display: flex;
	align-items: center;
	gap: 0.4em;
	margin-bottom: 1em;
	font-size: 1.2em;
	font-weight: 700;
	color: var(--c-text-1);

	> .iconify {
		font-size: 1.2em;
		color: var(--c-primary);
	}
}

// 置顶项目
.pinned-section {
	margin-bottom: 2.5em;
}

.pinned-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 1em;
}

.pinned-card {
	display: flex;
	gap: 1em;
	padding: 1em;
	border-radius: 0.5em;
	box-shadow: var(--box-shadow-2);
	background-color: var(--ld-bg-card);
	transition: transform 0.2s, box-shadow 0.2s;
	animation: float-in 0.2s var(--delay) backwards;
	overflow: hidden;

	&:hover {
		transform: translateY(-2px);
		box-shadow: var(--box-shadow-3);
	}
}

.pinned-cover {
	flex-shrink: 0;
	width: 64px;
	height: 64px;
	border-radius: 0.5em;
	background-color: var(--c-bg-soft);
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;

	.cover-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.pinned-icon {
		font-size: 2em;
		color: var(--c-primary);
	}
}

.pinned-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0.3em;
}

.pinned-title {
	font-weight: 700;
	font-size: 1.05em;
}

.pinned-desc {
	font-size: 0.9em;
	color: var(--c-text-2);
	display: -webkit-box;
	overflow: hidden;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
}

.pinned-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 0.4em;
	margin-top: 0.2em;
}

.tag-badge {
	padding: 0.15em 0.55em;
	border-radius: 1em;
	background-color: var(--c-bg-soft);
	font-size: 0.78em;
	color: var(--c-text-2);
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
	border-radius: 0.5em;
	box-shadow: var(--box-shadow-2);
	background-color: var(--ld-bg-card);
	transition: transform 0.2s, box-shadow 0.2s;
	animation: float-in 0.2s var(--delay) backwards;

	&:hover {
		transform: translateY(-2px);
		box-shadow: var(--box-shadow-3);
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
	font-weight: 600;
	font-size: 0.95em;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.repo-desc {
	margin: 0;
	font-size: 0.85em;
	color: var(--c-text-2);
	display: -webkit-box;
	overflow: hidden;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
}

.repo-stats {
	display: flex;
	align-items: center;
	gap: 1em;
	margin-top: auto;
	font-size: 0.8em;
	color: var(--c-text-3);
}

.stat-item {
	display: flex;
	align-items: center;
	gap: 0.3em;

	> .iconify {
		font-size: 1em;
	}
}

.lang-name {
	margin-inline-start: auto;
}

// 骨架屏
.skeleton-card {
	display: flex;
	flex-direction: column;
	gap: 0.6em;
	padding: 1em;
	border-radius: 0.5em;
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
	.pinned-grid {
		grid-template-columns: 1fr;
	}

	.repos-grid {
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	}
}
</style>

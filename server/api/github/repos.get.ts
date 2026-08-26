import process from 'node:process'

interface GitHubRepo {
	name: string
	description: string | null
	html_url: string
	stargazers_count: number
	forks_count: number
	language: string | null
	topics: string[]
	archived: boolean
	pushed_at: string
	fork: boolean
	private: boolean
}

export default cachedEventHandler(
	async () => {
		const username = 'xilele777'
		const token = process.env.GITHUB_TOKEN

		const headers: Record<string, string> = {
			Accept: 'application/vnd.github.v3+json',
		}

		if (token) {
			headers.Authorization = `Bearer ${token}`
		}

		const repos = await $fetch<GitHubRepo[]>(
			`https://api.github.com/users/${username}/repos`,
			{
				params: {
					sort: 'stars',
					direction: 'desc',
					per_page: 30,
				},
				headers,
			},
		)

		return repos
	},
	{
		maxAge: 24 * 60 * 60, // 24h 缓存
		name: 'github-repos',
		getKey: () => 'default',
	},
)

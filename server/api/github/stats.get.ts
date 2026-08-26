import process from 'node:process'

interface ContributionDay {
	date: string
	contributionCount: number
	contributionLevel: string
}

interface GqlResponse {
	data?: {
		user?: {
			contributionsCollection?: {
				contributionCalendar?: {
					totalContributions: number
					weeks: { contributionDays: ContributionDay[] }[]
				}
			}
			repositories?: {
				totalCount: number
				nodes: {
					stargazerCount: number
					isPrivate: boolean
					defaultBranchRef?: { target?: { history?: { totalCount: number } } }
				}[]
			}
		}
	}
	errors?: unknown[]
}

// 单次 GraphQL 查询：贡献日历（热力图）+ 仓库统计（总数/私有/star/commit）
const QUERY = /* GraphQL */ `
	query {
		user(login: "xilele777") {
			contributionsCollection {
				contributionCalendar {
					totalContributions
					weeks {
						contributionDays {
							date
							contributionCount
							contributionLevel
						}
					}
				}
			}
			repositories(ownerAffiliations: OWNER, first: 100) {
				totalCount
				nodes {
					stargazerCount
					isPrivate
					defaultBranchRef {
						target {
							... on Commit {
								history {
									totalCount
								}
							}
						}
					}
				}
			}
		}
	}
`

export default cachedEventHandler(
	async () => {
		const token = process.env.GITHUB_TOKEN
		if (!token)
			return null

		try {
			const json = await $fetch<GqlResponse>('https://api.github.com/graphql', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: { query: QUERY },
			})

			const calendar = json.data?.user?.contributionsCollection?.contributionCalendar
			const repos = json.data?.user?.repositories
			if (!calendar || !repos)
				return null

			return {
				contributions: {
					totalContributions: calendar.totalContributions,
					weeks: calendar.weeks,
				},
				stats: {
					repoTotal: repos.totalCount,
					repoPrivate: repos.nodes.filter(r => r.isPrivate).length,
					repoStarred: repos.nodes.filter(r => r.stargazerCount > 0).length,
					commitTotal: repos.nodes.reduce((sum, r) => sum + (r.defaultBranchRef?.target?.history?.totalCount || 0), 0),
				},
			}
		}
		catch {
			// GitHub 请求失败时降级，前端隐藏相关 widget
			return null
		}
	},
	{
		maxAge: 24 * 60 * 60, // 24h 缓存
		name: 'github-stats',
		getKey: () => 'default',
	},
)

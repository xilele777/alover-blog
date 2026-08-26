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
				commitContributionsByRepository: {
					contributions: {
						totalCount: number
						nodes: { occurredAt: string }[]
					}
				}[]
			}
			repositories?: {
				totalCount: number
			}
			starredRepositories?: { totalCount: number }
		}
	}
	errors?: unknown[]
}

// 单次 GraphQL 查询：贡献日历 + 仓库统计 + 本人提交贡献
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
				commitContributionsByRepository {
					repository { name }
					contributions(first: 100) {
						totalCount
						nodes { occurredAt }
					}
				}
			}
			repositories(ownerAffiliations: OWNER, first: 100) {
				totalCount
			}
			starredRepositories(first: 1) { totalCount }
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
			const starred = json.data?.user?.starredRepositories
			const commitContributions = json.data?.user?.contributionsCollection?.commitContributionsByRepository
			if (!calendar || !repos || !starred || !commitContributions)
				return null

			const commitTotal = commitContributions.reduce((sum, item) => sum + item.contributions.totalCount, 0)
			const recentCommitDate = commitContributions
				.flatMap(item => item.contributions.nodes.map(node => node.occurredAt))
				.sort()
				.at(-1) || null

			return {
				contributions: {
					totalContributions: calendar.totalContributions,
					weeks: calendar.weeks,
				},
				stats: {
					repoTotal: repos.totalCount,
					repoStarred: starred.totalCount,
					commitTotal,
					recentCommitDate,
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

/** /api/github/stats 接口返回结构（GraphQL 派生） */
export interface GithubContributionDay {
	date: string
	contributionCount: number
	contributionLevel: string
}

export interface GithubStatsResponse {
	contributions: {
		totalContributions: number
		weeks: { contributionDays: GithubContributionDay[] }[]
	}
	stats: {
		repoStarred: number
		commitTotal: number
	}
}

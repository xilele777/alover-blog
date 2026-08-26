/**
 * 将 ISO 时间字符串格式化为中文相对时间，如「刚刚」「3 天前」「2 天后」。
 * 未来时间输出「x 分钟后/后/天」，非法或空值返回占位符「—」。
 */
export function formatRelativeTime(iso?: string | null): string {
	if (!iso)
		return '—'

	const time = new Date(iso).getTime()
	if (Number.isNaN(time))
		return '—'

	const diff = Math.abs(Date.now() - time)
	const future = Date.now() < time
	if (diff < 60_000)
		return '刚刚'

	const suffix = future ? '后' : '前'
	const minutes = Math.floor(diff / 60_000)
	if (minutes < 60)
		return `${minutes} 分钟${suffix}`

	const hours = Math.floor(minutes / 60)
	if (hours < 24)
		return `${hours} 小时${suffix}`

	const days = Math.floor(hours / 24)
	if (days < 30)
		return `${days} 天${suffix}`

	const months = Math.floor(days / 30)
	if (months < 12)
		return `${months} 个月${suffix}`

	const years = Math.floor(days / 365)
	return `${years} 年${suffix}`
}

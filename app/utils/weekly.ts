import type { Temporal } from 'temporal-polyfill'
import { toZonedTemporal } from '~~/shared/utils/time'

/** 周报文章所在目录，用作查询与过滤的硬边界 */
export const WEEKLY_STEM_PREFIX = 'posts/weekly/'

/**
 * 周报文章的 URL 前缀。
 * `hidePostPrefix` 会在 `content:file:afterParse` 中剥离 `/posts`，
 * 因此 path 为 `/weekly/...` 而非 `/posts/weekly/...`。
 * @see nuxt.config.ts
 */
export const WEEKLY_PATH_PREFIX = '/weekly/'

/** 匹配标题中的三位期号，如 `#001` */
const ISSUE_RE = /#(\d+)/
/**
 * 匹配标题中的日期区间，如 `（2026.08.13 - 08.19）`。
 * 日期部分约定为点分或斜杠分隔；字符类刻意排除空白与连字符，
 * 使其与两侧的 `\s*`、分隔符互不重叠，避免歧义回溯。
 */
const RANGE_RE = /[（(]\s*([\d./]+)\s*[-–—~]\s*([\d./]+)\s*[）)]/
/** 匹配日期开头的年份，如 `2026.` */
const YEAR_PREFIX_RE = /^\d{4}[./]/

export interface WeeklyIssue {
	/** 期号，解析失败时为 undefined */
	issue?: string
	/** 日期区间，形如 `08.13 ~ 08.19` */
	range?: string
	/** 剥离期号与日期区间后的标题 */
	displayTitle: string
}

/**
 * 去掉日期开头的年份。
 * 列表按时间倒序排列，年份在区间里是噪声，占掉的横向空间留给摘要更值。
 */
function trimYear(value: string) {
	return value.replace(YEAR_PREFIX_RE, '')
}

function formatMonthDay(date: Temporal.PlainDate) {
	return `${String(date.month).padStart(2, '0')}.${String(date.day).padStart(2, '0')}`
}

/** 由文章日期反推覆盖区间：发布日之前的 7 天 */
function getWeekRange(date?: string) {
	if (!date)
		return
	try {
		const plain = toZonedTemporal(date).toPlainDate()
		const start = plain.subtract({ days: 7 })
		const end = plain.subtract({ days: 1 })
		return `${formatMonthDay(start)} ~ ${formatMonthDay(end)}`
	}
	catch {
		return undefined
	}
}

/**
 * 从周报标题中解析期号与日期区间。
 * 标题格式约定为 `AI 前沿周报 #001（2026.08.13 - 08.19）`，
 * 任一部分解析失败都优雅降级，不影响其余字段。
 */
export function parseWeekly(title?: string, date?: string): WeeklyIssue {
	const rawTitle = title?.trim() || ''
	const issue = rawTitle.match(ISSUE_RE)?.[1]
	const rangeMatch = rawTitle.match(RANGE_RE)

	// 标题中已写明区间时优先采用，否则按 date 反推所在周
	const range = rangeMatch
		? `${trimYear(rangeMatch[1]!)} ~ ${trimYear(rangeMatch[2]!)}`
		: getWeekRange(date)

	const displayTitle = rawTitle
		.replace(RANGE_RE, '')
		.replace(ISSUE_RE, '')
		.trim()

	return {
		issue,
		range,
		displayTitle: displayTitle || rawTitle,
	}
}

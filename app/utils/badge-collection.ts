export interface CollectionBadge {
	id: string
	name: string
	image: string
	description: string
	date: string
	category?: string
	demo?: boolean
}

export const badgeCollectionPath = 'data/badges.json'
const badgeImagePattern = /^\/images\/badges\/[\w-]+\.svg$/
const badgeIdPattern = /^[\w-]+$/
const badgeDatePattern = /^\d{4}-\d{2}-\d{2}$/

export function parseBadgeCollection(source: string): CollectionBadge[] {
	const data: unknown = JSON.parse(source)
	if (!Array.isArray(data))
		throw new TypeError('徽章数据必须是列表。')
	const ids = new Set<string>()
	return data.map((item, index) => {
		const prefix = `第 ${index + 1} 枚徽章`
		if (!item || typeof item !== 'object')
			throw new TypeError(`${prefix}格式不正确。`)
		for (const key of ['id', 'name', 'image', 'description', 'date']) {
			if (typeof item[key] !== 'string' || !item[key].trim())
				throw new TypeError(`${prefix}的${({ id: '标识', name: '名称', image: 'SVG 图片', description: '详情', date: '获得日期' } as Record<string, string>)[key]}不能为空。`)
		}
		if (!badgeIdPattern.test(item.id) || ids.has(item.id))
			throw new TypeError(`${prefix}的标识无效或重复。`)
		if (!badgeImagePattern.test(item.image))
			throw new TypeError(`${prefix}需要使用徽章目录中的 SVG 文件。`)
		const date = new Date(`${item.date}T00:00:00Z`)
		if (!badgeDatePattern.test(item.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== item.date)
			throw new TypeError(`${prefix}的获得日期无效。`)
		if (item.demo !== undefined && typeof item.demo !== 'boolean')
			throw new TypeError(`${prefix}的演示标识无效。`)
		if (item.category !== undefined && (typeof item.category !== 'string' || item.category.trim().length > 30))
			throw new TypeError(`${prefix}的分类必须是 30 字以内的文字。`)
		ids.add(item.id)
		return { ...item, name: item.name.trim(), description: item.description.trim(), category: item.category?.trim() || undefined } as CollectionBadge
	})
}

export function getBadgeStats(collection: CollectionBadge[]) {
	const acquired = collection.filter(badge => !badge.demo)
	const counts = new Map<string, number>()
	for (const badge of acquired) {
		const category = badge.category || '未分类'
		counts.set(category, (counts.get(category) || 0) + 1)
	}
	return {
		acquired: acquired.length,
		categories: Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
		recent: acquired.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
	}
}

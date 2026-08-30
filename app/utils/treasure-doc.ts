import { parse, stringify } from 'yaml'

/**
 * 藏宝阁数据文件的解析与写回。
 *
 * `data/treasure.yml` 是藏宝阁唯一的数据源，后台表单编辑后需要整体序列化写回，
 * 因此这里不做正则修补，而是完整 parse → 修改 → stringify，
 * 由 yaml 库负责引号、转义、特殊字符等边界情况。
 */

export interface TreasureItem {
	title: string
	cover: string
	link: string
	description?: string
	rating?: number
}

export interface TreasureCategory {
	name: string
	icon: string
	items: TreasureItem[]
}

export interface TreasureDoc {
	categories: TreasureCategory[]
}

/** 条目字段的输出顺序，与仓库中既有写法保持一致 */
const ITEM_KEYS = ['title', 'cover', 'link', 'description', 'rating'] as const

function toText(value: unknown) {
	return typeof value === 'string' ? value.trim() : ''
}

/** 评分允许 4.5 这类半星，非法值一律丢弃而不是写成 NaN */
function toRating(value: unknown) {
	const rating = typeof value === 'string' ? Number(value) : value
	if (typeof rating !== 'number' || !Number.isFinite(rating))
		return undefined
	return rating
}

function normalizeItem(raw: unknown): TreasureItem {
	const source = (raw ?? {}) as Record<string, unknown>
	const item: TreasureItem = {
		title: toText(source.title),
		cover: toText(source.cover),
		link: toText(source.link),
	}
	const description = toText(source.description)
	if (description)
		item.description = description
	const rating = toRating(source.rating)
	if (rating !== undefined)
		item.rating = rating
	return item
}

function normalizeCategory(raw: unknown): TreasureCategory {
	const source = (raw ?? {}) as Record<string, unknown>
	return {
		name: toText(source.name),
		icon: toText(source.icon),
		items: Array.isArray(source.items) ? source.items.map(normalizeItem) : [],
	}
}

/**
 * 解析藏宝阁 YAML。
 * 结构不符合预期时抛错，交由调用方回退到源码模式，避免静默丢数据。
 */
export function parseTreasureDoc(text: string): TreasureDoc {
	const data = parse(text) as unknown
	if (!data || typeof data !== 'object')
		throw new TypeError('藏宝阁 YAML 内容为空或格式不正确。')

	const categories = (data as Record<string, unknown>).categories
	if (!Array.isArray(categories))
		throw new TypeError('藏宝阁 YAML 缺少 categories 列表。')

	return { categories: categories.map(normalizeCategory) }
}

/**
 * 序列化回 YAML。
 * `lineWidth: 0` 关闭自动折行，让长简介保持单行，避免每次保存产生大片无谓 diff。
 */
export function serializeTreasureDoc(doc: TreasureDoc): string {
	const plain = {
		categories: doc.categories.map(category => ({
			name: category.name,
			icon: category.icon,
			items: category.items.map((item) => {
				const output: Record<string, unknown> = {}
				for (const key of ITEM_KEYS) {
					const value = item[key]
					// 空简介、空评分直接省略，与既有文件写法一致；
					// 表单里清空数字输入框会得到 '' 或 NaN，这里一并挡掉
					if (value === undefined || value === '')
						continue
					if (typeof value === 'number' && !Number.isFinite(value))
						continue
					output[key] = value
				}
				return output
			}),
		})),
	}

	return stringify(plain, { lineWidth: 0, singleQuote: false })
}

export function createTreasureItem(): TreasureItem {
	return { title: '', cover: '', link: '' }
}

export function createTreasureCategory(): TreasureCategory {
	return { name: '', icon: 'ph:star-bold', items: [] }
}

/** 就地交换数组两项，用于分类与条目的上移 / 下移 */
export function moveArrayItem<T>(list: T[], index: number, offset: number) {
	const target = index + offset
	if (index < 0 || target < 0 || index >= list.length || target >= list.length)
		return
	const [moved] = list.splice(index, 1)
	list.splice(target, 0, moved!)
}

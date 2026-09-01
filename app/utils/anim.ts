import { toArray } from '@vueuse/core'

interface Rect {
	left: number | string
	top: number | string
	width: number | string
	height: number | string
}

type MaybeArray<T> = T | T[]

function toRect(rect: Element | Rect): Rect {
	return rect instanceof Element ? rect.getBoundingClientRect() : rect
}

const ensurePx = (val: number | string) => typeof val === 'number' ? `${val}px` : val

export function animateBetweenRects(
	el: MaybeRefOrGetter<Element>,
	rect: MaybeArray<MaybeRefOrGetter<Element> | Rect>,
	options?: KeyframeAnimationOptions,
) {
	const rects = toArray(rect).map(r => toRect(toValue(r)))

	return toValue(el).animate(rects.map(r => ({
		left: ensurePx(r.left),
		top: ensurePx(r.top),
		width: ensurePx(r.width),
		height: ensurePx(r.height),
	})), {
		duration: 100,
		fill: 'forwards',
		...options,
	})
}

/** 列表错峰的单步间隔（秒）与封顶下标 */
const STAGGER_STEP = 0.04
const STAGGER_MAX_INDEX = 8

/** 按秒设置错峰延迟。用于非列表场景，如逐字动画的相位偏移（允许负值） */
export const getStagger = (s: number, fixed = 2) => ({ '--stagger': `${s.toFixed(fixed)}s` })

/**
 * 按列表下标设置错峰延迟，超过封顶下标后不再递增。
 * 不封顶时第 20 项要等 1 秒，翻页后下半屏会长时间空白。
 */
export const getListStagger = (index: number) => getStagger(Math.min(index, STAGGER_MAX_INDEX) * STAGGER_STEP)

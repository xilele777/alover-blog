export function useAnalytics() {
	/**
	 * 百度统计自定义事件
	 * @param category 事件分类，例如 'button'
	 * @param action 事件操作，例如 'click'
	 * @param label 事件标签，例如 'search'
	 * @param value 事件值，可选
	 */
	function trackEvent(category: string, action: string, label?: string, value?: number) {
		if (process.client && window._hmt) {
			const params: any[] = ['_trackEvent', category, action]
			if (label) params.push(label)
			if (value) params.push(value)
			window._hmt.push(params)
		}
	}

	return {
		trackEvent,
	}
}

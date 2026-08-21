export function useAnalytics() {
	/**
	 * Umami 自定义事件
	 * @param name 事件名称
	 * @param data 事件数据，可选
	 */
	function trackEvent(name: string, data?: Record<string, unknown>) {
		if (import.meta.client && window.umami)
			window.umami.track(name, data)
	}

	return {
		trackEvent,
	}
}

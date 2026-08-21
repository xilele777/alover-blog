declare global {
	interface Window {
		twikoo?: {
			init: (options: {
				envId: string
				el: string
				region?: string
				path?: string
				lang?: string
			}) => void
			version: string
		}
		umami?: {
			track: (name: string, data?: Record<string, unknown>) => void
		}
	}
}

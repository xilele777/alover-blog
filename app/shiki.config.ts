import type { BundledLanguage, CodeToHastOptions } from 'shiki'
import { defineConfig } from '#shiki/config'

type CustomTransformerOptions = Array<
	| 'ignoreColorizedBrackets'
	| 'ignoreRenderWhitespace'
	| 'ignoreRenderIndentGuides'
>
type ShikiOptions = CodeToHastOptions<BundledLanguage, string>

export async function getShikiOptions(lang: string, transformerOptions?: CustomTransformerOptions, extraShikiOptions?: Omit<ShikiOptions, 'lang'>): Promise<ShikiOptions> {
	// 转换器约 187 KiB，只有真正渲染代码块时才用得到。
	// 静态引入会让它被 Prose 组件带进 entry 图，在无代码块的页面（如首页）
	// 也被 modulepreload；改为动态引入后仅在首次高亮时才下载。
	const [{ transformerColorizedBrackets }, {
		transformerNotationDiff,
		transformerNotationErrorLevel,
		transformerNotationFocus,
		transformerNotationHighlight,
		transformerNotationWordHighlight,
		transformerRenderIndentGuides,
		transformerRenderWhitespace,
	}] = await Promise.all([
		import('@shikijs/colorized-brackets'),
		import('@shikijs/transformers'),
	])

	return {
		...useShikiStore().options,
		lang,
		transformers: [
			transformerNotationDiff(),
			transformerNotationHighlight(),
			transformerNotationWordHighlight(),
			transformerNotationFocus(),
			transformerNotationErrorLevel(),
			transformerOptions?.includes('ignoreRenderIndentGuides') || ['ansi', 'log', 'text'].includes(lang)
				? {}
				: transformerRenderIndentGuides(),
			transformerOptions?.includes('ignoreRenderWhitespace') || ['ansi', 'log', 'text'].includes(lang)
				? {}
				: transformerRenderWhitespace(),
			transformerOptions?.includes('ignoreColorizedBrackets')
				? {}
				: transformerColorizedBrackets(),
			{
				root: hast => ({
					type: 'root',
					children: (hast.children[0] as any).children[0].children,
				}),
				line(node, line) {
					node.properties['data-line'] = line
				},
			},
		],
		...extraShikiOptions,
	}
}

export default defineConfig({
	themes: {
		light: () => import('shiki/themes/catppuccin-latte.mjs'),
		dark: () => import('shiki/themes/one-dark-pro.mjs'),
	},
})

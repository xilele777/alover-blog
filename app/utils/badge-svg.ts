const forbiddenSvgElements = new Set(['script', 'foreignobject', 'iframe', 'object', 'embed', 'animate', 'animatemotion', 'animatetransform', 'set'])
const svgDeclarationPattern = /<!DOCTYPE|<!ENTITY/i
const svgCssImportPattern = /@import|expression\s*\(|\\|\/\*/i
const svgCssUrlPattern = /url\(([^)]*)\)/gi
const svgCssUrlStartPattern = /url\(/i
const svgCssQuotePattern = /^['"]|['"]$/g
const svgEmbeddedImagePattern = /^data:image\/(?:png|jpeg|webp);base64,[a-z\d+/=\s]+$/i

/** 上传的 SVG 将作为公开静态文件发布，因此拒绝脚本、事件和外部资源。 */
export function validateBadgeSvg(source: string) {
	if (svgDeclarationPattern.test(source))
		throw new Error('请使用不含 DOCTYPE 或实体声明的 SVG。')
	const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
	const root = doc.documentElement
	if (doc.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI !== 'http://www.w3.org/2000/svg')
		throw new Error('文件不是有效的 SVG 图片。')
	const instructions = doc.createTreeWalker(doc, NodeFilter.SHOW_PROCESSING_INSTRUCTION)
	if (instructions.nextNode())
		throw new Error('SVG 不支持外部样式处理指令。')

	function checkCss(value: string) {
		if (svgCssImportPattern.test(value))
			throw new Error('SVG 不能包含外部或动态样式。')
		for (const match of value.matchAll(svgCssUrlPattern)) {
			if (!match[1]?.trim().replace(svgCssQuotePattern, '').startsWith('#'))
				throw new Error('SVG 样式只能引用图片内部的渐变或图形。')
		}
	}

	for (const element of [root, ...root.querySelectorAll('*')]) {
		if (element.namespaceURI !== root.namespaceURI || forbiddenSvgElements.has(element.localName.toLowerCase()))
			throw new Error('请上传静态 SVG，不能包含脚本、嵌入网页或动画。')
		if (element.localName === 'style')
			checkCss(element.textContent || '')
		for (const attribute of element.attributes) {
			const name = attribute.localName.toLowerCase()
			if (name.startsWith('on') || name === 'base')
				throw new Error('SVG 不能包含事件处理或外部基地址。')
			const value = attribute.value.trim()
			if (name === 'href' && value && !value.startsWith('#') && !svgEmbeddedImagePattern.test(value))
				throw new Error('SVG 不能引用外部链接或资源，请先将图形嵌入文件。')
			if (name === 'style' || svgCssUrlStartPattern.test(value))
				checkCss(value)
		}
	}
}

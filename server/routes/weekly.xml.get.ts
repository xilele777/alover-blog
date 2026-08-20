import type { ContentCollectionItem } from '@nuxt/content'
import { XMLBuilder } from 'fast-xml-parser'
import { pascal } from 'radash'
import { Temporal } from 'temporal-polyfill'
import { joinURL, withLeadingSlash, withTrailingSlash } from 'ufo'
import blogConfig from '~~/blog.config'
import packageJson from '~~/package.json'
import { toZonedTemporal } from '~~/shared/utils/time'

const runtimeConfig = useRuntimeConfig()
const siteUrl = new URL(blogConfig.url)
const sitePath = withLeadingSlash(withTrailingSlash(siteUrl.pathname))

const WEEKLY_FEED_DESCRIPTION = '每周一期的 AI 前沿快讯总结，覆盖模型发布、工具产品、论文研究与行业动向。'

const builder = new XMLBuilder({
	attributeNamePrefix: '$',
	cdataPropName: '$',
	format: true,
	ignoreAttributes: false,
	textNodeName: '_',
})

function formatIsoDate(date?: string) {
	if (!date)
		return
	try {
		return toZonedTemporal(date).toInstant().toString()
	}
	catch {
		console.error('Invalid date format', date)
		return date
	}
}

function getUrl(path: string | undefined) {
	if (!path)
		return blogConfig.url
	if (path.includes('://'))
		return path
	return new URL(joinURL(sitePath, path), siteUrl.origin).toString()
}

function renderContent(post: ContentCollectionItem) {
	return [
		post.image && `<img src="${post.image}" alt="${post.title}" />`,
		post.description && `<p>${post.description}</p>`,
		`<a class="view-full" href="${getUrl(post.path)}" target="_blank">点击查看全文</a>`,
	].join(' ')
}

export default defineEventHandler(async (event) => {
	const posts = await queryCollection(event, 'content')
		.where('stem', 'LIKE', 'posts/weekly/%')
		.where('draft', '=', false)
		.order('updated', 'DESC')
		.limit(blogConfig.feed.limit)
		.all()

	const entries = posts.map(post => ({
		id: getUrl(post.path),
		title: post.title ?? '',
		updated: formatIsoDate(post.updated),
		author: { name: post.author || blogConfig.author.name },
		content: {
			$type: 'html',
			$: renderContent(post),
		},
		link: { $href: getUrl(post.path) },
		summary: post.description,
		category: { $term: post.categories?.[0] },
		published: formatIsoDate(post.published ?? post.date),
	}))

	const feed = {
		$xmlns: 'http://www.w3.org/2005/Atom',
		id: getUrl('weekly'),
		title: `${blogConfig.title} · AI 前沿周报`,
		updated: runtimeConfig.public.buildTime,
		description: WEEKLY_FEED_DESCRIPTION, // RSS 2.0
		author: {
			name: blogConfig.author.name,
			email: blogConfig.author.email,
			uri: blogConfig.author.homepage,
		},
		link: [
			{ $href: getUrl('weekly.xml'), $rel: 'self' },
			{ $href: getUrl('weekly'), $rel: 'alternate' },
		],
		language: blogConfig.language, // RSS 2.0
		generator: {
			$uri: 'https://github.com/L33Z22L11/blog-v3',
			$version: packageJson.version,
			_: pascal(packageJson.name),
		},
		icon: getUrl(blogConfig.favicon),
		logo: getUrl(blogConfig.author.avatar), // Ratio should be 2:1
		rights: `© ${Temporal.Now.plainDateISO().year.toString()} ${blogConfig.author.name}`,
		subtitle: WEEKLY_FEED_DESCRIPTION,
		entry: entries,
	}

	return builder.build({
		'?xml': { $version: '1.0', $encoding: 'UTF-8' },
		'?xml-stylesheet': blogConfig.feed.enableStyle ? { $type: 'text/xsl', $href: getUrl('assets/atom.xsl') } : undefined,
		feed,
	})
})

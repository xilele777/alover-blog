const basicConfig = {
	title: '小锅巴',
	subtitle: '博客',
	// 长 description 利好于 SEO
	description: '这是我的个人博客，用于记录自己的学习与生活。在非个人干涉的情况下，博客具有接近匿名的特性，因此我把它当作一个私人的记事本。分享技术文章、音乐欣赏、生活感悟和学习笔记，涵盖前端开发、计算机科学、古典音乐、民族器乐等内容。',
	author: {
		name: '小锅巴',
		avatar: '/avatar.jpg',
		email: 'xiaoguoba6@gmail.com',
		homepage: 'https://github.com/xilele777',
	},
	copyright: {
		abbr: 'CC BY-NC-SA 4.0',
		name: '署名-非商业性使用-相同方式共享 4.0 国际',
		url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans',
	},
	favicon: '/Gemini_Generated_Image_tj06xutj06xutj06.svg',
	language: 'zh-CN',
	timeEstablished: '2026-03-16 21:00:00',
	timeZone: 'Asia/Shanghai',
	url: 'https://alover.me/',
	defaultCategory: '未分类',
}

// 存储 nuxt.config 和 app.config 共用的配置
// 此处为启动时需要的配置，启动后可变配置位于 app/app.config.ts
// @keep-sorted
// BLOG_ADMIN_CATEGORIES_START
const managedCategories = {
	"周报": {
		"icon": "ph:newspaper-bold",
		"color": "#f59e0b"
	},
	"技术": {
		"icon": "ph:mouse-bold",
		"color": "#33aaff"
	},
	"杂谈": {
		"icon": "ph:chat-bold",
		"color": "#33bbaa"
	},
	"生活": {
		"icon": "ph:shooting-star-bold",
		"color": "#ff7777"
	},
	"记录": {
		"icon": "ph:note-bold",
		"color": "#a855f7"
	},
	"说明书": {
		"icon": "ph:book-open-bold",
		"color": "#06b6d4"
	},
	"网络记忆": {
		"icon": "ph:globe-hemisphere-west-bold",
		"color": "#ec4899"
	}
} satisfies Record<string, { icon: string, color?: string }>
// BLOG_ADMIN_CATEGORIES_END

const blogConfig = {
	...basicConfig,

	article: {
		categories: {
			[basicConfig.defaultCategory]: { icon: 'ph:folder-dotted-bold' },
			...managedCategories,
		},
		defaultCategoryIcon: 'ph:folder-bold',
		/** 文章版式，首个为默认版式 */
		types: {
			tech: {},
			story: {},
			weekly: {},
			memory: {},
		},
		/** 分类排序方式，键为排序字段，值为显示名称 */
		order: {
			date: '创建日期',
			updated: '更新日期',
			// title: '标题',
		},
		/** 使用 pnpm new 新建文章时自动生成自定义链接（permalink/abbrlink） */
		useRandomPremalink: false,
		/** 隐藏基于文件路由（不是自定义链接）的 URL /post 路径前缀 */
		hidePostPrefix: true,
		/** 禁止搜索引擎收录的路径 */
		robotsNotIndex: ['/admin', '/preview', '/previews/*'],
	},

	/** 博客 Atom 订阅源 */
	feed: {
		/** 订阅源最大文章数量 */
		limit: 50,
		/** 订阅源是否启用XSLT样式 */
		enableStyle: true,
	},

	/** 向 <head> 中添加脚本 */
	scripts: [
		// Umami 统计
		{ 'src': 'https://cloud.umami.is/script.js', 'defer': true, 'data-website-id': '8083da2c-7b1c-4088-8a4b-568d7aea742a', 'data-domains': 'alover.me' },
	],
}

export default blogConfig

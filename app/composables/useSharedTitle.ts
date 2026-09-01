/** 标题共享元素变形使用的 view-transition-name */
export const SHARED_TITLE_NAME = 'vt-post-title'

/**
 * 记录当前参与标题变形的文章路径，跨路由持久保存。
 *
 * 去程（列表 → 文章）不依赖本状态：响应式绑定要等 Vue 微任务刷新，与路由解析
 * 存在竞态，卡片改为在点击处理中同步写 DOM。本状态供回程（文章 → 列表）使用，
 * 那时新列表在 startViewTransition 的回调内渲染，新快照在 Vue 渲染之后才取，
 * 绑定来得及生效。
 */
export const useSharedTitlePath = () => useState<string | undefined>('shared-title-path')

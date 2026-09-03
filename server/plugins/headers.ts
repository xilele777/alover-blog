export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    // 添加安全和性能相关的 HTTP 头
    const headers = event.node.res.getHeaders()

    // 设置缓存策略
    if (event.path.startsWith('/images/') || event.path.startsWith('/assets/')) {
      event.node.res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }
    else if (event.path.endsWith('.xml') || event.path.endsWith('.json')) {
      event.node.res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate')
    }
    else if (!event.path.startsWith('/api/')) {
      event.node.res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    }

    // 性能优化：添加 Link 预加载头
    const preloadLinks = [
      '<https://fonts.gstatic.cn>; rel=preconnect; crossorigin',
      '<https://lib.baomitu.com>; rel=preconnect; crossorigin',
    ]

    if (!headers.link) {
      event.node.res.setHeader('Link', preloadLinks.join(', '))
    }
  })
})

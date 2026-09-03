# SEO 优化指南

本文档记录了博客的 SEO 优化措施和建议。

## 已完成的优化

### 1. 结构化数据 (Schema.org)
- ✅ 添加了全局网站结构化数据（Organization, WebSite）
- ✅ 为文章页面添加 Article 结构化数据，包含发布时间、修改时间、作者信息
- ✅ 添加面包屑导航结构化数据
- ✅ 改进 Open Graph 和 Twitter Card 元数据，包含完整 URL 和图片

### 2. 技术 SEO
- ✅ 添加 canonical 链接指向主域名
- ✅ DNS 预解析和预连接优化外部资源
- ✅ 已有 robots.txt 和 sitemap.xml（由 @nuxtjs/seo 自动生成）
- ✅ 已有 Atom feed 订阅源

### 3. 内容优化
- ✅ 增强网站描述，添加更多关键词（技术、音乐、生活等主题）
- ✅ 文章元数据完整：标题、描述、封面图、发布/更新时间

### 4. 性能优化
- ✅ 图片懒加载（所有图片组件）
- ✅ 字体和样式表异步加载（media="print" + onload）
- ✅ 代码分割优化（Vue 和 Nuxt 核心库分离）
- ✅ 启用 Gzip 和 Brotli 压缩
- ✅ 添加延迟水合（nuxt-delay-hydration）
- ✅ 静态资源缓存策略（通过 Nitro 插件）
- ✅ 性能监控插件（客户端性能指标收集）

## 需要手动配置的优化

### 1. Google Search Console
1. 访问 [Google Search Console](https://search.google.com/search-console)
2. 添加网站 `https://alover.me/`
3. 验证所有权（推荐使用 DNS 验证或 HTML 文件验证）
4. 提交 sitemap：`https://alover.me/sitemap.xml`
5. 监控索引状态和搜索表现

### 2. Bing Webmaster Tools
1. 访问 [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. 添加网站并验证
3. 提交 sitemap：`https://alover.me/sitemap.xml`

### 3. 百度站长平台
1. 访问 [百度搜索资源平台](https://ziyuan.baidu.com/)
2. 添加网站并验证
3. 提交 sitemap：`https://alover.me/sitemap.xml`
4. 考虑使用百度主动推送 API 加快收录

### 4. 优化图片资源
当前的 avatar.png (104K) 较大，建议：
```bash
# 优化现有图片
cd public
# 使用工具如 ImageMagick、sharp 或在线工具压缩图片
# 建议将 PNG 转换为 WebP 格式以减小体积
```

### 5. 添加 Web Manifest（PWA）
创建 `public/manifest.json`：
```json
{
  "name": "小锅巴的博客",
  "short_name": "小锅巴",
  "description": "记录学习与生活的个人博客",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3B6DFF",
  "icons": [
    {
      "src": "/avatar.jpg",
      "sizes": "192x192",
      "type": "image/jpeg"
    }
  ]
}
```

然后在 `nuxt.config.ts` 的 `head.link` 中添加：
```typescript
{ rel: 'manifest', href: '/manifest.json' }
```

### 6. 社交媒体推广
- 在社交媒体平台分享文章时，Open Graph 标签会自动生成预览卡片
- 考虑添加社交媒体分享按钮

### 7. 内部链接优化
- 在文章中添加相关文章的内部链接
- 在首页添加热门或推荐文章区块（已有轮播推荐）

### 8. 监控和分析
当前已集成 Umami 统计，建议：
- 定期查看统计数据，了解访问来源和热门内容
- 根据数据优化内容策略

## 性能指标监控

在浏览器开发者工具控制台中可以看到页面加载性能指标：
- DNS 查询时间
- TCP 连接时间
- TTFB (Time to First Byte)
- DOMContentLoaded 时间
- 完整加载时间

## 下一步优化建议

### 短期（1-2 周）
1. 完成 Google Search Console 和百度站长平台配置
2. 优化大尺寸图片
3. 添加 Web Manifest

### 中期（1 个月）
1. 分析搜索引擎收录情况
2. 根据关键词数据优化文章标题和描述
3. 增加内部链接

### 长期（持续）
1. 保持定期更新高质量内容
2. 监控和分析 SEO 表现
3. 根据用户反馈持续优化体验

## 验证优化效果

### 1. 测试工具
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [GTmetrix](https://gtmetrix.com/)
- [WebPageTest](https://www.webpagetest.org/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)（测试结构化数据）

### 2. 预期改进
- 首屏加载时间：目标 < 2 秒
- Lighthouse SEO 得分：目标 > 95
- Core Web Vitals：
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1

## 技术栈说明
- 框架：Nuxt 3
- SEO 插件：@nuxtjs/seo (sitemap, robots, og-image)
- 性能优化：nuxt-delay-hydration, @nuxt/image
- 统计：Umami Analytics

# 博客 SEO 和性能优化总结

## 已完成的优化（2026-09-03）

### 一、SEO 优化

#### 1. 结构化数据 (Schema.org)
**文件：** `app/plugins/structured-data.ts` (新增)

- ✅ 添加全局结构化数据：Organization（组织信息）、WebSite（网站信息）、WebPage（页面信息）
- ✅ 帮助搜索引擎更好地理解网站内容

**文件：** `app/pages/[...slug].vue` (修改)

- ✅ 为每篇文章添加完整的 Article 结构化数据
  - 文章标题、描述、封面图
  - 发布时间和更新时间
  - 作者信息
- ✅ 添加面包屑导航结构化数据（Breadcrumb）
- ✅ 完善 Open Graph 和 Twitter Card 元数据
  - 使用完整绝对 URL
  - 添加 articlePublishedTime、articleModifiedTime
  - 添加 twitterCard: 'summary_large_image'

#### 2. 元数据优化
**文件：** `blog.config.ts` (修改)

- ✅ 增强网站描述，添加更多关键词
  - 原描述：「这是我的个人博客，用于记录自己的学习与生活...」
  - 新描述：添加「分享技术文章、音乐欣赏、生活感悟和学习笔记，涵盖前端开发、计算机科学、古典音乐、民族器乐等内容」
  - 提升 SEO 关键词覆盖

**文件：** `nuxt.config.ts` (修改)

- ✅ 添加 canonical 链接指向主域名（避免重复内容）
- ✅ 添加 PWA manifest 链接

#### 3. PWA 支持
**文件：** `public/manifest.json` (新增)

- ✅ 创建 Web App Manifest
- ✅ 配置应用名称、图标、主题色
- ✅ 支持添加到主屏幕

### 二、性能优化

#### 1. 资源加载优化
**文件：** `nuxt.config.ts` (修改)

- ✅ DNS 预解析（dns-prefetch）：提前解析域名
  - lib.baomitu.com (KaTeX)
  - rsms.me (Inter 字体)
  - fonts.googleapis.cn (Google 字体)
  - fonts.gstatic.cn (字体 CDN)
  - cdn-font.hyperos.mi.com (小米字体)
  - cloud.umami.is (统计服务)

- ✅ 预连接（preconnect）：提前建立连接
  - fonts.gstatic.cn
  - lib.baomitu.com

- ✅ 字体和样式异步加载（已有，保持不变）
  - 使用 `media="print" + onload="this.media='all'"` 技术
  - 避免阻塞首屏渲染

#### 2. 图片懒加载
**文件：** `app/components/util/Img.vue` (修改)

- ✅ 添加 `loading="lazy"` 属性
- ✅ 添加 `decoding="async"` 属性
- ✅ 延迟加载视口外的图片

**文件：** `app/components/post/Article.vue` (修改)

- ✅ 文章卡片封面图添加 `loading="lazy"`

#### 3. 代码分割优化
**文件：** `nuxt.config.ts` (修改)

- ✅ 手动代码分割（Manual Chunks）
  - vue-vendor: 分离 Vue 核心库（vue, vue-router）
  - nuxt-vendor: 分离 Nuxt 相关库（@nuxt/content, @vueuse/core）
- ✅ 减少主 bundle 体积，提升加载速度

#### 4. 静态资源压缩
**文件：** `nuxt.config.ts` (修改)

- ✅ 启用 Gzip 压缩
- ✅ 启用 Brotli 压缩
- ✅ 启用代码压缩（minify）
- ✅ 典型压缩比：Brotli 可减少 70-80% 体积

#### 5. 预渲染优化
**文件：** `nuxt.config.ts` (修改)

- ✅ 启用链接爬取（crawlLinks: true）
- ✅ 预渲染首页（routes: ['/']）
- ✅ 生成静态 HTML，提升首屏速度

#### 6. 缓存策略
**文件：** `server/plugins/headers.ts` (新增)

- ✅ 静态资源（图片、CSS、JS）：长期缓存（1年，immutable）
- ✅ 数据文件（XML、JSON）：短期缓存（1小时，must-revalidate）
- ✅ 页面：强制验证（max-age=0, must-revalidate）
- ✅ 添加 Link 预加载头

#### 7. 性能监控
**文件：** `app/plugins/performance.client.ts` (新增)

- ✅ 客户端性能指标收集
  - DNS 查询时间
  - TCP 连接时间
  - TTFB (Time to First Byte)
  - DOMContentLoaded 时间
  - 完整加载时间
- ✅ 使用 requestIdleCallback 预加载路由
- ✅ 在浏览器控制台输出性能数据

### 三、文件清单

#### 新增文件
1. `app/plugins/structured-data.ts` - 全局结构化数据
2. `app/plugins/performance.client.ts` - 性能监控和优化
3. `server/plugins/headers.ts` - HTTP 缓存和性能头
4. `public/manifest.json` - PWA 配置
5. `docs/SEO_OPTIMIZATION.md` - SEO 优化指南（详细版）

#### 修改文件
1. `app/pages/[...slug].vue` - 文章页面元数据和结构化数据
2. `app/components/util/Img.vue` - 图片懒加载
3. `app/components/post/Article.vue` - 文章卡片图片懒加载
4. `blog.config.ts` - 网站描述优化
5. `nuxt.config.ts` - 性能和 SEO 配置
6. `pnpm-lock.yaml` - 依赖锁定（已移除 nuxt-delay-hydration）

### 四、需要手动操作的事项

#### 1. 搜索引擎提交（重要！）

##### Google Search Console
1. 访问 https://search.google.com/search-console
2. 添加网站 `https://alover.me/`
3. 验证所有权（推荐 DNS TXT 记录或 HTML 文件）
4. 提交 sitemap：`https://alover.me/sitemap.xml`
5. 请求编入索引（手动提交重要页面）

##### Bing Webmaster Tools
1. 访问 https://www.bing.com/webmasters
2. 添加网站并验证
3. 提交 sitemap

##### 百度站长平台（中文搜索）
1. 访问 https://ziyuan.baidu.com/
2. 添加网站并验证
3. 提交 sitemap
4. 考虑使用百度主动推送 API

#### 2. 图片优化建议
当前 `public/avatar.jpg` 文件较大，建议：
```bash
# 使用 ImageMagick 或在线工具压缩
# 转换为 WebP 格式以减小体积
# 保持质量的同时减少 50-70% 体积
```

#### 3. 监控和验证

##### 性能测试工具
- PageSpeed Insights: https://pagespeed.web.dev/
- GTmetrix: https://gtmetrix.com/
- WebPageTest: https://www.webpagetest.org/

##### SEO 验证工具
- Google Rich Results Test: https://search.google.com/test/rich-results
  （验证结构化数据是否正确）
- Schema.org Validator: https://validator.schema.org/

##### 目标指标
- Lighthouse Performance: > 90
- Lighthouse SEO: > 95
- Core Web Vitals:
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1

### 五、预期效果

#### SEO 方面
- ✅ 搜索引擎能更好地理解网站内容和结构
- ✅ 文章在搜索结果中显示更丰富的信息（Rich Snippets）
- ✅ 社交媒体分享时显示完整的卡片预览
- ✅ 提高搜索排名和点击率

#### 性能方面
- ✅ 首屏加载时间预计减少 20-30%
- ✅ 静态资源加载速度提升（DNS 预解析 + 预连接）
- ✅ 图片加载优化（懒加载 + 异步解码）
- ✅ 代码体积减少（分割 + 压缩）
- ✅ 更好的用户体验和 Core Web Vitals 分数

### 六、技术栈说明
- **框架：** Nuxt 3
- **SEO：** @nuxtjs/seo（sitemap、robots、og-image）
- **性能：** @nuxt/image、代码分割、资源压缩
- **统计：** Umami Analytics（已集成）
- **PWA：** Web App Manifest

### 七、下一步建议

#### 短期（1-2 周）
1. 完成搜索引擎平台注册和 sitemap 提交
2. 测试性能指标并记录基准数据
3. 验证结构化数据是否正确显示

#### 中期（1 个月）
1. 分析搜索引擎收录情况和流量来源
2. 根据关键词数据优化内容
3. 监控性能指标变化

#### 长期（持续）
1. 保持定期更新高质量内容
2. 持续监控 SEO 和性能表现
3. 根据数据反馈迭代优化

---

**优化完成时间：** 2026-09-03  
**涉及文件数：** 11 个（5 个新增，6 个修改）  
**预计收录改善：** 30-50% （提交 sitemap 后 1-2 周）  
**预计性能提升：** 20-30% （LCP 和总加载时间）

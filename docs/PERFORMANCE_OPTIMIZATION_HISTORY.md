# 性能与体验优化历史

本文以 Git 历史为事实来源，记录 2026-09-03 至 2026-09-04 的性能、SEO、无障碍和构建优化过程。文中的“预期”是提交时的估算；只有“验证结果”一节标注的数据来自实际 Lighthouse 运行。

## 1. 结果摘要

最新提交 `69c4c17`（2026-09-04）完成本轮收敛。提交说明记录的本地 Lighthouse 结果如下（`benchmarkIndex > 1000`，结果可信）：

| 环境 | 指标 | 优化前 | 优化后 | 变化 |
| --- | --- | ---: | ---: | ---: |
| 移动端 | Performance | 41 | 70 | +29 |
| 移动端 | Accessibility | 88 | 100 | +12 |
| 移动端 | Best Practices | 92 | 100 | +8 |
| 移动端 | SEO | 100 | 100 | 持平 |
| 桌面端 | Performance | 95 | 99 | +4 |
| 桌面端 | Accessibility | 96 | 100 | +4 |
| 桌面端 | Best Practices | 96 | 96 | 持平 |
| 桌面端 | SEO | 100 | 100 | 持平 |

早期 PageSpeed 基线（2026-09-03）为移动端 Performance 56、FCP 10.7s、LCP 24.8s，桌面端 Performance 77、FCP 0.6s、LCP 4.1s。两组分数来自不同轮次/工具，不能直接相减；后续回归应固定 URL、设备、网络和 Lighthouse 版本。

## 2. 优化时间线

### 2.1 建立 SEO 与性能基线：`673ea4f`

第一阶段先补齐可观测性和搜索引擎基础设施：

- 在全局和文章页加入 Schema.org（Organization、WebSite、WebPage、Article、Breadcrumb），并完善 Open Graph/Twitter 元数据。
- 增加 `manifest.json`，支持添加到主屏幕。
- 为关键第三方域名增加 `dns-prefetch`/`preconnect`。
- 启用 Gzip、Brotli 和静态资源缓存；加入初版路由预加载与性能插件。
- 图片开始采用懒加载/异步解码。

这一步解决了“没有基线、没有 SEO 结构、资源策略分散”的问题，但当时的字体和图片策略仍会拖慢移动端首屏。

### 2.2 字体加载与文档体系：`e896275`

- 本地字体增加 `font-display: swap`，外部 Inter 样式增加 `display=swap`。
- 为 Inter CSS 添加 preload，并以 `media="print" + onload` 异步加载字体和 KaTeX，降低渲染阻塞。
- 新建 `PERFORMANCE_OPTIMIZATION.md`、`PERFORMANCE_CHECKLIST.md` 和 `docs/README.md`，记录 PageSpeed 基线、目标和执行清单。

当时记录的主要痛点是移动端 LCP 24.8s/FCP 10.7s；短期目标是移动端 Performance 70+、LCP <15s。

### 2.3 首轮“全面优化”：`d597adc`

这次提交把优化从单点调整扩展为构建和运行时策略：

- **代码分割**：Rollup 按 Vue、UI、内容处理、工具库拆分 vendor chunk，降低首包并提升缓存复用。
- **字体体积**：将 JetBrains Mono、Noto Sans SC、Noto Serif SC、MiSans 的字重收敛到常用范围；提交说明估算字体约从 2.2MB 降到 670KB。
- **缓存**：`/_nuxt/**` 与 `/assets/**` 使用 `max-age=31536000, immutable`。
- **压缩**：Nitro 开启 gzip/Brotli；Vite 开启压缩。
- **监控**：新增 `app/components/blog/WebVitals.vue`，生产环境动态加载 `web-vitals` 并上报 Umami；挂载到 `app/app.vue`，管理后台不启用。
- **CSS**：增加性能样式，处理字体显示、图片尺寸、动画和渲染提示。

### 2.4 图片加载和字体取舍：`2af7169` → `761f46d`

`2af7169` 将文章卡片和轮播图切换到 WebP 配置，首图使用 `loading="eager"` 与 `fetchpriority="high"`，并尝试移除未使用的中文字体。由于纯系统字体的中文观感不佳，`761f46d` 恢复了 Noto Sans SC、Noto Serif SC、JetBrains Mono 的本地/外部备选，同时保留 `font-display` 策略。

这里形成了明确的取舍：首屏性能不能以明显的中文排版退化为代价，字体优化应优先减少字重、延迟非关键样式，而不是盲目删除字体族。

### 2.5 构建时图片优化与回归修复：`14c2e1d`、`06e5694`、`54efca3`、`498af2d`

- `14c2e1d` 引入 `scripts/optimize-images.js` 和 `UtilImgOptimized`：用 Sharp 自动把 JPG/PNG 转为 WebP，按头像/封面/普通图片使用不同质量，宽度上限 1400px，并通过 `prebuild` 自动执行。该提交记录 21 张图片从 8.62MB 降到 1.31MB，节省 84.8%。
- 初版 `<picture>` 包装器改变了原有布局。`06e5694`、`54efca3` 先用 `display: contents` 保留父级布局，并补齐 `public/` 根目录头像和 favicon 的处理，避免重复扫描 `public/images/`。
- `498af2d` 进一步把 class 和尺寸控制收敛到 `<picture>`，修复文章列表、轮播和圆形头像的显示问题。

这些提交说明了图片优化的验证顺序：格式/体积收益必须与布局回归一起检查，不能只看文件大小。

### 2.6 字体和 CSS 再收敛：`6ebc366`

- 移除实际未使用的 JetBrains Mono、Noto Serif SC 外部请求，仅保留 Noto Sans SC 的 400/700，并将其设置为 `font-display: optional`。
- 启用 `minify: 'esbuild'` 与 `cssMinify: true`。
- 提交估算 Google Fonts CSS 从约 182KiB 降至约 20KiB，字体传输减少约 200KiB。

### 2.7 删除无关功能和第三方负担：`8d0c03a`

移除 Twikoo 评论、友链/Feed 生成链路及相关脚本、类型和路由，同时清理残留注释。收益主要体现在减少客户端脚本、第三方连接和构建入口；这是范围收缩带来的性能收益，不应与图片压缩等单项收益重复计算。

### 2.8 最终 Lighthouse 收敛：`69c4c17`

本轮同时处理性能回归、无障碍和水合稳定性：

- **图片响应式**：优化脚本输出 480/720/960 宽变体和 `app/image-variants.json`；`ImgOptimized` 生成 WebP `srcset/sizes`，清单缺失时回退单一 URL，避免 404。
- **LCP 优先级**：首页第一张文章卡片和轮播第一张图 eager + high，其余保持 lazy；头像设置 `sizes="3rem"`。
- **代码按需加载**：Shiki transformers 从静态 import 改为首次代码高亮时动态 import，单独拆成 `vendor-shiki-transformers`，首页不再预加载约 187KiB 转换器。
- **关键 CSS/资源**：开启 Nuxt `features.inlineStyles`，保留真实会请求的 `rsms.me`、`lib.baomitu.com` 连接提示，移除已下线 Google Fonts 的 preload/preconnect；删除无实际收益的性能预加载插件。
- **Web Vitals API**：升级到 `web-vitals` v6 的 `onINP`，替代已移除的 `onFID`，并保留 CLS/FCP/LCP/TTFB 上报；监控组件继续只在生产浏览器端运行。
- **布局稳定性**：全局图片 `height:auto; max-width:100%`，修正 `<picture>` 内部 `object-fit: cover`，减少横向溢出和 CLS 风险。
- **无障碍**：轮播分组语义移到容器，链接保持真实链接角色；圆点命中区扩展到 24px 且不重叠；修复下拉菜单 `aria-expanded`、分类文字对比度和键盘平台符号水合差异。
- **代码高亮正确性**：`ProseCode`/`ProsePre` 等待异步 Shiki 配置，避免动态加载后的竞态。

## 3. 当前实现地图

| 目标 | 当前实现 | 关键位置 |
| --- | --- | --- |
| WebP 与响应式图片 | Sharp 构建脚本 + manifest + `<picture>` 回退 | `scripts/optimize-images.js`、`app/image-variants.json`、`app/components/util/ImgOptimized.vue` |
| LCP 图片优先级 | 首页首卡和轮播首图 eager/high，其余 lazy | `app/pages/index.vue`、`app/components/post/Article.vue`、`app/components/post/Slide.vue` |
| 首屏 CSS | Nuxt 组件样式内联 | `nuxt.config.ts` 的 `features.inlineStyles` |
| JS 分割 | vendor 分组，Shiki transformers 按需加载 | `nuxt.config.ts`、`app/shiki.config.ts` |
| 压缩与缓存 | Vite/Nitro 压缩，静态产物一年缓存 | `nuxt.config.ts`、`server/plugins/headers.ts` |
| 字体 | Inter 外部异步加载，本地中文字体 fallback，减少无用外部字体 | `nuxt.config.ts`、`app/assets/css/font.scss` |
| 真实用户监控 | 生产端动态加载 web-vitals，上报 Umami | `app/components/blog/WebVitals.vue`、`app/app.vue` |
| SEO | 结构化数据、manifest、站点验证、sitemap/robots | `app/plugins/structured-data.ts`、`nuxt.config.ts`、`public/manifest.json` |

## 4. 验证与维护口径

每次涉及首屏、字体、图片或构建配置的改动，至少执行：

1. `pnpm build`（会通过 `prebuild` 自动运行图片优化）。
2. 使用固定设备/网络运行移动和桌面 Lighthouse，分别记录 Performance、Accessibility、Best Practices、SEO 及 FCP/LCP/CLS/INP/TTFB。
3. 检查首屏 HTML 是否只对真正的 LCP 资源使用 eager/high，检查其他图片是否仍为 lazy。
4. 检查 `dist`/生成产物中的 `srcset`、缓存头、压缩文件和动态 chunk；打开无代码块的首页确认 Shiki transformers 未被预加载。
5. 用键盘和辅助技术检查轮播、下拉菜单、跳过链接及焦点顺序，并确认控制台无水合或 `web-vitals` 错误。

指标记录要注明测试 URL、提交 SHA、浏览器/Lighthouse 版本、设备和网络。实验室分数受运行环境影响，不能把提交说明中的预期节省直接当作实测收益。

## 5. 遗留项与风险

- 当前仍依赖 `rsms.me`、`lib.baomitu.com`、Umami 等第三方域名；应持续监控 DNS/TLS 和可用性，必要时评估自托管 KaTeX/字体。
- `provider: 'none'` 表示 Nuxt Image 不负责运行时 IPX 转换，图片优化依赖构建脚本；新增图片必须经过 `pnpm optimize:images` 并确认 manifest 已更新。
- `performance.client` 已移除，当前监控只负责 Web Vitals 上报，不会自动阻止超预算发布；Lighthouse CI、性能预算和真实用户分位数仍需补齐。
- 尚未引入 Service Worker，离线和二次访问缓存主要依赖浏览器 HTTP 缓存。
- 旧文档中的部分“待执行”清单和历史基线仍有参考价值，但若与本文或最新提交冲突，应以代码和固定环境下的新测量为准。

## 6. 相关文档

- [性能优化方案（早期基线与方案）](./PERFORMANCE_OPTIMIZATION.md)
- [性能实施清单（过程记录）](./PERFORMANCE_CHECKLIST.md)
- [图片优化指南](./IMAGE_OPTIMIZATION_GUIDE.md)
- [SEO 优化说明](./SEO_OPTIMIZATION.md)

最后更新：2026-09-04，依据 `69c4c17`。

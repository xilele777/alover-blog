# 性能优化实施清单

## 📅 优化时间线
**开始日期**: 2026-09-03  
**目标完成日期**: 2026-09-10

---

## ✅ 已完成的优化（2026-09-03）

### 1. 字体加载优化
- ✅ 在 `font.scss` 中为本地字体添加 `font-display: swap`
- ✅ 在 `nuxt.config.ts` 中为 Inter 字体添加预加载
- ✅ 确认所有外部字体 URL 都包含 `display=swap` 参数

**影响范围**: 
- 移动端 FCP 预计改善 1-2 秒
- 桌面端 FCP 预计改善 0.2-0.5 秒

**提交信息**: `perf: optimize font loading with font-display swap and preload`

---

## 🔧 待执行优化

### 优先级 P0 - 本周必须完成

#### 1. 图片组件优化审查
**任务**: 
- ⬜ 审查所有使用 `<img>` 标签的地方，替换为 `<NuxtImg>`
- ⬜ 为首屏图片添加 `loading="eager"` 和 `fetchpriority="high"`
- ⬜ 为非首屏图片添加 `loading="lazy"`

**预计影响**: 
- 移动端 LCP 可改善 5-10 秒
- 桌面端 LCP 可改善 1-2 秒

**实施文件**: 
- `components/**/*.vue`
- `pages/**/*.vue`

#### 2. 减少字体变体
**任务**: 
- ⬜ 分析实际使用的字重
- ⬜ 减少 JetBrains Mono 的字重范围
- ⬜ 减少 Noto Sans SC 的字重范围

**预计影响**: 
- 减少字体文件大小 30-50%
- 首屏加载时间改善 0.5-1 秒

#### 3. 关键 CSS 内联
**任务**: 
- ⬜ 提取首屏关键 CSS
- ⬜ 内联到 HTML head
- ⬜ 延迟加载非关键 CSS

**预计影响**: 
- 移动端 FCP 改善 2-3 秒
- 桌面端 FCP 改善 0.3-0.5 秒

---

### 优先级 P1 - 下周完成

#### 4. 第三方资源优化
**任务**: 
- ⬜ 分析 baomitu.com CDN 资源使用情况
- ⬜ 考虑自托管 KaTeX CSS
- ⬜ 动态导入非关键第三方库

**预计影响**: 
- 减少首屏资源加载 200-300KB
- 改善 TBT 20-50ms

#### 5. 代码分割优化
**任务**: 
- ⬜ 配置 manual chunks
- ⬜ 分离 vendor 代码
- ⬜ 优化路由懒加载

**预计影响**: 
- 减少初始 bundle 大小 30%
- 改善 TTI 1-2 秒

#### 6. 添加资源提示
**任务**: 
- ⬜ 为关键图片添加 preload
- ⬜ 为关键 API 添加 prefetch
- ⬜ 优化 resource hints

**预计影响**: 
- 改善资源加载顺序
- LCP 改善 0.5-1 秒

---

### 优先级 P2 - 本月完成

#### 7. 实施 Service Worker
**任务**: 
- ⬜ 配置 Nuxt PWA 模块
- ⬜ 缓存关键资源
- ⬜ 实现离线访问

**预计影响**: 
- 二次访问速度大幅提升
- 离线体验改善

#### 8. 性能监控集成
**任务**: 
- ⬜ 集成 Web Vitals
- ⬜ 设置性能预算
- ⬜ 配置 Lighthouse CI

**预计影响**: 
- 持续监控性能指标
- 自动化性能测试

#### 9. CDN 和缓存优化
**任务**: 
- ⬜ 配置静态资源长期缓存
- ⬜ 优化 Cache-Control headers
- ⬜ 启用 HTTP/2 Push

**预计影响**: 
- 二次访问速度提升 50-70%
- 减少服务器负载

---

## 📊 性能目标追踪

### 当前基线（2026-09-03）
| 指标 | 移动端 | 桌面端 | 目标 |
|-----|--------|--------|------|
| 性能评分 | 56 | 77 | 90+ |
| FCP | 10.7s | 0.6s | <1.8s |
| LCP | 24.8s | 4.1s | <2.5s |
| TBT | 0ms | 60ms | <200ms |
| CLS | 0 | 0 | <0.1 |
| SI | 10.7s | 1.6s | <3.4s |

### 阶段性目标

#### 第一周目标（2026-09-10）
| 指标 | 移动端目标 | 桌面端目标 |
|-----|-----------|-----------|
| 性能评分 | 70+ | 85+ |
| FCP | <8s | <1.5s |
| LCP | <15s | <3s |

#### 第一月目标（2026-10-03）
| 指标 | 移动端目标 | 桌面端目标 |
|-----|-----------|-----------|
| 性能评分 | 80+ | 90+ |
| FCP | <5s | <1.2s |
| LCP | <8s | <2.5s |

#### 最终目标（2026-12-03）
| 指标 | 移动端目标 | 桌面端目标 |
|-----|-----------|-----------|
| 性能评分 | 90+ | 95+ |
| FCP | <2s | <1s |
| LCP | <2.5s | <2s |

---

## 🔍 测试和验证

### 每次优化后需要测试
1. ⬜ PageSpeed Insights 测试
2. ⬜ Lighthouse 本地测试
3. ⬜ 真机测试（慢速 3G 网络）
4. ⬜ 验证功能完整性
5. ⬜ 检查控制台错误

### 测试环境
- **移动端**: Moto G4, 慢速 3G (400ms RTT, 400kbps)
- **桌面端**: 快速 4G (40ms RTT, 10Mbps)
- **工具**: Chrome DevTools, PageSpeed Insights

---

## 📝 注意事项

### 优化原则
1. **测量优先**: 每次优化前后都要测量指标
2. **用户优先**: 不牺牲用户体验追求指标
3. **渐进增强**: 确保基础功能在所有环境下可用
4. **持续监控**: 建立长期性能监控机制

### 风险提示
- 字体优化可能导致短暂的 FOUT（Flash of Unstyled Text）
- 图片懒加载可能影响 SEO 爬虫
- 代码分割可能增加请求数量
- Service Worker 可能导致缓存问题

---

## 📚 参考资源

### 文档
- [性能优化方案文档](./PERFORMANCE_OPTIMIZATION.md)
- [Nuxt Performance](https://nuxt.com/docs/guide/going-further/performance)
- [Web.dev Performance](https://web.dev/performance/)

### 工具
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [WebPageTest](https://www.webpagetest.org/)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)

---

**更新日期**: 2026-09-03  
**负责人**: 开发团队  
**审核人**: 技术负责人

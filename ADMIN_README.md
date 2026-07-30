# 博客后台说明

这是为当前 Nuxt Content 静态博客补充的第一版可视化后台。后台入口是 `/admin`，用于新建、编辑和发布 `content/posts/**/*.md` 文章。

## 本地访问

在项目根目录启动开发服务：

```powershell
pnpm exec nuxt dev --host 127.0.0.1 --port 3000
```

然后访问：

```text
http://127.0.0.1:3000/admin
```

## GitHub Token 权限

推荐使用 GitHub Fine-grained token。

Repository access：

- 选择 `Only select repositories`
- 勾选当前博客仓库

Repository permissions：

- `Contents`: `Read and write`

不需要 `Actions` 权限。后台只是提交 Markdown 文件到仓库，GitHub Actions 会因为 `push` 自动触发部署。

## 基本流程

1. 点击顶部 `GitHub`，填写 `Owner`、`Repo`、`Branch`、`Token`。
2. 点击 `读取文章`，后台会读取仓库里的 `content/posts/**/*.md`。
3. 点击顶部 `文章`，选择已有文章进行编辑。
4. 点击顶部 `设置`，修改文章文件名、分类、日期、标签、摘要、草稿状态。
5. 在主编辑区写 Markdown。
6. 点击 `发布文章` 或 `保存修改`。

## 数据保存方式

后台不会写入服务器数据库。

- GitHub 配置保存在当前浏览器的 `localStorage`。
- 已读取的文章列表也会缓存在当前浏览器的 `localStorage`。
- 文章内容最终通过 GitHub Contents API 提交到仓库。

刷新或重新打开后台时，会先显示缓存的文章列表；如果 GitHub 配置完整，会自动静默刷新文章列表。

## 新建与编辑

新建文章会写入：

```text
content/posts/{year}/{slug}.md
```

其中：

- `{year}` 来自文章创建时间。
- `{slug}` 来自文章设置里的文件名。

编辑已有文章时，`保存修改` 等价于对原 Markdown 文件提交一次 Git commit。

如果修改了已有文章的文件路径，比如改了日期年份或文件名，当前版本不会自动移动旧文件。建议先保持路径不变保存，或者作为新文章发布。

## 更新时间

后台会自动维护 `updated` 字段。

当标题、摘要、分类、标签、草稿状态或正文变化时，`updated` 会自动改成当前时间。载入已有文章时不会误触发更新时间。

## 实时预览

右侧实时预览使用当前项目的文章组件和 MDC 渲染：

- `PostHeader`
- `PostExcerpt`
- `MDC`
- `.article` 文章样式

因此预览效果会尽量贴近正式发布后的文章页面。

## 当前限制

- 文章图片上传还没有做。
- 文章删除还没有做。
- 当前版本不自动移动或重命名已有文章文件。
- Token 存在浏览器本地，适合个人使用，不适合多人共用公共电脑。
- GitHub Pages 是静态部署，后台不能依赖 Nuxt server API 常驻运行。

## 常见问题

### 保存修改是不是 commit？

是。`保存修改` 会通过 GitHub API 修改对应 Markdown 文件，并在仓库产生一次 commit。

### 为什么不需要 Actions 权限？

后台不直接调用 Actions API，只是提交文件。仓库产生 push 后，现有 GitHub Actions workflow 会自动运行。

### 发布失败怎么办？

优先检查：

- Token 是否填写。
- Token 是否有 `Contents: Read and write` 权限。
- Owner、Repo、Branch 是否正确。
- 当前仓库是否允许 GitHub Actions 在 push 后运行。

页面会显示 GitHub API 返回的错误信息，可以根据错误内容继续定位。

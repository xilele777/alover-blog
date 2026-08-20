#!/usr/bin/env node

import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { intro, log, outro, spinner, text } from '@clack/prompts'
import { Temporal } from 'temporal-polyfill'

function normalize(val: string | symbol | undefined): string | undefined {
	return typeof val === 'symbol' ? undefined : val?.trim()
}

const WEEKLY_DIR = path.join('content', 'posts', 'weekly')
const ISSUE_FILE_RE = /issue-(\d+)\.md$/

const now = Temporal.Now.plainDateTimeISO()
const dateStr = now.toLocaleString('sv')
const today = now.toPlainDate()

intro('🗞️ 新建一期 AI 前沿周报')

// #region 扫描已有期号
/** 递归收集 weekly 目录下所有 md 文件 */
function collectMarkdown(dir: string): string[] {
	if (!fs.existsSync(dir))
		return []

	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory())
			return collectMarkdown(full)
		return entry.isFile() && entry.name.endsWith('.md') ? [full] : []
	})
}

const existingIssues = collectMarkdown(WEEKLY_DIR)
	.map(file => Number(file.match(ISSUE_FILE_RE)?.[1]))
	.filter(num => Number.isFinite(num))

const nextIssue = String(Math.max(0, ...existingIssues) + 1).padStart(3, '0')
log.info(`期号: #${nextIssue}（已有 ${existingIssues.length} 期）`)
// #endregion

// #region 日期区间
function formatMonthDay(date: Temporal.PlainDate) {
	return `${String(date.month).padStart(2, '0')}.${String(date.day).padStart(2, '0')}`
}

// 覆盖今天之前的 7 天，与既往各期的写法保持一致
const rangeEnd = today.subtract({ days: 1 })
const rangeStart = today.subtract({ days: 7 })
const defaultRange = `${rangeStart.year}.${formatMonthDay(rangeStart)} - ${formatMonthDay(rangeEnd)}`

const range = normalize(await text({
	message: '覆盖时间区间',
	defaultValue: defaultRange,
	placeholder: defaultRange,
})) || defaultRange
// #endregion

// #region 生成路径
const dir = path.join(WEEKLY_DIR, today.year.toString())
if (!fs.existsSync(dir))
	fs.mkdirSync(dir, { recursive: true })

const mdPath = path.join(dir, `${today.toString()}-issue-${nextIssue}.md`)

if (fs.existsSync(mdPath)) {
	log.error(`❌ 文件已存在: ${mdPath}`)
	process.exit(1)
}
// #endregion

// #region 写文件
const title = `AI 前沿周报 #${nextIssue}（${range}）`

const frontmatter = {
	// title/description 含 `#`，YAML 中空格后的 `#` 会开启行内注释，必须加引号
	title: `"${title}"`,
	description: '"一句话概括本期主线，用于列表页摘要、SEO 与 RSS"',
	date: dateStr,
	updated: dateStr,
	categories: '[周报]',
	tags: '[AI, 周报]',
	type: 'weekly',
}

fs.writeFileSync(mdPath, `---\n${Object.entries(frontmatter)
	.map(([key, value]) => `${key}: ${value}`)
	.join('\n')}
---

`, 'utf8')

log.info(`✅ 已创建: ${path.resolve(mdPath)}`)
log.warn('⚠️ 正文请勿写 # 一级标题，文章页已渲染标题')
// #endregion

// #region 打开 VS Code
const s = spinner()
s.start('正在打开 VS Code...')
exec(`code "${mdPath}"`, (error) => {
	if (!error)
		return
	s.stop('⚠️ 无法打开 VS Code，请确认已通过命令面板注册 code 命令到 PATH')
	log.error(error.message)
	process.exit(1)
})
s.stop('⌨️ 已通过 VS Code 打开文件')
// #endregion

outro(`🎉 开始整理第 ${nextIssue} 期吧！`)

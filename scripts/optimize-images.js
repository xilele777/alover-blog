/**
 * 构建时生成 WebP 与响应式变体，按原图内容和编码配置复用缓存。
 * 缓存只保存生成产物，恢复缓存不会覆盖本次提交的原图。
 */
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const projectDir = path.resolve(path.dirname(__filename), '..')

const CONFIG = {
	publicDir: path.join(projectDir, 'public'),
	manifestPath: path.join(projectDir, 'app/image-variants.json'),
	cacheDir: path.join(projectDir, '.cache/image-optimization'),
	// 同名原图共用一个 WebP，沿用原脚本的格式顺序，避免 avatar.jpg / avatar.png 互相覆盖。
	supportedFormats: ['.jpg', '.jpeg', '.png'],
	qualityByType: { avatar: 90, cover: 85, default: 80 },
	maxWidth: 1400,
	responsiveWidths: [480, 720, 960],
	variantOptions: { effort: 6, smartSubsample: true },
}

function hash(buffer) {
	return createHash('sha256').update(buffer).digest('hex')
}

function getQuality(filePath, config) {
	const fileName = path.basename(filePath).toLowerCase()
	if (fileName.includes('avatar'))
		return config.qualityByType.avatar
	if (fileName.includes('cover'))
		return config.qualityByType.cover
	return config.qualityByType.default
}

function getAllImageFiles(dir, config, files = []) {
	if (!fs.existsSync(dir))
		return files
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const filePath = path.join(dir, entry.name)
		if (entry.isDirectory())
			getAllImageFiles(filePath, config, files)
		else if (entry.isFile() && config.supportedFormats.includes(path.extname(entry.name).toLowerCase()))
			files.push(filePath)
	}
	return files
}

function getOutputPath(inputPath) {
	const parsed = path.parse(inputPath)
	return path.join(parsed.dir, `${parsed.name}.webp`)
}

function toPublicPath(filePath, config) {
	return `/${path.relative(config.publicDir, filePath).split(path.sep).join('/')}`
}

function getWidths(width, config) {
	return [...config.responsiveWidths.filter(w => w < width), width]
}

function getCacheFileNames(widths) {
	return widths.map((w, index) => index === widths.length - 1 ? 'main.webp' : `${w}w.webp`)
}

function getCacheKey(source, quality, config) {
	const settings = {
		version: 1,
		quality,
		maxWidth: config.maxWidth,
		responsiveWidths: config.responsiveWidths,
		variantOptions: config.variantOptions,
		sharp: sharp.versions.sharp,
		vips: sharp.versions.vips,
		webp: sharp.versions.webp,
	}
	return hash(Buffer.concat([Buffer.from(`${JSON.stringify(settings)}\0`), source]))
}

// 清单最后写入；中断生成、缺失文件或损坏缓存都视为未命中。
function readCachedImages(cachePath, config) {
	try {
		const metadata = JSON.parse(fs.readFileSync(path.join(cachePath, 'metadata.json'), 'utf8'))
		if (!Number.isSafeInteger(metadata.width) || metadata.width <= 0)
			return undefined
		const widths = getWidths(metadata.width, config)
		if (!Array.isArray(metadata.hashes) || metadata.hashes.length !== widths.length)
			return undefined
		const buffers = getCacheFileNames(widths).map(name => fs.readFileSync(path.join(cachePath, name)))
		if (buffers.some((buffer, index) => hash(buffer) !== metadata.hashes[index]))
			return undefined
		return { widths, buffers }
	}
	catch {
		return undefined
	}
}

function writeIfChanged(filePath, data) {
	const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
	if (fs.existsSync(filePath) && fs.readFileSync(filePath).equals(buffer))
		return false
	fs.mkdirSync(path.dirname(filePath), { recursive: true })
	fs.writeFileSync(filePath, buffer)
	return true
}

async function generateImages(source, quality, cachePath, config) {
	const { data, info } = await sharp(source)
		.resize({ width: config.maxWidth, withoutEnlargement: true, fit: 'inside' })
		.webp({ quality })
		.toBuffer({ resolveWithObject: true })
	const widths = getWidths(info.width, config)
	const buffers = []
	for (const w of widths) {
		buffers.push(w === info.width
			? data
			: await sharp(data)
					.resize(w, null, { withoutEnlargement: true })
					.webp({ quality, ...config.variantOptions })
					.toBuffer())
	}

	const names = getCacheFileNames(widths)
	for (const [index, buffer] of buffers.entries())
		writeIfChanged(path.join(cachePath, names[index]), buffer)
	writeIfChanged(path.join(cachePath, 'metadata.json'), JSON.stringify({
		width: info.width,
		hashes: buffers.map(hash),
	}))
	return { widths, buffers }
}

function publishImages(outputPath, images) {
	const parsed = path.parse(outputPath)
	for (const [index, w] of images.widths.entries()) {
		const target = index === images.widths.length - 1
			? outputPath
			: path.join(parsed.dir, `${parsed.name}-${w}w.webp`)
		writeIfChanged(target, images.buffers[index])
	}
}

function formatBytes(bytes) {
	if (bytes === 0)
		return '0 Bytes'
	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	return `${(bytes / 1024 ** i).toFixed(2)} ${['Bytes', 'KB', 'MB'][i]}`
}

export async function optimizeImages(options = {}) {
	const config = { ...CONFIG, ...options }
	const startTime = Date.now()
	console.log('\n🖼️  开始图片优化...\n')
	const allFiles = getAllImageFiles(config.publicDir, config)
	const sources = new Map()
	for (const filePath of allFiles) {
		const outputPath = getOutputPath(filePath)
		const previous = sources.get(outputPath)
		const priority = file => config.supportedFormats.indexOf(path.extname(file).toLowerCase())
		if (!previous || priority(filePath) < priority(previous))
			sources.set(outputPath, filePath)
	}
	console.log(`📁 找到 ${allFiles.length} 个原图，对应 ${sources.size} 个 WebP`)
	if (allFiles.length > sources.size)
		console.log('ℹ️  同名原图共用 WebP，按 JPG / JPEG / PNG 顺序选择来源')

	const stats = { success: 0, cached: 0, variants: 0, error: 0, originalSize: 0, outputSize: 0 }
	const manifest = {}
	for (const [outputPath, inputPath] of sources) {
		try {
			const source = fs.readFileSync(inputPath)
			const quality = getQuality(inputPath, config)
			const cachePath = path.join(config.cacheDir, getCacheKey(source, quality, config))
			let images = readCachedImages(cachePath, config)
			if (images) {
				stats.cached++
			}
			else {
				images = await generateImages(source, quality, cachePath, config)
				const outputSize = images.buffers.at(-1).length
				const savedPercent = ((1 - outputSize / source.length) * 100).toFixed(1)
				console.log(`✅ ${toPublicPath(inputPath, config)} → ${formatBytes(source.length)} → ${formatBytes(outputSize)} (节省 ${savedPercent}%)`)
				for (const [index, w] of images.widths.slice(0, -1).entries())
					console.log(`   ↳ 生成 ${w}w 变体: ${formatBytes(images.buffers[index].length)}`)
				stats.success++
				stats.variants += images.widths.length - 1
				stats.originalSize += source.length
				stats.outputSize += outputSize
			}
			// 新检出的构建目录也要恢复主 WebP 和全部变体；内容相同则不重写。
			publishImages(outputPath, images)
			manifest[toPublicPath(outputPath, config)] = images.widths
		}
		catch (error) {
			stats.error++
			console.error(`❌ 优化失败: ${toPublicPath(inputPath, config)} — ${error.message}`)
		}
	}

	// 失败时保留上次完整清单，并让构建失败，避免发布缺少变体的站点。
	if (stats.error > 0)
		throw new Error(`${stats.error} 张图片优化失败`)
	const sortedManifest = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b, 'en')))
	const changed = writeIfChanged(config.manifestPath, `${JSON.stringify(sortedManifest, null, '\t')}\n`)
	console.log(`\n📝 变体清单${changed ? '已更新' : '无变化'}: ${path.relative(projectDir, config.manifestPath)} (${sources.size} 张)`)
	console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
	console.log('📊 优化统计')
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
	console.log(`✅ 新优化: ${stats.success} 张`)
	console.log(`♻️  复用缓存: ${stats.cached} 张（含尺寸变体）`)
	console.log(`📐 新生成尺寸变体: ${stats.variants} 个`)
	if (stats.success > 0)
		console.log(`💰 本次节省: ${formatBytes(stats.originalSize - stats.outputSize)}`)
	console.log(`\n⏱️  耗时: ${((Date.now() - startTime) / 1000).toFixed(2)} 秒\n`)
	return stats
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
	optimizeImages().catch((error) => {
		console.error(`\n❌ 脚本执行失败: ${error.message}`)
		process.exitCode = 1
	})
}

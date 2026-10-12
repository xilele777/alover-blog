import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
// eslint-disable-next-line test/no-import-node-test -- 使用 Node 内置测试验证构建脚本，无需增加测试框架依赖。
import { test } from 'node:test'
import sharp from 'sharp'
import { optimizeImages } from './optimize-images.js'

function fixture(t) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-image-cache-'))
	t.after(() => {
		// 递归清理只能针对本测试创建的临时目录。
		assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()))
		assert.ok(path.basename(root).startsWith('blog-image-cache-'))
		fs.rmSync(root, { recursive: true, force: true })
	})
	const options = {
		publicDir: path.join(root, 'public'),
		manifestPath: path.join(root, 'app/image-variants.json'),
		cacheDir: path.join(root, 'cache'),
	}
	fs.mkdirSync(path.join(options.publicDir, 'images'), { recursive: true })
	return { root, options }
}

async function createImage(filePath, width = 1000, background = '#d73126') {
	await sharp({ create: { width, height: 600, channels: 3, background } })
		.toFile(filePath)
}

function readManifest(options) {
	return JSON.parse(fs.readFileSync(options.manifestPath, 'utf8'))
}

test('未变图片复用缓存且不重写产物；全新构建目录恢复全部尺寸', async (t) => {
	const { root, options } = fixture(t)
	const input = path.join(options.publicDir, 'images/photo.png')
	await createImage(input)
	const first = await optimizeImages(options)
	assert.equal(first.success, 1)
	assert.equal(first.variants, 3)
	assert.deepEqual(readManifest(options), { '/images/photo.webp': [480, 720, 960, 1000] })

	const outputs = ['photo.webp', 'photo-480w.webp', 'photo-720w.webp', 'photo-960w.webp']
	const bytes = outputs.map(name => fs.readFileSync(path.join(options.publicDir, 'images', name)))
	const unchanged = [options.manifestPath, ...outputs.map(name => path.join(options.publicDir, 'images', name))]
	for (const file of unchanged)
		fs.utimesSync(file, 1000000000, 1000000000)
	const second = await optimizeImages(options)
	assert.equal(second.success, 0)
	assert.equal(second.cached, 1)
	assert.equal(second.variants, 0)
	for (const file of unchanged)
		assert.equal(fs.statSync(file).mtimeMs, 1000000000000)

	const fresh = { ...options, publicDir: path.join(root, 'fresh-public'), manifestPath: path.join(root, 'fresh-manifest.json') }
	fs.mkdirSync(path.join(fresh.publicDir, 'images'), { recursive: true })
	const source = fs.readFileSync(input)
	fs.writeFileSync(path.join(fresh.publicDir, 'images/photo.png'), source)
	fs.writeFileSync(path.join(fresh.publicDir, 'images/photo.webp'), 'old tracked WebP')
	const restored = await optimizeImages(fresh)
	assert.equal(restored.success, 0)
	assert.equal(restored.cached, 1)
	for (const [index, name] of outputs.entries())
		assert.deepEqual(fs.readFileSync(path.join(fresh.publicDir, 'images', name)), bytes[index])
	assert.deepEqual(fs.readFileSync(path.join(fresh.publicDir, 'images/photo.png')), source)
	assert.deepEqual(readManifest(fresh), readManifest(options))
})

test('新增或修改图片只重生成对应产物，同名更新不依赖时间戳', async (t) => {
	const { options } = fixture(t)
	const input = path.join(options.publicDir, 'images/photo.png')
	await createImage(input)
	await optimizeImages(options)
	const before = fs.readFileSync(path.join(options.publicDir, 'images/photo.webp'))
	await createImage(path.join(options.publicDir, 'images/next.png'), 800, '#267ed7')
	const added = await optimizeImages(options)
	assert.equal(added.success, 1)
	assert.equal(added.cached, 1)
	const timestamp = fs.statSync(input).mtime
	await createImage(input, 1000, '#26d74e')
	fs.utimesSync(input, timestamp, timestamp)
	const changed = await optimizeImages(options)
	assert.equal(changed.success, 1)
	assert.equal(changed.cached, 1)
	assert.notDeepEqual(fs.readFileSync(path.join(options.publicDir, 'images/photo.webp')), before)
})

test('宽度、尺寸列表、压缩质量变更都会使缓存失效', async (t) => {
	const { options } = fixture(t)
	await createImage(path.join(options.publicDir, 'images/photo.png'))
	await optimizeImages(options)
	const narrower = { ...options, maxWidth: 640 }
	assert.equal((await optimizeImages(narrower)).success, 1)
	assert.deepEqual(readManifest(options)['/images/photo.webp'], [480, 640])
	const variants = { ...narrower, responsiveWidths: [320, 480] }
	assert.equal((await optimizeImages(variants)).success, 1)
	assert.deepEqual(readManifest(options)['/images/photo.webp'], [320, 480, 640])
	const quality = { ...variants, qualityByType: { avatar: 90, cover: 85, default: 60 } }
	assert.equal((await optimizeImages(quality)).success, 1)
	assert.equal((await optimizeImages(quality)).cached, 1)
})

test('缺失或损坏的缓存自动重建，不影响其他图片', async (t) => {
	const { options } = fixture(t)
	await createImage(path.join(options.publicDir, 'images/photo.png'))
	await createImage(path.join(options.publicDir, 'images/other.png'), 800, '#267ed7')
	await optimizeImages(options)
	const entry = path.join(options.cacheDir, fs.readdirSync(options.cacheDir)[0])
	fs.unlinkSync(path.join(entry, '480w.webp'))
	const missing = await optimizeImages(options)
	assert.equal(missing.success, 1)
	assert.equal(missing.cached, 1)
	fs.writeFileSync(path.join(entry, 'main.webp'), 'corrupt cached image')
	const corrupt = await optimizeImages(options)
	assert.equal(corrupt.success, 1)
	assert.equal(corrupt.cached, 1)
	fs.writeFileSync(path.join(entry, 'metadata.json'), '{')
	assert.equal((await optimizeImages(options)).success, 1)
})

test('根目录同名原图固定选择 JPG；清单删除已移除图片并保留独立 WebP', async (t) => {
	const { options } = fixture(t)
	const png = path.join(options.publicDir, 'avatar.png')
	const jpg = path.join(options.publicDir, 'avatar.jpg')
	await createImage(png, 200)
	await createImage(jpg, 1000, '#267ed7')
	const standalone = path.join(options.publicDir, 'images/standalone.webp')
	await createImage(standalone, 200)
	const standaloneBytes = fs.readFileSync(standalone)
	assert.equal((await optimizeImages(options)).success, 1)
	assert.deepEqual(readManifest(options), { '/avatar.webp': [480, 720, 960, 1000] })
	assert.equal((await sharp(fs.readFileSync(path.join(options.publicDir, 'avatar.webp'))).metadata()).width, 1000)
	assert.equal((await optimizeImages(options)).cached, 1)
	fs.unlinkSync(jpg)
	assert.equal((await optimizeImages(options)).success, 1)
	assert.deepEqual(readManifest(options), { '/avatar.webp': [200] })
	fs.unlinkSync(png)
	await optimizeImages(options)
	assert.deepEqual(readManifest(options), {})
	assert.deepEqual(fs.readFileSync(standalone), standaloneBytes)
})

test('图片解码失败会阻止构建并保留上次完整清单', async (t) => {
	const { options } = fixture(t)
	await createImage(path.join(options.publicDir, 'images/photo.png'))
	await optimizeImages(options)
	const previous = fs.readFileSync(options.manifestPath)
	fs.writeFileSync(path.join(options.publicDir, 'images/invalid.png'), 'invalid image')
	await assert.rejects(optimizeImages(options), /1 张图片优化失败/)
	assert.deepEqual(fs.readFileSync(options.manifestPath), previous)
})

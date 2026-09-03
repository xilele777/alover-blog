/**
 * 图片优化脚本
 * 自动将 public/images 下的图片转换为 WebP 格式并压缩
 */

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 配置
const CONFIG = {
  inputDirs: [
    path.join(__dirname, '../public/images'),
    path.join(__dirname, '../public'),  // 包含根目录（头像等）
  ],
  outputSuffix: '.webp',
  quality: 85,
  skipIfExists: true, // 如果 WebP 已存在则跳过
  supportedFormats: ['.jpg', '.jpeg', '.png'],
  excludeDirs: ['images'],  // 在 public/ 根目录时排除 images 子目录（避免重复）
  // 为不同类型的图片设置不同质量
  qualityByType: {
    avatar: 90,     // 头像高质量
    cover: 85,      // 封面图
    default: 80     // 其他图片
  },
  // 最大宽度限制
  maxWidth: 1400,
}

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// 获取图片质量设置
function getQuality(filePath) {
  const fileName = path.basename(filePath).toLowerCase()

  if (fileName.includes('avatar')) return CONFIG.qualityByType.avatar
  if (fileName.includes('cover')) return CONFIG.qualityByType.cover

  return CONFIG.qualityByType.default
}

// 递归获取所有图片文件
function getAllImageFiles(dir, fileList = [], isRootPublic = false) {
  if (!fs.existsSync(dir)) {
    log(`⚠️  目录不存在: ${dir}`, 'yellow')
    return fileList
  }

  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      // 如果是 public 根目录，跳过 images 子目录（避免重复）
      if (isRootPublic && CONFIG.excludeDirs.includes(file)) {
        return
      }
      getAllImageFiles(filePath, fileList, false)
    } else {
      const ext = path.extname(file).toLowerCase()
      if (CONFIG.supportedFormats.includes(ext)) {
        fileList.push(filePath)
      }
    }
  })

  return fileList
}

// 格式化文件大小
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 优化单个图片
async function optimizeImage(inputPath) {
  const parsed = path.parse(inputPath)
  const outputPath = path.join(parsed.dir, `${parsed.name}${CONFIG.outputSuffix}`)

  // 如果 WebP 已存在且配置跳过，则不处理
  if (CONFIG.skipIfExists && fs.existsSync(outputPath)) {
    log(`⏭️  跳过（已存在）: ${path.basename(outputPath)}`, 'gray')
    return { skipped: true }
  }

  try {
    // 获取原始文件信息
    const originalSize = fs.statSync(inputPath).size
    const quality = getQuality(inputPath)

    // 使用 sharp 转换
    const image = sharp(inputPath)
    const metadata = await image.metadata()

    // 如果图片宽度超过最大限制，则缩小
    if (metadata.width > CONFIG.maxWidth) {
      image.resize(CONFIG.maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
    }

    // 转换为 WebP
    await image
      .webp({ quality })
      .toFile(outputPath)

    // 获取输出文件大小
    const outputSize = fs.statSync(outputPath).size
    const saved = originalSize - outputSize
    const savedPercent = ((saved / originalSize) * 100).toFixed(1)

    log(
      `✅ ${path.basename(inputPath)} → ${formatBytes(originalSize)} → ${formatBytes(outputSize)} (节省 ${savedPercent}%)`,
      'green'
    )

    return {
      success: true,
      originalSize,
      outputSize,
      saved,
      savedPercent
    }
  } catch (error) {
    log(`❌ 优化失败: ${inputPath}`, 'yellow')
    log(`   错误: ${error.message}`, 'gray')
    return { error: true, message: error.message }
  }
}

// 主函数
async function main() {
  log('\n🖼️  开始图片优化...\n', 'blue')

  const startTime = Date.now()

  // 获取所有图片文件
  let imageFiles = []
  for (let i = 0; i < CONFIG.inputDirs.length; i++) {
    const dir = CONFIG.inputDirs[i]
    const isRootPublic = dir.endsWith('public')
    const files = getAllImageFiles(dir, [], isRootPublic)
    imageFiles = imageFiles.concat(files)
  }

  if (imageFiles.length === 0) {
    log('⚠️  未找到需要优化的图片', 'yellow')
    return
  }

  log(`📁 找到 ${imageFiles.length} 个图片文件\n`, 'blue')

  // 统计数据
  const stats = {
    total: imageFiles.length,
    success: 0,
    skipped: 0,
    error: 0,
    totalOriginalSize: 0,
    totalOutputSize: 0,
  }

  // 批量处理图片
  for (const imagePath of imageFiles) {
    const result = await optimizeImage(imagePath)

    if (result.skipped) {
      stats.skipped++
    } else if (result.error) {
      stats.error++
    } else if (result.success) {
      stats.success++
      stats.totalOriginalSize += result.originalSize
      stats.totalOutputSize += result.outputSize
    }
  }

  // 输出统计信息
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  const totalSaved = stats.totalOriginalSize - stats.totalOutputSize
  const totalSavedPercent = stats.totalOriginalSize > 0
    ? ((totalSaved / stats.totalOriginalSize) * 100).toFixed(1)
    : 0

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue')
  log('📊 优化统计', 'blue')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue')
  log(`✅ 成功优化: ${stats.success} 个`)
  log(`⏭️  已跳过: ${stats.skipped} 个`)
  if (stats.error > 0) {
    log(`❌ 失败: ${stats.error} 个`, 'yellow')
  }

  if (stats.success > 0) {
    log(`\n💾 原始大小: ${formatBytes(stats.totalOriginalSize)}`)
    log(`💾 优化后: ${formatBytes(stats.totalOutputSize)}`)
    log(`💰 节省: ${formatBytes(totalSaved)} (${totalSavedPercent}%)`, 'green')
  }

  log(`\n⏱️  耗时: ${duration}秒\n`, 'gray')

  if (stats.error > 0) {
    process.exit(1)
  }
}

// 运行
main().catch((error) => {
  log(`\n❌ 脚本执行失败: ${error.message}`, 'yellow')
  process.exit(1)
})

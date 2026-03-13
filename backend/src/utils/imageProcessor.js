/**
 * @file imageProcessor.js
 * @description 图片处理工具 - 压缩、生成缩略图、WebP转换
 * @author Claude
 * @version 1.0.0
 * @created 2025-12-24
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// 上传根目录
const uploadDir = path.join(__dirname, '../../', config.upload.path);
// 缩略图目录
const thumbnailDir = path.join(uploadDir, 'Thumbnail');

// 确保缩略图目录存在
if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

/**
 * 图片处理配置
 */
const IMAGE_CONFIG = {
  // 缩略图配置
  thumbnail: {
    width: 400,           // 最大宽度
    height: 400,          // 最大高度
    quality: 75,          // 压缩质量 (1-100)
    fit: 'inside',        // 保持比例，不裁剪
  },
  // 原图压缩配置（轻微压缩，保持清晰度）
  original: {
    quality: 90,          // 高质量压缩
    maxWidth: 2560,       // 最大宽度（超过则缩小）
    maxHeight: 2560,      // 最大高度
  },
  // 模糊占位图配置 (LQIP)
  lqip: {
    width: 20,            // 极小尺寸
    height: 20,
    quality: 20,          // 低质量
    blur: 5,              // 模糊程度
  },
  // 支持处理的图片格式
  supportedFormats: ['.jpg', '.jpeg', '.png', '.webp'],
  // 跳过处理的格式（保持原样）
  skipFormats: ['.gif', '.svg', '.ico'],
};

/**
 * 检查文件是否为支持处理的图片格式
 * @param {string} filePath - 文件路径
 * @returns {boolean}
 */
function isSupportedImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_CONFIG.supportedFormats.includes(ext);
}

/**
 * 检查文件是否应该跳过处理
 * @param {string} filePath - 文件路径
 * @returns {boolean}
 */
function shouldSkipProcessing(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_CONFIG.skipFormats.includes(ext);
}

/**
 * 获取缩略图路径
 * @param {string} originalPath - 原图相对路径 (如 /uploads/notes/image.jpg)
 * @returns {string} 缩略图相对路径 (如 /uploads/Thumbnail/notes/image.jpg)
 */
function getThumbnailPath(originalPath) {
  // 将 /uploads/xxx 转换为 /uploads/Thumbnail/xxx
  return originalPath.replace('/uploads/', '/uploads/Thumbnail/');
}

/**
 * 获取缩略图的绝对文件路径
 * @param {string} originalFilePath - 原图绝对路径
 * @returns {string} 缩略图绝对路径
 */
function getThumbnailFilePath(originalFilePath) {
  // 获取相对于 uploads 目录的路径
  const relativePath = path.relative(uploadDir, originalFilePath);
  return path.join(thumbnailDir, relativePath);
}

/**
 * 压缩原图（轻微压缩，保持清晰度）
 * @param {string} filePath - 图片文件路径
 * @returns {Promise<{success: boolean, message: string, savedBytes?: number}>}
 */
async function compressOriginal(filePath) {
  if (!isSupportedImage(filePath)) {
    return { success: false, message: '不支持的图片格式' };
  }

  try {
    const originalStats = fs.statSync(filePath);
    const originalSize = originalStats.size;

    // 读取图片信息
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // 如果图片已经很小（小于100KB），跳过压缩
    if (originalSize < 100 * 1024) {
      return { success: true, message: '图片已足够小，跳过压缩', savedBytes: 0 };
    }

    let pipeline = image;

    // 如果图片尺寸超过最大限制，进行缩小
    if (metadata.width > IMAGE_CONFIG.original.maxWidth || metadata.height > IMAGE_CONFIG.original.maxHeight) {
      pipeline = pipeline.resize(IMAGE_CONFIG.original.maxWidth, IMAGE_CONFIG.original.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // 根据格式进行压缩
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg({ quality: IMAGE_CONFIG.original.quality, mozjpeg: true });
    } else if (ext === '.png') {
      pipeline = pipeline.png({ quality: IMAGE_CONFIG.original.quality, compressionLevel: 8 });
    } else if (ext === '.webp') {
      pipeline = pipeline.webp({ quality: IMAGE_CONFIG.original.quality });
    }

    // 写入临时文件
    const tempPath = filePath + '.tmp';
    await pipeline.toFile(tempPath);

    // 检查压缩后的大小
    const compressedStats = fs.statSync(tempPath);
    const compressedSize = compressedStats.size;

    // 只有压缩后更小才替换原文件
    if (compressedSize < originalSize) {
      fs.unlinkSync(filePath);
      fs.renameSync(tempPath, filePath);
      const savedBytes = originalSize - compressedSize;
      return {
        success: true,
        message: `压缩成功，节省 ${(savedBytes / 1024).toFixed(1)}KB`,
        savedBytes
      };
    } else {
      // 压缩后反而更大，删除临时文件
      fs.unlinkSync(tempPath);
      return { success: true, message: '原图已是最优，保持不变', savedBytes: 0 };
    }
  } catch (error) {
    console.error('压缩原图失败:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 生成缩略图
 * @param {string} filePath - 原图文件路径
 * @returns {Promise<{success: boolean, message: string, thumbnailPath?: string}>}
 */
async function generateThumbnail(filePath) {
  if (!isSupportedImage(filePath)) {
    return { success: false, message: '不支持的图片格式' };
  }

  try {
    // 计算缩略图路径
    const thumbnailPath = getThumbnailFilePath(filePath);
    const thumbnailDirPath = path.dirname(thumbnailPath);

    // 确保缩略图目录存在
    if (!fs.existsSync(thumbnailDirPath)) {
      fs.mkdirSync(thumbnailDirPath, { recursive: true });
    }

    // 读取图片并生成缩略图
    const image = sharp(filePath);
    const metadata = await image.metadata();

    let pipeline = image.resize(IMAGE_CONFIG.thumbnail.width, IMAGE_CONFIG.thumbnail.height, {
      fit: IMAGE_CONFIG.thumbnail.fit,
      withoutEnlargement: true, // 小图不放大
    });

    // 根据格式进行压缩
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg({ quality: IMAGE_CONFIG.thumbnail.quality, mozjpeg: true });
    } else if (ext === '.png') {
      pipeline = pipeline.png({ quality: IMAGE_CONFIG.thumbnail.quality, compressionLevel: 9 });
    } else if (ext === '.webp') {
      pipeline = pipeline.webp({ quality: IMAGE_CONFIG.thumbnail.quality });
    }

    await pipeline.toFile(thumbnailPath);

    // 计算相对路径用于返回
    const relativePath = '/uploads/Thumbnail/' + path.relative(thumbnailDir, thumbnailPath).replace(/\\/g, '/');

    return {
      success: true,
      message: '缩略图生成成功',
      thumbnailPath: relativePath
    };
  } catch (error) {
    console.error('生成缩略图失败:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 生成模糊占位图 (LQIP) - 返回 base64 字符串
 * @param {string} filePath - 原图文件路径
 * @returns {Promise<{success: boolean, message: string, lqip?: string}>}
 */
async function generateLQIP(filePath) {
  if (!isSupportedImage(filePath)) {
    return { success: false, message: '不支持的图片格式' };
  }

  try {
    const buffer = await sharp(filePath)
      .resize(IMAGE_CONFIG.lqip.width, IMAGE_CONFIG.lqip.height, {
        fit: 'inside',
        withoutEnlargement: false,
      })
      .blur(IMAGE_CONFIG.lqip.blur)
      .jpeg({ quality: IMAGE_CONFIG.lqip.quality })
      .toBuffer();

    // 转换为 base64 data URL
    const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;

    return {
      success: true,
      message: 'LQIP 生成成功',
      lqip: base64
    };
  } catch (error) {
    console.error('生成 LQIP 失败:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 处理上传的图片（压缩原图 + 生成缩略图 + 生成LQIP）
 * @param {string} filePath - 图片文件路径
 * @param {Object} options - 选项
 * @param {boolean} options.compressOriginal - 是否压缩原图，默认 true
 * @param {boolean} options.generateThumbnail - 是否生成缩略图，默认 true
 * @param {boolean} options.generateLQIP - 是否生成模糊占位图，默认 false
 * @returns {Promise<{success: boolean, originalCompressed: boolean, thumbnailPath?: string, lqip?: string}>}
 */
async function processUploadedImage(filePath, options = {}) {
  const {
    compressOriginal: shouldCompress = true,
    generateThumbnail: shouldGenerateThumbnail = true,
    generateLQIP: shouldGenerateLQIP = false
  } = options;

  // 跳过不支持的格式
  if (shouldSkipProcessing(filePath)) {
    return {
      success: true,
      originalCompressed: false,
      message: '跳过处理（GIF/SVG/ICO）'
    };
  }

  // 不是支持的图片格式
  if (!isSupportedImage(filePath)) {
    return {
      success: true,
      originalCompressed: false,
      message: '非图片文件，跳过处理'
    };
  }

  const result = {
    success: true,
    originalCompressed: false,
    thumbnailPath: null,
  };

  // 压缩原图
  if (shouldCompress) {
    const compressResult = await compressOriginal(filePath);
    result.originalCompressed = compressResult.success && compressResult.savedBytes > 0;
    if (compressResult.savedBytes) {
      result.savedBytes = compressResult.savedBytes;
    }
  }

  // 生成缩略图
  if (shouldGenerateThumbnail) {
    const thumbnailResult = await generateThumbnail(filePath);
    if (thumbnailResult.success) {
      result.thumbnailPath = thumbnailResult.thumbnailPath;
    }
  }

  // 生成 LQIP
  if (shouldGenerateLQIP) {
    const lqipResult = await generateLQIP(filePath);
    if (lqipResult.success) {
      result.lqip = lqipResult.lqip;
    }
  }

  return result;
}

/**
 * 删除图片及其缩略图
 * @param {string} filePath - 原图文件路径
 */
async function deleteImageWithThumbnail(filePath) {
  try {
    // 删除原图
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 删除缩略图
    const thumbnailPath = getThumbnailFilePath(filePath);
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }

    return { success: true };
  } catch (error) {
    console.error('删除图片失败:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 批量为现有图片生成缩略图（用于迁移）
 * @param {string} directory - 要处理的目录
 * @returns {Promise<{processed: number, failed: number}>}
 */
async function batchGenerateThumbnails(directory) {
  const stats = { processed: 0, failed: 0 };

  async function processDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // 跳过 Thumbnail 目录
        if (item === 'Thumbnail') continue;
        await processDirectory(itemPath);
      } else if (stat.isFile() && isSupportedImage(itemPath)) {
        const result = await generateThumbnail(itemPath);
        if (result.success) {
          stats.processed++;
        } else {
          stats.failed++;
        }
      }
    }
  }

  await processDirectory(directory);
  return stats;
}

module.exports = {
  processUploadedImage,
  compressOriginal,
  generateThumbnail,
  generateLQIP,
  deleteImageWithThumbnail,
  getThumbnailPath,
  batchGenerateThumbnails,
  IMAGE_CONFIG,
};

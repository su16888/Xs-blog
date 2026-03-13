/**
 * @file thumbnail.js
 * @description 图片缩略图生成工具
 * @author Arran
 * @copyright 2025 Arran (SuMoChen)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// 缩略图配置
const THUMBNAIL_CONFIG = {
  width: 400,      // 缩略图宽度
  height: 400,     // 缩略图高度
  quality: 80,     // JPEG 质量 (1-100)
  suffix: '_thumb' // 缩略图文件名后缀
};

/**
 * 生成缩略图文件名
 * @param {string} originalFilename - 原始文件名
 * @returns {string} 缩略图文件名
 */
function getThumbnailFilename(originalFilename) {
  const ext = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, ext);
  // 缩略图统一使用 .jpg 格式（压缩率更好）
  return `${baseName}${THUMBNAIL_CONFIG.suffix}.jpg`;
}

/**
 * 获取缩略图路径
 * @param {string} originalPath - 原始图片路径 (如 /uploads/social-feed/xxx.jpg)
 * @returns {string} 缩略图路径
 */
function getThumbnailPath(originalPath) {
  if (!originalPath) return originalPath;

  const dir = path.dirname(originalPath);
  const ext = path.extname(originalPath);
  const baseName = path.basename(originalPath, ext);

  return `${dir}/${baseName}${THUMBNAIL_CONFIG.suffix}.jpg`;
}

/**
 * 检查文件是否为图片
 * @param {string} filename - 文件名
 * @returns {boolean}
 */
function isImageFile(filename) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(filename).toLowerCase();
  return imageExtensions.includes(ext);
}

/**
 * 生成单张图片的缩略图
 * @param {string} inputPath - 原始图片的完整路径
 * @param {string} outputPath - 缩略图输出的完整路径
 * @param {Object} options - 可选配置
 * @returns {Promise<boolean>} 是否成功
 */
async function generateThumbnail(inputPath, outputPath, options = {}) {
  try {
    const config = { ...THUMBNAIL_CONFIG, ...options };

    // 检查原始文件是否存在
    await fs.access(inputPath);

    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // 使用 sharp 生成缩略图
    await sharp(inputPath)
      .resize(config.width, config.height, {
        fit: 'cover',      // 裁剪填充
        position: 'center' // 居中裁剪
      })
      .jpeg({ quality: config.quality })
      .toFile(outputPath);

    return true;
  } catch (error) {
    console.error(`生成缩略图失败: ${inputPath}`, error.message);
    return false;
  }
}

/**
 * 为上传的文件生成缩略图
 * @param {Object} file - multer 文件对象
 * @param {string} moduleName - 模块名称 (如 'social-feed')
 * @returns {Promise<string|null>} 缩略图相对路径，失败返回 null
 */
async function generateThumbnailForUpload(file, moduleName) {
  try {
    // 只处理图片文件
    if (!isImageFile(file.filename)) {
      return null;
    }

    const inputPath = file.path;
    const thumbnailFilename = getThumbnailFilename(file.filename);
    const outputPath = path.join(path.dirname(inputPath), thumbnailFilename);

    const success = await generateThumbnail(inputPath, outputPath);

    if (success) {
      // 返回相对路径
      return `/uploads/${moduleName}/${thumbnailFilename}`;
    }

    return null;
  } catch (error) {
    console.error('生成上传文件缩略图失败:', error.message);
    return null;
  }
}

/**
 * 批量生成缩略图
 * @param {Array<Object>} files - multer 文件对象数组
 * @param {string} moduleName - 模块名称
 * @returns {Promise<Array<{original: string, thumbnail: string}>>}
 */
async function generateThumbnailsForUploads(files, moduleName) {
  const results = [];

  for (const file of files) {
    const originalPath = file.s3Url || `/uploads/${moduleName}/${file.filename}`;
    const thumbnailPath = await generateThumbnailForUpload(file, moduleName);

    results.push({
      original: originalPath,
      thumbnail: thumbnailPath || originalPath // 如果缩略图生成失败，使用原图
    });
  }

  return results;
}

/**
 * 删除缩略图
 * @param {string} originalPath - 原始图片路径
 * @param {string} baseDir - 基础目录
 */
async function deleteThumbnail(originalPath, baseDir) {
  try {
    if (!originalPath || !isImageFile(originalPath)) return;

    const thumbnailRelPath = getThumbnailPath(originalPath);
    const thumbnailFullPath = path.join(baseDir, thumbnailRelPath);

    await fs.unlink(thumbnailFullPath);
  } catch (error) {
    // 缩略图不存在时忽略错误
    if (error.code !== 'ENOENT') {
      console.error('删除缩略图失败:', error.message);
    }
  }
}

module.exports = {
  THUMBNAIL_CONFIG,
  getThumbnailFilename,
  getThumbnailPath,
  isImageFile,
  generateThumbnail,
  generateThumbnailForUpload,
  generateThumbnailsForUploads,
  deleteThumbnail
};

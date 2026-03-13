/**
 * @file s3Upload.js
 * @description S3上传中间件 - 在本地上传后自动同步到S3
 * @author Arran
 * @copyright 2025 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2025-12-02
 */

const fs = require('fs');
const path = require('path');
const s3Service = require('../services/s3Service');
const config = require('../config/config');

/**
 * S3上传后处理中间件
 * 在multer上传完成后，检查是否启用S3，如果启用则上传到S3
 */
const s3PostUpload = (moduleName) => {
  return async (req, res, next) => {
    // 如果没有文件上传，直接跳过
    if (!req.file && !req.files) {
      return next();
    }

    try {
      const s3Enabled = await s3Service.isS3Enabled();
      console.log('[S3Upload] isS3Enabled:', s3Enabled);

      if (!s3Enabled) {
        // 本地存储模式，直接继续
        console.log('[S3Upload] S3未启用，使用本地存储');
        return next();
      }

      // S3存储模式
      const files = req.files || [req.file];

      for (const file of files) {
        if (!file) continue;

        // 构建S3 Key
        const uploadDir = process.env.UPLOAD_DIR || 'uploads';
        let s3Key;

        if (moduleName) {
          s3Key = `${uploadDir}/${moduleName}/${file.filename}`;
        } else {
          // 从文件路径中提取相对路径
          const fullPath = file.path.replace(/\\/g, '/');
          const uploadIndex = fullPath.indexOf(uploadDir + '/');
          if (uploadIndex !== -1) {
            s3Key = fullPath.substring(uploadIndex);
          } else {
            s3Key = `${uploadDir}/${file.filename}`;
          }
        }

        // 上传到S3
        const s3Url = await s3Service.uploadToS3(file.path, s3Key, file.mimetype);

        // 更新文件信息，添加S3 URL
        file.s3Url = s3Url;
        file.s3Key = s3Key;

        // 删除本地临时文件
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }

      next();
    } catch (error) {
      console.error('S3上传处理失败:', error);
      // S3上传失败时，保留本地文件，继续处理
      next();
    }
  };
};

/**
 * 获取文件的最终URL（根据存储类型）
 * @param {object} file - multer文件对象
 * @param {object} req - Express请求对象
 */
const getFileUrl = (file, req) => {
  // 如果有S3 URL，优先使用
  if (file.s3Url) {
    return file.s3Url;
  }

  // 否则使用本地URL
  return config.getFileUrl(file);
};

/**
 * 删除文件（根据存储类型自动选择）
 * @param {string} fileUrl - 文件URL
 */
const deleteFile = async (fileUrl) => {
  if (!fileUrl) return;

  try {
    const s3Enabled = await s3Service.isS3Enabled();
    const s3Config = await s3Service.getS3Config();

    // 判断文件是否存储在S3
    const isS3File = s3Config.customDomain && fileUrl.startsWith(s3Config.customDomain) ||
                     s3Config.endpoint && fileUrl.includes(s3Config.bucket);

    if (s3Enabled && isS3File) {
      // 从S3删除
      await s3Service.deleteFromS3(fileUrl);
    } else {
      // 从本地删除
      const filePath = config.getFilePathFromUrl(fileUrl);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error('删除文件失败:', error);
    throw error;
  }
};

/**
 * 智能删除文件 - 同时尝试删除本地和S3
 * @param {string} fileUrl - 文件URL
 */
const smartDeleteFile = async (fileUrl) => {
  if (!fileUrl) return;

  const errors = [];

  // 尝试删除本地文件
  try {
    const filePath = config.getFilePathFromUrl(fileUrl);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    errors.push(`本地删除失败: ${error.message}`);
  }

  // 尝试从S3删除
  try {
    const s3Enabled = await s3Service.isS3Enabled();
    if (s3Enabled) {
      await s3Service.deleteFromS3(fileUrl);
    }
  } catch (error) {
    // S3删除失败不算严重错误，可能文件本来就不在S3
    console.log('S3删除跳过:', error.message);
  }

  if (errors.length > 0) {
    console.warn('文件删除警告:', errors.join('; '));
  }
};

module.exports = {
  s3PostUpload,
  getFileUrl,
  deleteFile,
  smartDeleteFile
};

/**
 * @file upload.js
 * @description Xs-Blog 文件上传中间件
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const { processUploadedImage } = require('../utils/imageProcessor');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../', config.upload.path);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 创建按模块分类的存储配置
const createStorage = (moduleName) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      let moduleDir;

      // 动态路径处理：如果 req.params 中包含 module, noteId, type，则使用动态结构
      if (req.params.module && req.params.noteId && req.params.type) {
        // 结构: uploads/{module}/{noteId}/{type}
        moduleDir = path.join(uploadDir, req.params.module, req.params.noteId, req.params.type);
      } else {
        // 兼容旧逻辑
        moduleDir = path.join(uploadDir, moduleName);

        // 特殊处理：图册(imagesall)需要为每个图册创建单独的文件夹
        if (moduleName === 'imagesall' && req.params && req.params.id) {
          moduleDir = path.join(moduleDir, req.params.id.toString());
        }
      }

      if (!fs.existsSync(moduleDir)) {
        fs.mkdirSync(moduleDir, { recursive: true });
      }
      cb(null, moduleDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);

      // 处理中文文件名，使用原始文件名（去除路径和特殊字符）
      let originalName = file.originalname;
      // 只保留文件名，去除路径
      if (originalName.includes('/')) {
        originalName = originalName.split('/').pop();
      }
      if (originalName.includes('\\')) {
        originalName = originalName.split('\\').pop();
      }
      // 去除扩展名，保留纯文件名
      const baseName = originalName.replace(ext, '');
      // 清理文件名，只保留字母、数字、中文、下划线和连字符
      const cleanName = baseName.replace(/[^\w\u4e00-\u9fa5\-]/g, '_');

      // 生成最终文件名：原始文件名_时间戳.扩展名
      const finalName = cleanName + '_' + uniqueSuffix + ext;
      cb(null, finalName);
    }
  });
};

// 默认存储配置（兼容旧代码）
const defaultStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);

    // 处理中文文件名，使用原始文件名（去除路径和特殊字符）
    let originalName = file.originalname;
    // 只保留文件名，去除路径
    if (originalName.includes('/')) {
      originalName = originalName.split('/').pop();
    }
    if (originalName.includes('\\')) {
      originalName = originalName.split('\\').pop();
    }
    // 去除扩展名，保留纯文件名
    const baseName = originalName.replace(ext, '');
    // 清理文件名，只保留字母、数字、中文、下划线和连字符
    const cleanName = baseName.replace(/[^\w\u4e00-\u9fa5\-]/g, '_');

    // 生成最终文件名：原始文件名_时间戳.扩展名
    const finalName = cleanName + '_' + uniqueSuffix + ext;
    cb(null, finalName);
  }
});

// 图片文件过滤器
const imageFileFilter = (req, file, cb) => {
  const allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/svg',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];

  if (
    allowedImageTypes.includes(file.mimetype) ||
    (allowedExtensions.includes(ext) && (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream'))
  ) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

// 媒体文件过滤器（图片+视频）
const mediaFileFilter = (req, file, cb) => {
  const allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/svg',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedVideoTypes.includes(file.mimetype) ||
    (allowedExtensions.includes(ext) && (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream'))
  ) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型，仅支持图片(jpg/jpeg/png/gif/webp/svg/ico)和视频(mp4/webm/ogg)'), false);
  }
};

// 字体文件过滤器（更宽松，主要通过扩展名判断）
const fontFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.ttf', '.otf', '.woff', '.woff2', '.eot'];

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的字体文件类型，请上传 ttf、otf、woff、woff2 格式的字体文件'), false);
  }
};

// 创建按模块分类的上传实例
const createUpload = (moduleName, isAdmin = false) => {
  const maxSize = isAdmin ? config.upload.adminMaxSize : config.upload.userMaxSize;
  return multer({
    storage: createStorage(moduleName),
    limits: {
      fileSize: maxSize
    },
    fileFilter: imageFileFilter
  });
};

const createFontUpload = (moduleName, isAdmin = false) => {
  const maxSize = isAdmin ? config.upload.adminMaxSize : config.upload.userMaxSize;
  return multer({
    storage: createStorage(moduleName),
    limits: {
      fileSize: Math.max(maxSize, 10 * 1024 * 1024) // 字体文件至少10MB
    },
    fileFilter: fontFileFilter
  });
};

// 创建媒体上传实例（支持图片和视频）
const createMediaUpload = (moduleName, isAdmin = false) => {
  const maxSize = isAdmin ? config.upload.adminMaxSize : config.upload.userMaxSize;
  return multer({
    storage: createStorage(moduleName),
    limits: {
      fileSize: Math.max(maxSize, 10 * 1024 * 1024) // 视频至少10MB
    },
    fileFilter: mediaFileFilter
  });
};

// 创建默认图片上传实例（5MB限制）- 兼容旧代码
const upload = multer({
  storage: defaultStorage,
  limits: {
    fileSize: config.upload.maxSize || 5 * 1024 * 1024 // 5MB
  },
  fileFilter: imageFileFilter
});

// 创建字体上传实例（10MB限制）- 兼容旧代码
const fontUpload = multer({
  storage: defaultStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB，字体文件通常比图片大
  },
  fileFilter: fontFileFilter
});

module.exports = upload;
module.exports.fontUpload = fontUpload;
module.exports.createUpload = createUpload;
module.exports.createFontUpload = createFontUpload;
module.exports.createMediaUpload = createMediaUpload;

/**
 * 图片处理中间件 - 在上传后自动压缩和生成缩略图
 * @param {Object} options - 处理选项
 * @param {boolean} options.compressOriginal - 是否压缩原图，默认 true
 * @param {boolean} options.generateThumbnail - 是否生成缩略图，默认 true
 */
module.exports.processImages = (options = {}) => {
  return async (req, res, next) => {
    try {
      // 处理单个文件
      if (req.file) {
        const result = await processUploadedImage(req.file.path, options);
        req.file.imageProcessed = result;
        if (result.thumbnailPath) {
          req.file.thumbnailPath = result.thumbnailPath;
        }
      }

      // 处理多个文件
      if (req.files) {
        // 处理数组形式的文件
        if (Array.isArray(req.files)) {
          for (const file of req.files) {
            const result = await processUploadedImage(file.path, options);
            file.imageProcessed = result;
            if (result.thumbnailPath) {
              file.thumbnailPath = result.thumbnailPath;
            }
          }
        } else {
          // 处理对象形式的文件 (fields)
          for (const fieldName of Object.keys(req.files)) {
            for (const file of req.files[fieldName]) {
              const result = await processUploadedImage(file.path, options);
              file.imageProcessed = result;
              if (result.thumbnailPath) {
                file.thumbnailPath = result.thumbnailPath;
              }
            }
          }
        }
      }

      next();
    } catch (error) {
      console.error('图片处理中间件错误:', error);
      // 即使处理失败也继续，不阻塞上传
      next();
    }
  };
};

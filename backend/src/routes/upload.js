/**
 * @file upload.js
 * @description Xs-Blog 上传路由（公开/管理通用）
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-23
 */

const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { s3PostUpload } = require('../middlewares/s3Upload');
const { processImages } = require('../middlewares/upload');
const config = require('../config/config');

const processUpload = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    const files = req.files.map(file => {
      // 优先使用 S3 URL，否则使用本地 URL
      let url = file.s3Url || `/uploads/${file.destination.split('uploads')[1] || 'common'}/${file.filename}`;
      // 确保路径分隔符正确
      url = url.replace(/\\/g, '/').replace('//', '/');
      
      // 如果使用了 S3，返回完整 URL
      if (file.s3Url) {
        return url;
      }
      
      // 本地存储，返回相对路径（前端会拼接 API_BASE_URL）
      // 注意：这里我们返回不带 /api 的路径，因为静态文件是在 /uploads 下服务的
      return url;
    });

    res.json({
      success: true,
      message: '上传成功',
      // 单文件上传兼容性
      url: files[0],
      // 多文件上传
      urls: files
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    res.status(500).json({
      success: false,
      message: '上传文件失败'
    });
  }
};

// 通用上传接口
router.post('/', upload.createUpload('common').array('files', 10), s3PostUpload('common'), processImages(), processUpload);

// 问卷上传接口
router.post('/survey', upload.createUpload('surveys').array('files', 10), s3PostUpload('surveys'), processImages(), processUpload);

// 动态路径上传接口 (支持 polls, surveys, lotteries 等模块)
// 路径格式: /api/upload/:module/:noteId/:type
// 例如: /api/upload/surveys/101/submissions
router.post('/:module/:noteId/:type', (req, res, next) => {
  const { module, noteId, type } = req.params;
  
  // 验证模块名，防止滥用
  const allowedModules = ['polls', 'surveys', 'lotteries'];
  if (!allowedModules.includes(module)) {
    return res.status(400).json({ success: false, message: '无效的模块名称' });
  }

  // 验证类型
  const allowedTypes = ['config', 'submissions'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ success: false, message: '无效的类型' });
  }

  // 使用动态创建的上传中间件
  // 注意：这里我们传递 'dynamic' 作为模块名，但在 createStorage 中会优先使用 req.params
  upload.createUpload('dynamic').array('files', 10)(req, res, next);
}, s3PostUpload('dynamic'), processImages(), processUpload);

module.exports = router;
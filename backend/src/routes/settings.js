/**
 * @file settings.js
 * @description Xs-Blog 系统设置路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { fontUpload, createUpload } = require('../middlewares/upload');
const { s3PostUpload } = require('../middlewares/s3Upload');

// 获取所有设置（公开）
router.get('/', settingController.getAllSettings);

// 批量更新设置（需要认证）
router.post('/batch', authMiddleware, settingController.updateMultipleSettings);

// 上传背景图片（需要认证）
router.post('/background/upload', authMiddleware, upload.single('background'), s3PostUpload('backgrounds'), settingController.uploadBackgroundImage);

// 删除背景图片（需要认证）
router.delete('/background', authMiddleware, settingController.deleteBackgroundImage);

// 通用图片上传接口（需要认证）
router.post('/image/upload', authMiddleware, upload.single('image'), s3PostUpload('images'), settingController.uploadImage);

// 上传自定义字体（需要认证）
router.post('/font/upload', authMiddleware, fontUpload.single('font'), s3PostUpload('fonts'), settingController.uploadCustomFont);

// 删除自定义字体（需要认证）
router.delete('/font', authMiddleware, settingController.deleteCustomFont);

// 官网主题图片上传（需要认证，保存到 uploads/official 目录）
const officialUpload = createUpload('official');
router.post('/official/image/upload', authMiddleware, officialUpload.single('image'), s3PostUpload('official'), settingController.uploadOfficialImage);

// 删除官网主题图片（需要认证）
router.delete('/official/image', authMiddleware, settingController.deleteOfficialImage);

// 获取单个设置（公开）
router.get('/:key', settingController.getSetting);

// 更新或创建单个设置（需要认证）
router.put('/:key', authMiddleware, settingController.updateSetting);

// 删除设置（需要认证）
router.delete('/:key', authMiddleware, settingController.deleteSetting);

module.exports = router;

/**
 * @file socialLinks.js
 * @description Xs-Blog 社交链接路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const socialLinkController = require('../controllers/socialLinkController');
const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { s3PostUpload } = require('../middlewares/s3Upload');

// 获取所有社交链接（公开）
router.get('/', socialLinkController.getAllSocialLinks);

// 获取单个社交链接（公开）
router.get('/:id', socialLinkController.getSocialLink);

// 创建社交链接（需要认证）
router.post('/', authMiddleware, socialLinkController.createSocialLink);

// 更新社交链接（需要认证）
router.put('/:id', authMiddleware, socialLinkController.updateSocialLink);

// 删除社交链接（需要认证）
router.delete('/:id', authMiddleware, socialLinkController.deleteSocialLink);

// 上传社交链接图标（需要认证）
router.post('/upload/icon', authMiddleware, upload.single('icon'), s3PostUpload('social'), socialLinkController.uploadIcon);

// 上传社交链接二维码（需要认证）
router.post('/upload/qrcode', authMiddleware, upload.single('qrcode'), s3PostUpload('social'), socialLinkController.uploadQRCode);

// 批量更新排序（需要认证）
router.put('/sort/update', authMiddleware, socialLinkController.updateSortOrder);

module.exports = router;

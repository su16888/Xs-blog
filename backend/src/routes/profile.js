/**
 * @file profile.js
 * @description Xs-Blog 个人资料路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { s3PostUpload } = require('../middlewares/s3Upload');

// 获取个人资料（公开）
router.get('/', profileController.getProfile);

// 更新个人资料（需要认证）
router.put('/', authMiddleware, profileController.updateProfile);

// 上传头像（需要认证）
router.post('/avatar', authMiddleware, upload.single('avatar'), s3PostUpload('avatars'), profileController.uploadAvatar);

// 删除头像（需要认证）
router.delete('/avatar', authMiddleware, profileController.deleteAvatar);

// 上传背景图（需要认证）
router.post('/background', authMiddleware, upload.single('background'), s3PostUpload('backgrounds'), profileController.uploadBackground);

module.exports = router;

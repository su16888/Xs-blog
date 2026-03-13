/**
 * @file version.js
 * @description Xs-Blog 版本信息路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const versionController = require('../controllers/versionController');
const authenticateToken = require('../middlewares/auth');

// 获取当前版本（需要认证）
router.get('/current', authenticateToken, versionController.getCurrentVersion);

// 检查版本更新（需要认证）
router.get('/check-update', authenticateToken, versionController.checkUpdate);

// 验证后台路径是否有效（不需要认证，用于前端判断）
router.post('/verify-admin-path', versionController.verifyAdminPath);

// 检查前后端配置一致性（需要认证，v2.9.0 新增）
router.post('/check-config-consistency', authenticateToken, versionController.checkConfigConsistency);

module.exports = router;

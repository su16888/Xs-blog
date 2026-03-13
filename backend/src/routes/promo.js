/**
 * @file promo.js
 * @description 官网主题路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-29
 */

const express = require('express');
const router = express.Router();
const promoController = require('../controllers/promoController');
const authMiddleware = require('../middlewares/auth');
const { createUpload } = require('../middlewares/upload');
const { s3PostUpload } = require('../middlewares/s3Upload');

// 创建官网主题图片上传实例（保存到 uploads/official 目录）
const officialUpload = createUpload('official');

// ==================== 公开API ====================

// 获取所有官网主题配置（公开）
router.get('/data', promoController.getPromoData);

// ==================== 管理API（需要认证） ====================

// 基础配置管理
router.get('/admin/configs', authMiddleware, promoController.getConfigs);
router.put('/admin/configs/:config_key', authMiddleware, promoController.updateConfig);
router.post('/admin/configs/batch', authMiddleware, promoController.batchUpdateConfigs);

// 导航菜单管理
router.get('/admin/nav-items', authMiddleware, promoController.getNavItems);
router.post('/admin/nav-items', authMiddleware, promoController.createNavItem);
router.put('/admin/nav-items/:id', authMiddleware, promoController.updateNavItem);
router.delete('/admin/nav-items/:id', authMiddleware, promoController.deleteNavItem);

// 统计数据管理
router.get('/admin/stats', authMiddleware, promoController.getStats);
router.post('/admin/stats', authMiddleware, promoController.createStat);
router.put('/admin/stats/:id', authMiddleware, promoController.updateStat);
router.delete('/admin/stats/:id', authMiddleware, promoController.deleteStat);

// 团队成员管理
router.get('/admin/team-members', authMiddleware, promoController.getTeamMembers);
router.post('/admin/team-members', authMiddleware, promoController.createTeamMember);
router.put('/admin/team-members/:id', authMiddleware, promoController.updateTeamMember);
router.delete('/admin/team-members/:id', authMiddleware, promoController.deleteTeamMember);

// 图片上传
router.post('/admin/upload', authMiddleware, officialUpload.single('image'), s3PostUpload('official'), promoController.uploadImage);
router.delete('/admin/image', authMiddleware, promoController.deleteImage);

module.exports = router;

/**
 * @file sites.js
 * @description Xs-Blog 网站导航路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');
const authMiddleware = require('../middlewares/auth');

// 获取所有网站（公开）
router.get('/', siteController.getAllSites);

// 获取按分类分组的站点（公开，用于前台展示）
router.get('/grouped/by-category', siteController.getSitesGroupedByCategory);

// 获取单个网站（公开）
router.get('/:id', siteController.getSite);

// 创建网站（需要认证）
router.post('/', authMiddleware, siteController.createSite);

// 更新网站（需要认证）
router.put('/:id', authMiddleware, siteController.updateSite);

// 删除网站（需要认证）
router.delete('/:id', authMiddleware, siteController.deleteSite);

module.exports = router;

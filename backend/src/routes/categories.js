/**
 * @file categories.js
 * @description Xs-Blog 分类路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/auth');

/**
 * 分类管理路由
 * 所有路由都需要认证
 */

// 获取所有分类 (支持类型筛选和搜索)
router.get('/', authMiddleware, categoryController.getAllCategories);

// 获取分类统计信息
router.get('/stats', authMiddleware, categoryController.getCategoryStats);

// 获取单个分类
router.get('/:id', authMiddleware, categoryController.getCategoryById);

// 创建分类
router.post('/', authMiddleware, categoryController.createCategory);

// 更新分类
router.put('/:id', authMiddleware, categoryController.updateCategory);

// 删除分类
router.delete('/:id', authMiddleware, categoryController.deleteCategory);

module.exports = router;

/**
 * @file navigationCategories.js
 * @description Xs-Blog 导航分类路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-10
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const navigationCategoryController = require('../controllers/navigationCategoryController');
const authMiddleware = require('../middlewares/auth');

// 获取所有导航分类（公开）
router.get('/', navigationCategoryController.getAllCategories);

// 获取单个导航分类（公开）
router.get('/:id', navigationCategoryController.getCategory);

// 创建导航分类（需要认证）
router.post('/', authMiddleware, navigationCategoryController.createCategory);

// 更新导航分类（需要认证）
router.put('/:id', authMiddleware, navigationCategoryController.updateCategory);

// 删除导航分类（需要认证）
router.delete('/:id', authMiddleware, navigationCategoryController.deleteCategory);

module.exports = router;

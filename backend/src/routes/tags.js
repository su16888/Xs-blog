/**
 * @file tags.js
 * @description Xs-Blog 标签路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const authMiddleware = require('../middlewares/auth');

// 所有路由都需要认证
router.use(authMiddleware);

// 获取所有分类（必须在 /:id 之前）
router.get('/categories', tagController.getCategories);

// 获取标签使用统计（必须在 /:id 之前）
router.get('/stats', tagController.getTagStats);

// 获取所有标签（支持分类筛选和关键词搜索）
router.get('/', tagController.getTags);

// 获取单个标签
router.get('/:id', tagController.getTagById);

// 获取某个标签下的所有笔记
router.get('/:id/notes', tagController.getTagNotes);

// 创建标签
router.post('/', tagController.createTag);

// 更新标签
router.put('/:id', tagController.updateTag);

// 删除标签
router.delete('/:id', tagController.deleteTag);

module.exports = router;

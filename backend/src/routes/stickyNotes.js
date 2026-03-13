/**
 * @file stickyNotes.js
 * @description Xs-Blog 便签路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const stickyNoteController = require('../controllers/stickyNoteController');
const authMiddleware = require('../middlewares/auth');

// 所有便签路由都需要认证，因为便签只在后台展示

// 获取所有分类（必须在 /:id 之前）
router.get('/categories', authMiddleware, stickyNoteController.getCategories);

// 获取所有便签（支持分类筛选和搜索）
router.get('/', authMiddleware, stickyNoteController.getStickyNotes);

// 获取单个便签
router.get('/:id', authMiddleware, stickyNoteController.getStickyNoteById);

// 创建便签
router.post('/', authMiddleware, stickyNoteController.createStickyNote);

// 更新便签
router.put('/:id', authMiddleware, stickyNoteController.updateStickyNote);

// 删除便签
router.delete('/:id', authMiddleware, stickyNoteController.deleteStickyNote);

// 批量更新排序
router.post('/sort', authMiddleware, stickyNoteController.updateSortOrder);

module.exports = router;

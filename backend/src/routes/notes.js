/**
 * @file notes.js
 * @description Xs-Blog 笔记路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { s3PostUpload } = require('../middlewares/s3Upload');

// 获取笔记列表（公开，支持分类、标签筛选）
router.get('/', noteController.getNotes);

// 获取笔记分类列表（公开）
router.get('/categories/list', noteController.getNoteCategories);

// 获取笔记标签统计（公开）
router.get('/tags/stats', noteController.getNoteTagStats);

// 获取密码尝试状态（公开）- 必须在 /:id 之前，否则会被当作笔记ID处理
router.get('/password-status', noteController.getPasswordAttemptStatus);

// 获取笔记详情（公开）
router.get('/:id', noteController.getNoteById);

// 验证笔记密码（公开）
router.post('/:id/verify', noteController.verifyNotePassword);

// 创建笔记（需要认证）
router.post('/', authMiddleware, noteController.createNote);

// 更新笔记（需要认证）
router.put('/:id', authMiddleware, noteController.updateNote);

// 删除笔记（需要认证）
router.delete('/:id', authMiddleware, noteController.deleteNote);

// 上传媒体文件（需要认证）
router.post('/upload', authMiddleware, upload.array('files', 9), s3PostUpload('notes'), noteController.uploadMedia);

// 获取笔记网盘列表（公开）
router.get('/:id/disks', noteController.getNoteDisks);

// 添加网盘（需要认证）
router.post('/:id/disks', authMiddleware, noteController.addNoteDisk);

// 更新网盘（需要认证）
router.put('/:id/disks/:diskId', authMiddleware, noteController.updateNoteDisk);

// 删除网盘（需要认证）
router.delete('/:id/disks/:diskId', authMiddleware, noteController.deleteNoteDisk);

module.exports = router;

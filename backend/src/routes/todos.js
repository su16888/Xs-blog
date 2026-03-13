/**
 * @file todos.js
 * @description Xs-Blog 待办事项路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const todoController = require('../controllers/todoController');
const authMiddleware = require('../middlewares/auth');

// 所有待办事项路由都需要认证，因为待办事项只在后台展示

// 获取待提醒的待办事项（必须放在 /:id 之前）
router.get('/reminders', authMiddleware, todoController.getPendingReminders);

// v2.5 新增：获取统计信息
router.get('/stats', authMiddleware, todoController.getTodoStats);

// v2.5 新增：获取分类列表
router.get('/categories', authMiddleware, todoController.getCategories);

// v3.0 新增：分类管理
router.post('/categories', authMiddleware, todoController.createCategory);
router.put('/categories/:id', authMiddleware, todoController.updateCategory);
router.delete('/categories/:id', authMiddleware, todoController.deleteCategory);

// v3.0 新增：时间记录管理
router.get('/:id/time-logs', authMiddleware, todoController.getTimeLogs);
router.post('/:id/time-logs', authMiddleware, todoController.createTimeLog);
router.put('/:id/time-logs/:logId', authMiddleware, todoController.updateTimeLog);
router.delete('/:id/time-logs/:logId', authMiddleware, todoController.deleteTimeLog);

// 获取所有待办事项
router.get('/', authMiddleware, todoController.getTodos);

// 获取单个待办事项
router.get('/:id', authMiddleware, todoController.getTodoById);

// 创建待办事项
router.post('/', authMiddleware, todoController.createTodo);

// 更新待办事项
router.put('/:id', authMiddleware, todoController.updateTodo);

// 删除待办事项
router.delete('/:id', authMiddleware, todoController.deleteTodo);

// 忽略/关闭提醒
router.post('/:id/dismiss-reminder', authMiddleware, todoController.dismissReminder);

module.exports = router;

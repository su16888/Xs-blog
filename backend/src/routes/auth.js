/**
 * @file auth.js
 * @description Xs-Blog 认证路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');
const { loginLimiter, strictLimiter } = require('../middlewares/rateLimit');

// 注册（限制速率）
router.post('/register', strictLimiter, authController.register);

// 登录（限制速率）
router.post('/login', loginLimiter, authController.login);

// 获取当前用户信息（需要认证）
router.get('/me', authMiddleware, authController.getCurrentUser);

// 修改密码（需要认证和速率限制）
router.put('/password', authMiddleware, strictLimiter, authController.changePassword);

// 修改用户名（需要认证和速率限制）
router.put('/username', authMiddleware, strictLimiter, authController.changeUsername);

// 退出登录
router.post('/logout', authController.logout);

module.exports = router;

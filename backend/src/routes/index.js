/**
 * @file index.js
 * @description Xs-Blog 后端路由入口文件（重构版：公开/管理路由分离）
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 2.2.0
 * @created 2025-11-05
 * @updated 2025-01-21
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();

// 导入认证路由（独立，不区分公开/管理）
const authRoutes = require('./auth');

// 导入公开和管理路由
const publicRoutes = require('./public');
const adminRoutes = require('./admin');

// 导入投票路由（包含公开和管理接口）
const notePollRoutes = require('./notePoll');

// 导入问卷路由（包含公开和管理接口）
const noteSurveyRoutes = require('./noteSurvey');

// 导入抽奖路由（包含公开和管理接口）
const noteLotteryRoutes = require('./noteLottery');

// 导入上传路由
const uploadRoutes = require('./upload');

// ==================== 认证路由（独立） ====================
// 登录、登出、修改密码等认证相关接口
router.use('/auth', authRoutes);

// ==================== 上传路由 ====================
router.use('/upload', uploadRoutes);

// ==================== 投票路由（包含公开和管理接口） ====================
// 笔记投票功能，包含前台投票和后台管理
router.use('/', notePollRoutes);

// ==================== 问卷路由（包含公开和管理接口） ====================
// 笔记问卷功能，包含前台问卷和后台管理
router.use('/', noteSurveyRoutes);

// ==================== 抽奖路由（包含公开和管理接口） ====================
// 笔记抽奖功能，包含前台抽奖和后台管理
router.use('/', noteLotteryRoutes);

// ==================== 公开路由（无需认证） ====================
// 前台访客可访问的API，只返回必要的展示字段
// 路径: /api/* (除了 /api/{adminPath}/*)
router.use('/', publicRoutes);

// ==================== 管理路由（需要认证） ====================
// 后台管理使用的API，返回完整数据，所有路由都需要token
// 路径: /api/admin/* (固定，不随 ADMIN_PAGE_PATH 变化)

// 注册管理路由（供 app.js 调用）
const registerAdminRoutes = (app) => {
  // API 路由固定为 /api/admin，不使用 ADMIN_PAGE_PATH
  app.use('/api/admin', adminRoutes);
  console.log('✅ 管理路由已注册: /api/admin');
};

module.exports = router;
module.exports.registerAdminRoutes = registerAdminRoutes;

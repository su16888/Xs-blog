/**
 * @file socialFeed.js
 * @description Xs-Blog 朋友圈路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-12-01
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const socialFeedController = require('../controllers/socialFeedController');
const authMiddleware = require('../middlewares/auth');
const { createUpload, createMediaUpload } = require('../middlewares/upload');
const { s3PostUpload } = require('../middlewares/s3Upload');

// 创建朋友圈专用上传实例（上传到 uploads/social-feed 目录）
const socialFeedUpload = createUpload('social-feed');
// 创建支持视频的媒体上传实例（用于上传动态图片和视频）
const socialFeedMediaUpload = createMediaUpload('social-feed');

// ========================================
// 公开接口（前台访问）
// ========================================

// 获取朋友圈个人资料（公开）
router.get('/profile', socialFeedController.getProfile);

// 获取朋友圈动态列表（公开）
router.get('/posts', socialFeedController.getPosts);

// 获取所有动态列表（包含草稿，管理后台用）- 必须在 /posts/:id 之前
router.get('/posts/all', authMiddleware, socialFeedController.getAllPosts);

// 获取单个动态详情（公开）
router.get('/posts/:id', socialFeedController.getPostById);

// ========================================
// 管理接口（需要认证）
// ========================================

// 更新朋友圈个人资料（需要认证）
router.put('/profile', authMiddleware, socialFeedController.updateProfile);

// 上传封面图片（需要认证）
router.post('/profile/cover', authMiddleware, socialFeedUpload.single('cover'), s3PostUpload('social-feed'), socialFeedController.uploadCover);

// 上传头像（需要认证）
router.post('/profile/avatar', authMiddleware, socialFeedUpload.single('avatar'), s3PostUpload('social-feed'), socialFeedController.uploadAvatar);

// 创建动态（需要认证）
router.post('/posts', authMiddleware, socialFeedController.createPost);

// 更新动态（需要认证）
router.put('/posts/:id', authMiddleware, socialFeedController.updatePost);

// 删除动态（需要认证）
router.delete('/posts/:id', authMiddleware, socialFeedController.deletePost);

// 上传动态图片/视频（需要认证）- 支持图片和视频
router.post('/posts/upload', authMiddleware, socialFeedMediaUpload.array('images', 9), s3PostUpload('social-feed'), socialFeedController.uploadImages);

// 批量删除动态（需要认证）
router.post('/posts/batch-delete', authMiddleware, socialFeedController.batchDeletePosts);

// 更新动态排序（需要认证）
router.put('/posts/:id/sort', authMiddleware, socialFeedController.updatePostSort);

module.exports = router;

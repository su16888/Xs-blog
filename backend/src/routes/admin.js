/**
 * @file admin.js
 * @description Xs-Blog 管理API路由（需要认证）
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-18
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { fontUpload, createUpload, createFontUpload, processImages } = require('../middlewares/upload');
const { s3PostUpload } = require('../middlewares/s3Upload');

// 导入控制器
const settingController = require('../controllers/settingController');
const profileController = require('../controllers/profileController');
const socialLinkController = require('../controllers/socialLinkController');
const siteController = require('../controllers/siteController');
const noteController = require('../controllers/noteController');
const stickyNoteController = require('../controllers/stickyNoteController');
const todoController = require('../controllers/todoController');
const tagController = require('../controllers/tagController');
const categoryController = require('../controllers/categoryController');
const messageCategoryController = require('../controllers/messageCategoryController');
const messageController = require('../controllers/messageController');
const navigationCategoryController = require('../controllers/navigationCategoryController');
const versionController = require('../controllers/versionController');
const galleryController = require('../controllers/galleryController');
const galleryCategoryController = require('../controllers/galleryCategoryController');
const serviceController = require('../controllers/serviceController');
const serviceCategoryController = require('../controllers/serviceCategoryController');
const pageTextController = require('../controllers/pageTextController');
const paymentConfigAdminController = require('../controllers/paymentConfigAdminController');
const orderAdminController = require('../controllers/orderAdminController');
const cardAdminController = require('../controllers/cardAdminController');

// 所有管理路由都需要认证
router.use(authMiddleware);

// ==================== 系统设置 ====================
router.get('/settings', settingController.getAdminSettings);
// S3存储配置（必须放在 /settings/:key 之前，否则会被 :key 参数匹配）
router.get('/settings/s3/config', settingController.getS3Config);
router.post('/settings/s3/config', settingController.saveS3Config);
router.post('/settings/s3/test', settingController.testS3Connection);
// 批量更新和文件上传路由（必须放在 /settings/:key 之前）
router.post('/settings/batch', settingController.updateMultipleSettings);
router.post('/settings/background/upload', createUpload('settings', true).single('background'), s3PostUpload('settings'), processImages(), settingController.uploadBackgroundImage);
router.delete('/settings/background', settingController.deleteBackgroundImage);
router.post('/settings/image/upload', createUpload('settings', true).single('image'), s3PostUpload('settings'), processImages(), settingController.uploadImage);
router.post('/settings/font/upload', createFontUpload('settings', true).single('font'), s3PostUpload('settings'), settingController.uploadCustomFont);
router.delete('/settings/font', settingController.deleteCustomFont);
// 动态参数路由放在最后
router.get('/settings/:key', settingController.getAdminSetting);
router.put('/settings/:key', settingController.updateSetting);
router.delete('/settings/:key', settingController.deleteSetting);

// ==================== 博客主题 ====================
router.post('/blog-theme/logo/upload', createUpload('blog-theme', true).single('logo'), s3PostUpload('blog-theme'), processImages(), settingController.uploadImage);
router.delete('/blog-theme/logo', settingController.deleteImage);
router.post('/blog-theme/carousel/upload', createUpload('blog-theme', true).single('image'), s3PostUpload('blog-theme'), processImages(), settingController.uploadImage);
router.delete('/blog-theme/carousel', settingController.deleteImage);
router.post('/blog-theme/nav-icon/upload', createUpload('blog-theme', true).single('icon'), s3PostUpload('blog-theme'), processImages(), settingController.uploadImage);
router.delete('/blog-theme/nav-icon', settingController.deleteImage);

// ==================== 网站导航 ====================
router.post('/sites/logo/upload', createUpload('sites', true).single('logo'), s3PostUpload('sites'), processImages(), settingController.uploadImage);
router.delete('/sites/logo', settingController.deleteImage);

// ==================== 个人资料 ====================
router.get('/profile', profileController.getAdminProfile);
router.put('/profile', profileController.updateProfile);
router.post('/profile/avatar', createUpload('profile', true).single('avatar'), s3PostUpload('profile'), processImages(), profileController.uploadAvatar);
router.delete('/profile/avatar', profileController.deleteAvatar);
router.post('/profile/background', createUpload('profile', true).single('background'), s3PostUpload('profile'), processImages(), profileController.uploadBackgroundImage);
router.delete('/profile/background', profileController.deleteBackgroundImage);

// ==================== 社交链接 ====================
router.get('/social-links', socialLinkController.getAdminSocialLinks);
router.get('/social-links/:id', socialLinkController.getSocialLink);
router.post('/social-links', socialLinkController.createSocialLink);
router.put('/social-links/:id', socialLinkController.updateSocialLink);
router.delete('/social-links/:id', socialLinkController.deleteSocialLink);
router.post('/social-links/upload/icon', createUpload('profile', true).single('icon'), s3PostUpload('profile'), processImages(), socialLinkController.uploadIcon);
router.post('/social-links/upload/qrcode', createUpload('profile', true).single('qrcode'), s3PostUpload('profile'), processImages(), socialLinkController.uploadQRCode);
router.put('/social-links/sort/update', socialLinkController.updateSortOrder);

// ==================== 网站导航 ====================
router.get('/sites', siteController.getAdminSites);
router.get('/sites/:id', siteController.getSite);
router.post('/sites', siteController.createSite);
router.put('/sites/:id', siteController.updateSite);
router.delete('/sites/:id', siteController.deleteSite);

// ==================== 导航分类 ====================
router.get('/navigation-categories', navigationCategoryController.getAllCategories);
router.get('/navigation-categories/:id', navigationCategoryController.getCategory);
router.post('/navigation-categories', navigationCategoryController.createCategory);
router.put('/navigation-categories/:id', navigationCategoryController.updateCategory);
router.delete('/navigation-categories/:id', navigationCategoryController.deleteCategory);

// ==================== 笔记管理 ====================
router.get('/notes', noteController.getAdminNotes);
router.get('/notes/categories/list', noteController.getNoteCategories);
router.get('/notes/tags/stats', noteController.getAdminNoteTagStats);
router.get('/notes/:id', noteController.getAdminNoteById);
router.post('/notes', noteController.createNote);
router.put('/notes/:id', noteController.updateNote);
router.delete('/notes/:id', noteController.deleteNote);
router.post('/notes/upload', createUpload('notes', true).array('files', 9), s3PostUpload('notes'), processImages(), noteController.uploadMedia);
router.get('/notes/:id/disks', noteController.getAdminNoteDisks);
router.post('/notes/:id/disks', noteController.addNoteDisk);
router.put('/notes/:id/disks/:diskId', noteController.updateNoteDisk);
router.delete('/notes/:id/disks/:diskId', noteController.deleteNoteDisk);

// ==================== 便签 ====================
router.get('/sticky-notes', stickyNoteController.getAllStickyNotes);
router.get('/sticky-notes/categories', stickyNoteController.getCategories);
router.get('/sticky-notes/:id', stickyNoteController.getStickyNote);
router.post('/sticky-notes', stickyNoteController.createStickyNote);
router.put('/sticky-notes/:id', stickyNoteController.updateStickyNote);
router.delete('/sticky-notes/:id', stickyNoteController.deleteStickyNote);
router.post('/sticky-notes/sort', stickyNoteController.updateOrder);

// ==================== 待办事项 ====================
router.get('/todos/reminders', todoController.getPendingReminders);
router.get('/todos/stats', todoController.getTodoStats);
router.get('/todos/categories', todoController.getCategories);
router.post('/todos/categories', todoController.createCategory);
router.put('/todos/categories/:id', todoController.updateCategory);
router.delete('/todos/categories/:id', todoController.deleteCategory);
router.get('/todos/:id/time-logs', todoController.getTimeLogs);
router.post('/todos/:id/time-logs', todoController.createTimeLog);
router.put('/todos/:id/time-logs/:logId', todoController.updateTimeLog);
router.delete('/todos/:id/time-logs/:logId', todoController.deleteTimeLog);
router.get('/todos', todoController.getTodos);
router.get('/todos/:id', todoController.getTodoById);
router.post('/todos', todoController.createTodo);
router.put('/todos/:id', todoController.updateTodo);
router.delete('/todos/:id', todoController.deleteTodo);
router.post('/todos/:id/dismiss-reminder', todoController.dismissReminder);

// ==================== 标签 ====================
router.get('/tags', tagController.getAllTags);
router.get('/tags/stats', tagController.getTagStats);
router.get('/tags/categories', tagController.getTagCategories);
router.get('/tags/:id', tagController.getTag);
router.get('/tags/:id/notes', tagController.getTagNotes);
router.post('/tags', tagController.createTag);
router.put('/tags/:id', tagController.updateTag);
router.delete('/tags/:id', tagController.deleteTag);

// ==================== 分类 ====================
router.get('/categories', categoryController.getAllCategories);
router.get('/categories/stats', categoryController.getCategoryStats);
router.get('/categories/:id', categoryController.getCategory);
router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

// ==================== 留言分类 ====================
router.get('/message-categories', messageCategoryController.getAllCategories);
router.get('/message-categories/:id', messageCategoryController.getCategory);
router.post('/message-categories', messageCategoryController.createCategory);
router.put('/message-categories/:id', messageCategoryController.updateCategory);
router.delete('/message-categories/:id', messageCategoryController.deleteCategory);

// ==================== 留言管理 ====================
router.get('/messages', messageController.getAllMessages);
router.get('/messages/:id', messageController.getMessage);
router.put('/messages/:id/status', messageController.updateMessageStatus);
router.delete('/messages/:id', messageController.deleteMessage);

// ==================== 图库管理 ====================
// 图册管理
router.get('/galleries', galleryController.getAdminGalleries);
router.get('/galleries/:id', galleryController.getAdminGallery);
router.post('/galleries', galleryController.createGallery);
router.put('/galleries/:id', galleryController.updateGallery);
router.delete('/galleries/:id', galleryController.deleteGallery);
router.post('/galleries/:id/images', createUpload('imagesall', true).array('images', 50), s3PostUpload('imagesall'), processImages(), galleryController.uploadImages);
router.delete('/galleries/:id/images/:imageId', galleryController.deleteImage);
router.put('/galleries/:id/images/order', galleryController.updateImageOrder);
router.put('/galleries/order', galleryController.updateGalleryOrder);

// 图册分类管理
router.get('/gallery-categories', galleryCategoryController.getAdminCategories);
router.get('/gallery-categories/:id', galleryCategoryController.getCategory);
router.post('/gallery-categories', galleryCategoryController.createCategory);
router.put('/gallery-categories/:id', galleryCategoryController.updateCategory);
router.delete('/gallery-categories/:id', galleryCategoryController.deleteCategory);
router.put('/gallery-categories/order', galleryCategoryController.updateCategoryOrder);

// ==================== 服务业务管理 ====================
// 服务管理
router.get('/services', serviceController.getAdminServices);
router.get('/services/:id', serviceController.getAdminService);
router.post('/services', serviceController.createService);
router.put('/services/:id', serviceController.updateService);
router.delete('/services/:id', serviceController.deleteService);
router.post('/services/batch-delete', serviceController.batchDeleteServices);
router.post('/services/cover/upload', createUpload('shop').single('cover'), s3PostUpload('shop'), processImages(), serviceController.uploadServiceCover);

// 服务分类管理
router.get('/service-categories', serviceCategoryController.getAdminCategories);
router.get('/service-categories/stats', serviceCategoryController.getCategoriesWithStats);
router.get('/service-categories/:id', serviceCategoryController.getAdminCategory);
router.post('/service-categories', serviceCategoryController.createCategory);
router.put('/service-categories/:id', serviceCategoryController.updateCategory);
router.delete('/service-categories/:id', serviceCategoryController.deleteCategory);
router.post('/service-categories/batch-delete', serviceCategoryController.batchDeleteCategories);

router.get('/payment-configs', paymentConfigAdminController.getPaymentConfigs);
router.get('/payment-configs/:id', paymentConfigAdminController.getPaymentConfig);
router.post('/payment-configs', paymentConfigAdminController.createPaymentConfig);
router.put('/payment-configs/:id', paymentConfigAdminController.updatePaymentConfig);
router.post('/payment-configs/:id/logo/upload', createUpload('payment-configs', true).single('logo'), s3PostUpload('payment-configs'), processImages(), paymentConfigAdminController.uploadDisplayLogo);
router.delete('/payment-configs/:id', paymentConfigAdminController.deletePaymentConfig);

router.get('/orders', orderAdminController.getOrders);
router.get('/orders/:id', orderAdminController.getOrder);
router.put('/orders/:id', orderAdminController.updateOrder);
router.post('/orders/bulk-delete', orderAdminController.bulkDeleteOrders);
router.post('/orders/:id/mark-paid', orderAdminController.markPaid);
router.post('/orders/:id/cancel', orderAdminController.cancel);
router.post('/orders/:id/complete', orderAdminController.complete);
router.post('/orders/:id/ship', orderAdminController.ship);
router.delete('/orders/:id', orderAdminController.deleteOrder);

router.get('/cards', cardAdminController.getCards);
router.post('/cards/import', cardAdminController.importCards);
router.put('/cards/:id', cardAdminController.updateCard);
router.delete('/cards/:id', cardAdminController.deleteCard);

// ==================== 页面文本配置 ====================
router.get('/page-texts', pageTextController.getAdminPageTexts);
router.put('/page-texts/:pageKey', pageTextController.updatePageText);
router.post('/page-texts/batch', pageTextController.updateAllPageTexts);

// ==================== 图片处理工具 ====================
const { batchGenerateThumbnails, getThumbnailPath } = require('../utils/imageProcessor');
const uploadDir = require('path').join(__dirname, '../../', require('../config/config').upload.path);

// 批量生成缩略图（用于迁移现有图片）
router.post('/tools/generate-thumbnails', async (req, res) => {
  try {
    const result = await batchGenerateThumbnails(uploadDir);
    res.json({
      success: true,
      message: `缩略图生成完成：成功 ${result.processed} 张，失败 ${result.failed} 张`,
      data: result
    });
  } catch (error) {
    console.error('批量生成缩略图失败:', error);
    res.status(500).json({
      success: false,
      message: '批量生成缩略图失败: ' + error.message
    });
  }
});

// ==================== 文档排序管理 ====================
const path = require('path');
const fs = require('fs').promises;
const Setting = require('../models/Setting');

// Markdown 文件目录配置
const getMarkdownDir = () => {
  if (process.env.MARKDOWN_DIR) {
    return process.env.MARKDOWN_DIR;
  }
  return path.join(__dirname, '../../../frontend/public/markdown');
};

// 获取文档列表和排序配置
router.get('/docs/order', async (req, res) => {
  try {
    const markdownDir = getMarkdownDir();

    // 确保目录存在
    try {
      await fs.access(markdownDir);
    } catch (err) {
      await fs.mkdir(markdownDir, { recursive: true });
      return res.json({
        success: true,
        data: { files: [], docsConfig: [] }
      });
    }

    // 读取目录内容
    const files = await fs.readdir(markdownDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    // 获取排序配置
    let docsConfig = [];
    try {
      const orderSetting = await Setting.findOne({ where: { key: 'docsOrder' } });
      if (orderSetting && orderSetting.value) {
        const parsed = JSON.parse(orderSetting.value);
        // 兼容旧格式（纯字符串数组）和新格式（对象数组）
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'string') {
            // 旧格式：转换为新格式
            docsConfig = parsed.map(f => ({ name: f, showInList: true }));
          } else {
            // 新格式
            docsConfig = parsed;
          }
        }
      }
    } catch (orderError) {
      console.error('获取文档排序配置失败:', orderError);
    }

    // 获取已配置的文件名列表
    const configuredFiles = docsConfig.map(c => c.name);

    // 返回排序后的文件列表（包含显示状态）
    const sortedFiles = [
      ...docsConfig.filter(c => mdFiles.includes(c.name)),
      ...mdFiles.filter(f => !configuredFiles.includes(f)).map(f => ({ name: f, showInList: true }))
    ];

    res.json({
      success: true,
      data: {
        files: sortedFiles.map(f => f.name),
        docsConfig: sortedFiles
      }
    });
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取文档列表失败'
    });
  }
});

// 保存文档排序配置
router.post('/docs/order', async (req, res) => {
  try {
    const { order, docsConfig } = req.body;

    // 支持新格式（docsConfig）和旧格式（order）
    let configToSave;
    if (docsConfig && Array.isArray(docsConfig)) {
      // 新格式：对象数组 [{ name: 'xxx.md', showInList: true }, ...]
      configToSave = docsConfig;
    } else if (order && Array.isArray(order)) {
      // 旧格式：字符串数组，转换为新格式
      configToSave = order.map(f => ({ name: f, showInList: true }));
    } else {
      return res.status(400).json({
        success: false,
        message: '排序数据格式错误'
      });
    }

    // 保存排序配置
    const [setting, created] = await Setting.findOrCreate({
      where: { key: 'docsOrder' },
      defaults: {
        key: 'docsOrder',
        value: JSON.stringify(configToSave),
        type: 'json',
        description: '文档排序配置'
      }
    });

    if (!created) {
      await setting.update({
        value: JSON.stringify(configToSave),
        type: 'json'
      });
    }

    res.json({
      success: true,
      message: '文档排序保存成功'
    });
  } catch (error) {
    console.error('保存文档排序失败:', error);
    res.status(500).json({
      success: false,
      message: '保存文档排序失败'
    });
  }
});

// ==================== 版本管理 ====================
router.get('/version/current', versionController.getCurrentVersion);
router.get('/version/check-update', versionController.checkUpdate);

// ==================== 元数据 ====================
const metadataController = require('../controllers/metadataController');
router.get('/metadata/stats', metadataController.getStats);

// ==================== 代理请求 ====================
const proxyController = require('../controllers/proxyController');
router.post('/proxy/fetch', proxyController.proxyFetch);
router.post('/proxy/download-douyin-video', proxyController.downloadDouyinVideo);

// ==================== 统计数据 ====================
const statisticsController = require('../controllers/statisticsController');
router.get('/statistics/trends', statisticsController.getVisitTrends);
router.get('/statistics/modules', statisticsController.getModuleStats);
router.get('/statistics/ip-ranking', statisticsController.getIPRanking);
router.get('/statistics/overview', statisticsController.getDashboardOverview);
router.delete('/statistics/clear-visits', statisticsController.clearVisitData);

// ==================== 缓存管理 ====================
const { cacheService } = require('../services/cacheService');

// 清理前台 Redis 缓存
router.delete('/cache/frontend', async (req, res) => {
  try {
    const result = await cacheService.clearFrontendCache();
    res.json(result);
  } catch (error) {
    console.error('清理缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '清理缓存失败'
    });
  }
});

// 获取缓存状态
router.get('/cache/status', async (req, res) => {
  try {
    const status = await cacheService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('获取缓存状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取缓存状态失败'
    });
  }
});

module.exports = router;

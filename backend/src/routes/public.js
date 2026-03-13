/**
 * @file public.js
 * @description Xs-Blog 公开API路由（无需认证）
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-18
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();

// 导入控制器
const settingController = require('../controllers/settingController');
const profileController = require('../controllers/profileController');
const socialLinkController = require('../controllers/socialLinkController');
const siteController = require('../controllers/siteController');
const noteController = require('../controllers/noteController');
const galleryController = require('../controllers/galleryController');
const galleryCategoryController = require('../controllers/galleryCategoryController');
const serviceController = require('../controllers/serviceController');
const serviceCategoryController = require('../controllers/serviceCategoryController');
const orderController = require('../controllers/orderController');
const paymentController = require('../controllers/paymentController');
const paymentConfigController = require('../controllers/paymentConfigController');
const pageTextController = require('../controllers/pageTextController');
const { strictLimiter } = require('../middlewares/rateLimit');

// 导入元数据路由
const metadataRoutes = require('./metadata');

// 导入官网主题路由
const promoRoutes = require('./promo');

// 导入验证码工具
const { generateCaptcha, validateCaptcha } = require('../utils/captcha');

// 导入留言模型和工具
const Message = require('../models/Message');
const MessageCategory = require('../models/MessageCategory');
const { sequelize } = require('../config/database');
const { checkIPLimit, recordIPSubmission } = require('../utils/ipLimit');
const { sendMessageNotification } = require('../utils/email');
const { getClientIP, isValidIP, isPrivateIP } = require('../utils/ipHelper');

// ==================== 系统设置 ====================
// 获取公开设置（只返回 key 和 value）
router.get('/settings', settingController.getPublicSettings);
router.get('/settings/:key', settingController.getPublicSetting);

router.get('/admin-page-path', (req, res) => {
  const path = process.env.ADMIN_PAGE_PATH || process.env.ADMIN_PATH || 'admins';
  res.json({
    success: true,
    data: { path }
  });
});

// ==================== 页面文本配置 ====================
// 获取所有页面文本配置（公开）
router.get('/page-texts', pageTextController.getAllPageTexts);
router.get('/page-texts/:pageKey', pageTextController.getPageText);

// ==================== 个人资料 ====================
// 获取公开资料（只返回展示字段）
router.get('/profile', profileController.getPublicProfile);

// ==================== 社交链接 ====================
// 获取可见社交链接（只返回展示字段）
router.get('/social-links', socialLinkController.getPublicSocialLinks);

// ==================== 网站导航 ====================
// 获取前端可见站点（只返回展示字段）
router.get('/sites', siteController.getPublicSites);
router.get('/sites/grouped/by-category', siteController.getSitesGroupedByCategory);

// ==================== 笔记 ====================
// 获取已发布笔记列表（只返回展示字段）
router.get('/notes', noteController.getPublicNotes);
router.get('/notes/categories/list', noteController.getNoteCategories);
router.get('/notes/tags/stats', noteController.getPublicNoteTagStats);
// 获取密码尝试状态 - 必须在 /notes/:id 之前
router.get('/notes/password-status', noteController.getPasswordAttemptStatus);
router.get('/notes/:id', noteController.getPublicNoteById);
router.post('/notes/:id/verify', noteController.verifyNotePassword);
router.get('/notes/:id/disks', noteController.getPublicNoteDisks);

// ==================== 图库 ====================
// 获取前端可见图册列表（只返回展示字段）
router.get('/galleries', galleryController.getPublicGalleries);
// 获取密码尝试状态 - 必须在 /galleries/:id 之前
router.get('/galleries/password-status', galleryController.getPasswordAttemptStatus);
router.get('/galleries/:id', galleryController.getPublicGallery);
router.post('/galleries/:id/verify', galleryController.verifyGalleryPassword);

// 获取可见的图册分类列表
router.get('/gallery-categories', galleryCategoryController.getPublicCategories);

// ==================== 服务业务 ====================
// 获取前端可见服务列表（只返回展示字段）
router.get('/services', serviceController.getPublicServices);
router.get('/services/grouped/by-category', serviceController.getServicesGroupedByCategory);
router.get('/services/:id', serviceController.getPublicService);

// 获取可见的服务分类列表
router.get('/service-categories', serviceCategoryController.getPublicCategories);

// ==================== 订单 ====================
router.post('/orders', strictLimiter, orderController.createOrder);
router.get('/orders/:id/status', orderController.getOrderStatus);
router.post('/orders/:id/cancel', strictLimiter, orderController.cancelOrder);
router.post('/orders/:id/pay', strictLimiter, paymentController.createOrderPayment);

// ==================== 支付配置 ====================
router.get('/payment-configs', paymentConfigController.getPublicPaymentConfigs);

// ==================== 支付回调 ====================
router.all('/payments/yipay/notify', paymentController.yipayNotify);
router.get('/payments/yipay/return', paymentController.yipayReturn);
router.get('/payments/yipay/return/:orderId', paymentController.yipayReturnWithOrderId);
router.get('/payments/paypal/return', paymentController.paypalReturn);
router.get('/payments/paypal/cancel', paymentController.paypalCancel);
router.post('/payments/paypal/webhook', paymentController.paypalWebhook);

// ==================== 留言 ====================
// 获取留言分类列表（公开）
router.get('/message-categories', async (req, res) => {
  try {
    const categories = await MessageCategory.findAll({
      order: [['sort_order', 'ASC'], ['name', 'ASC']]
    });
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('获取留言分类失败:', error);
    res.status(500).json({
      success: false,
      message: '获取留言分类失败'
    });
  }
});

// 获取分类名称的辅助函数
async function getCategoryName(categoryId) {
  try {
    const category = await MessageCategory.findByPk(categoryId);
    return category ? category.name : '未分类';
  } catch (error) {
    console.error('获取分类名称失败:', error);
    return '未分类';
  }
}

// 提交留言（公开）
router.post('/messages', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { name, contact, category_id, content, attachments, captcha, captcha_id, captcha_text } = req.body;
    const ip_address = getClientIP(req);
    const user_agent = req.get('User-Agent');

    // 基础验证
    if (!name || !contact || !content) {
      return res.status(400).json({
        success: false,
        message: '姓名、联系方式和内容不能为空'
      });
    }

    // 验证码验证 - 支持两种格式
    let captchaId, captchaText;
    if (captcha && captcha.id && captcha.text) {
      // 旧格式：{ captcha: { id, text } }
      captchaId = captcha.id;
      captchaText = captcha.text;
    } else if (captcha_id && captcha_text) {
      // 新格式：{ captcha_id, captcha_text }
      captchaId = captcha_id;
      captchaText = captcha_text;
    } else {
      return res.status(400).json({
        success: false,
        message: '验证码不能为空'
      });
    }

    if (!validateCaptcha(captchaId, captchaText)) {
      return res.status(400).json({
        success: false,
        message: '验证码错误或已过期'
      });
    }

    // IP限制验证
    const ipCheck = await checkIPLimit(ip_address);
    if (!ipCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: ipCheck.message
      });
    }

    // 创建留言
    const message = await Message.create({
      name,
      contact,
      category_id: category_id || null,
      content,
      attachments: attachments ? JSON.stringify(attachments) : null,
      ip_address,
      user_agent,
      status: 'pending'
    }, { transaction });

    // 记录IP提交
    await recordIPSubmission(ip_address);

    // 发送邮件通知（异步，不阻塞响应）
    if (sendMessageNotification) {
      const categoryName = category_id ? await getCategoryName(category_id) : '未分类';
      sendMessageNotification({
        ...message.toJSON(),
        created_at: message.created_at
      }, categoryName).catch(err => {
        console.error('发送邮件通知失败:', err);
      });
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: '留言提交成功，我们会尽快处理',
      data: { id: message.id }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('提交留言失败:', error);
    res.status(500).json({
      success: false,
      message: '提交留言失败'
    });
  }
});

// 获取验证码
router.get('/captcha', (req, res) => {
  try {
    const captcha = generateCaptcha();

    // 返回验证码ID和SVG数据
    res.json({
      success: true,
      data: {
        id: captcha.id,
        image: captcha.data  // 改为 image 以匹配前端
      }
    });
  } catch (error) {
    console.error('生成验证码失败:', error);
    res.status(500).json({
      success: false,
      message: '生成验证码失败'
    });
  }
});

// ==================== 用户信息 ====================
// 获取当前用户IP地址和地理位置
router.get('/client-ip', async (req, res) => {
  try {
    const clientIP = getClientIP(req);
    const isPrivate = isPrivateIP(clientIP);
    const isValid = isValidIP(clientIP);

    let location = '暂无法获取';
    let city = '暂无法获取';

    // 如果是公网IP，尝试获取地理位置信息
    if (isValid && !isPrivate && clientIP !== 'unknown') {
      try {
        // 主要服务：使用ip-api.com获取地理位置
        const response = await fetch(`http://ip-api.com/json/${clientIP}?lang=zh-CN`, {
          timeout: 3000
        });

        if (response.ok) {
          const geoData = await response.json();
          if (geoData.status === 'success') {
            location = geoData.country || '暂无法获取';
            city = geoData.city || '暂无法获取';
            if (geoData.regionName && geoData.regionName !== geoData.city) {
              location = `${geoData.country} ${geoData.regionName}`;
            }
          }
        }
      } catch (geoError) {
        console.log('主要IP查询服务失败，尝试备用服务:', geoError.message);

        // 备用服务：使用ipapi.co
        try {
          const backupResponse = await fetch(`https://ipapi.co/${clientIP}/json/`, {
            timeout: 3000
          });

          if (backupResponse.ok) {
            const backupGeoData = await backupResponse.json();
            if (backupGeoData.city) {
              location = backupGeoData.country_name || '暂无法获取';
              city = backupGeoData.city || '暂无法获取';
              if (backupGeoData.region && backupGeoData.region !== backupGeoData.city) {
                location = `${backupGeoData.country_name} ${backupGeoData.region}`;
              }
            }
          }
        } catch (backupError) {
          console.log('备用IP查询服务也失败:', backupError.message);
          // 静默处理，不影响主要功能
        }
      }
    }

    res.json({
      success: true,
      data: {
        ip: clientIP,
        isPrivate: isPrivate,
        isValid: isValid,
        location: location,
        city: city
      }
    });
  } catch (error) {
    console.error('获取客户端IP失败:', error);
    res.status(500).json({
      success: false,
      message: '获取客户端IP失败'
    });
  }
});

// ==================== 元数据 ====================
// 获取URL元数据（用于笔记中的链接预览）
router.use('/metadata', metadataRoutes);

// ==================== 官网主题 ====================
// 官网主题公开API和管理API
router.use('/promo', promoRoutes);

// ==================== 朋友圈 ====================
// 朋友圈公开API和管理API
const socialFeedRoutes = require('./socialFeed');
router.use('/social-feed', socialFeedRoutes);

// ==================== 页面访问统计 ====================
const statisticsController = require('../controllers/statisticsController');
router.post('/visit', statisticsController.recordVisit);

// ==================== 视频代理 ====================
// 用于代理第三方视频流（解决跨域和防盗链问题）
const proxyController = require('../controllers/proxyController');
router.get('/proxy/video', proxyController.proxyVideo);

// ==================== Markdown 文件 ====================
// 读取 public/markdown 目录下的 md 文件
const path = require('path');
const fs = require('fs').promises;

// Markdown 文件目录配置
// 优先使用环境变量，否则使用默认路径（相对于后端根目录）
const getMarkdownDir = () => {
  if (process.env.MARKDOWN_DIR) {
    return process.env.MARKDOWN_DIR;
  }
  // 默认路径：从 backend/src/routes 到 frontend/public/markdown
  return path.join(__dirname, '../../../frontend/public/markdown');
};

router.get('/markdown/:filename', async (req, res) => {
  try {
    let { filename } = req.params;
    const Setting = require('../models/Setting');

    // 检查是否是自定义slug，需要转换为实际文件名
    if (!filename.endsWith('.md')) {
      try {
        const orderSetting = await Setting.findOne({ where: { key: 'docsOrder' } });
        if (orderSetting && orderSetting.value) {
          const parsed = JSON.parse(orderSetting.value);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
            const docConfig = parsed.find(c => c.customSlug === filename);
            if (docConfig) {
              filename = docConfig.name;
            } else {
              // 没找到自定义slug，尝试添加.md后缀
              filename = filename + '.md';
            }
          } else {
            filename = filename + '.md';
          }
        } else {
          filename = filename + '.md';
        }
      } catch (e) {
        filename = filename + '.md';
      }
    }

    // 安全检查：只允许 .md 文件，防止路径遍历
    if (!filename.endsWith('.md') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: '无效的文件名'
      });
    }

    // 构建文件路径
    const markdownDir = getMarkdownDir();
    const filePath = path.join(markdownDir, filename);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 读取文件内容
    const content = await fs.readFile(filePath, 'utf-8');

    // 获取文件信息
    const stats = await fs.stat(filePath);

    res.json({
      success: true,
      data: {
        filename,
        content,
        fileSize: stats.size,
        updatedAt: stats.mtime.toISOString()
      }
    });
  } catch (error) {
    console.error('读取 Markdown 文件失败:', error);
    res.status(500).json({
      success: false,
      message: '读取文件失败'
    });
  }
});

// 获取 markdown 目录下的文件列表（支持排序，返回更新时间）
router.get('/markdown', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const pagingEnabled = req.query.page !== undefined || req.query.limit !== undefined || req.query.search !== undefined;
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.max(parseInt(limit, 10) || 20, 1);
    const trimmedSearch = typeof search === 'string' ? search.trim().toLowerCase() : '';

    const markdownDir = getMarkdownDir();
    const Setting = require('../models/Setting');

    // 确保目录存在
    try {
      await fs.access(markdownDir);
    } catch (err) {
      // 目录不存在，创建它
      await fs.mkdir(markdownDir, { recursive: true });
      return res.json({
        success: true,
        data: pagingEnabled ? [] : [],
        ...(pagingEnabled
          ? {
              pagination: {
                current_page: currentPage,
                total_pages: 0,
                total_count: 0,
                per_page: perPage
              }
            }
          : {})
      });
    }

    // 读取目录内容
    const files = await fs.readdir(markdownDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    // 获取每个文件的更新时间
    const filesWithStats = await Promise.all(
      mdFiles.map(async (file) => {
        try {
          const filePath = path.join(markdownDir, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            updatedAt: stats.mtime.toISOString()
          };
        } catch (err) {
          return {
            name: file,
            updatedAt: null
          };
        }
      })
    );

    // 获取文档排序配置
    let sortedFiles = filesWithStats;
    try {
      const orderSetting = await Setting.findOne({ where: { key: 'docsOrder' } });
      if (orderSetting && orderSetting.value) {
        const parsed = JSON.parse(orderSetting.value);
        // 兼容旧格式（纯字符串数组）和新格式（对象数组）
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'string') {
            // 旧格式：按照配置的顺序排序，未在配置中的文件放到最后
            sortedFiles = [
              ...parsed.map(f => filesWithStats.find(item => item.name === f)).filter(Boolean),
              ...filesWithStats.filter(item => !parsed.includes(item.name))
            ];
          } else {
            // 新格式：按照配置的顺序排序，并过滤掉 showInList 为 false 的文档
            const configuredFiles = parsed.map(c => c.name);
            const visibleConfig = parsed.filter(c => c.showInList !== false);
            sortedFiles = [
              ...visibleConfig.map(c => filesWithStats.find(item => item.name === c.name)).filter(Boolean),
              ...filesWithStats.filter(item => !configuredFiles.includes(item.name))
            ];
          }
        }
      }
    } catch (orderError) {
      console.error('获取文档排序配置失败:', orderError);
      // 排序失败时使用默认顺序
    }

    let filteredFiles = sortedFiles;
    if (trimmedSearch) {
      filteredFiles = sortedFiles.filter(file => {
        const name = file.name.toLowerCase();
        const displayName = file.name.replace(/\.md$/, '').toLowerCase();
        return name.includes(trimmedSearch) || displayName.includes(trimmedSearch);
      });
    }

    if (!pagingEnabled) {
      return res.json({
        success: true,
        data: filteredFiles
      });
    }

    const totalCount = filteredFiles.length;
    const startIndex = (currentPage - 1) * perPage;
    const pagedFiles = filteredFiles.slice(startIndex, startIndex + perPage);

    res.json({
      success: true,
      data: pagedFiles,
      pagination: {
        current_page: currentPage,
        total_pages: Math.ceil(totalCount / perPage),
        total_count: totalCount,
        per_page: perPage
      }
    });
  } catch (error) {
    console.error('读取 Markdown 目录失败:', error);
    res.status(500).json({
      success: false,
      message: '读取目录失败'
    });
  }
});

module.exports = router;

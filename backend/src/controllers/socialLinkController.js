/**
 * @file socialLinkController.js
 * @description Xs-Blog 社交链接控制器（重构版：公开/管理方法分离）
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 2.0.0
 * @created 2025-11-06
 * @updated 2025-11-18
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const SocialLink = require('../models/SocialLink');
const upload = require('../middlewares/upload');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { cacheService, CACHE_KEYS } = require('../services/cacheService');

// ==================== 公开API方法（/api/social-links） ====================

// 获取可见社交链接（公开访问，只返回展示字段）- 带 Redis 缓存
exports.getPublicSocialLinks = async (req, res, next) => {
  try {
    // 设置响应头，防止CDN缓存动态数据
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // 先尝试从 Redis 缓存获取
    const cached = await cacheService.get(CACHE_KEYS.SOCIAL_LINKS);
    if (cached) {
      res.set({ 'X-Cache': 'HIT' });
      return res.json({
        success: true,
        data: cached
      });
    }

    const socialLinks = await SocialLink.findAll({
      where: { is_visible: true },
      attributes: ['platform', 'account', 'link', 'icon', 'qrcode', 'show_in_profile'],
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    // 存入 Redis 缓存（24小时）
    await cacheService.set(CACHE_KEYS.SOCIAL_LINKS, socialLinks);

    res.set({ 'X-Cache': 'MISS' });
    res.json({
      success: true,
      data: socialLinks
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API方法（/api/admin/social-links） ====================

// 获取所有社交链接（管理后台，返回完整字段）
exports.getAdminSocialLinks = async (req, res, next) => {
  try {
    const socialLinks = await SocialLink.findAll({
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: socialLinks
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 向后兼容的旧方法 ====================

// 获取所有社交链接
exports.getAllSocialLinks = async (req, res, next) => {
  try {
    // 检查是否是已认证用户
    const isAuthenticated = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');

    // 检查请求路径：公开请求即使有token也返回简化数据
    const isPublicRequest = !req.path.includes('/admin');

    // 构建查询条件
    const where = {};

    // 公开请求只返回可见的链接
    if (!isAuthenticated || isPublicRequest) {
      where.is_visible = true;
    }

    // 支持 visible 查询参数（兼容前端）
    if (req.query.visible === 'true') {
      where.is_visible = true;
    }

    const socialLinks = await SocialLink.findAll({
      where,
      // 公开请求只返回必要字段，即使有token
      attributes: (isAuthenticated && !isPublicRequest)
        ? ['id', 'platform', 'account', 'link', 'icon', 'qrcode', 'show_in_profile', 'is_visible', 'updated_at'] // 后台管理：返回所有字段
        : ['platform', 'account', 'link', 'icon', 'qrcode', 'show_in_profile'], // 公开访问：只返回展示字段
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: socialLinks
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个社交链接
exports.getSocialLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const socialLink = await SocialLink.findByPk(id, {
      attributes: ['id', 'platform', 'account', 'link', 'icon', 'qrcode', 'show_in_profile', 'is_visible', 'updated_at']
    });

    if (!socialLink) {
      return res.status(404).json({
        success: false,
        message: '社交链接不存在'
      });
    }

    res.json({
      success: true,
      data: socialLink
    });
  } catch (error) {
    next(error);
  }
};

// 创建社交链接
exports.createSocialLink = async (req, res, next) => {
  try {
    const { platform, account, link, icon, qrcode, sort_order, show_in_profile, is_visible } = req.body;

    if (!platform || !account) {
      return res.status(400).json({
        success: false,
        message: '平台和账号不能为空'
      });
    }

    const socialLink = await SocialLink.create({
      platform,
      account,
      link: link || '',
      icon,
      qrcode,
      sort_order,
      show_in_profile: show_in_profile || false,
      is_visible: is_visible !== undefined ? is_visible : true
    });

    res.status(201).json({
      success: true,
      message: '社交链接创建成功',
      data: socialLink
    });
  } catch (error) {
    next(error);
  }
};

// 更新社交链接
exports.updateSocialLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { platform, account, link, icon, qrcode, sort_order, show_in_profile, is_visible } = req.body;

    const socialLink = await SocialLink.findByPk(id);

    if (!socialLink) {
      return res.status(404).json({
        success: false,
        message: '社交链接不存在'
      });
    }

    await socialLink.update({
      platform,
      account,
      link: link || '',
      icon,
      qrcode,
      sort_order,
      show_in_profile: show_in_profile !== undefined ? show_in_profile : socialLink.show_in_profile,
      is_visible: is_visible !== undefined ? is_visible : socialLink.is_visible
    });

    res.json({
      success: true,
      message: '社交链接更新成功',
      data: socialLink
    });
  } catch (error) {
    next(error);
  }
};

// 删除社交链接
exports.deleteSocialLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const socialLink = await SocialLink.findByPk(id);

    if (!socialLink) {
      return res.status(404).json({
        success: false,
        message: '社交链接不存在'
      });
    }

    await socialLink.destroy();

    res.json({
      success: true,
      message: '社交链接删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 上传社交链接图标
exports.uploadIcon = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    // 检查文件类型
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/svg',
      'image/x-icon',
      'image/vnd.microsoft.icon'
    ];
    if (!allowedTypes.includes(req.file.mimetype)) {
      // 删除上传的文件
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: '不支持的文件类型，请上传 jpg、jpeg、png、gif、webp、svg 或 ico 格式的图片'
      });
    }

    // 构建文件访问URL，优先使用S3 URL
    const fileUrl = req.file.s3Url || config.getFileUrl(req.file);

    res.json({
      success: true,
      message: '图标上传成功',
      data: {
        url: fileUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    // 如果出错，删除上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// 上传社交链接二维码
exports.uploadQRCode = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    // 检查文件类型
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/svg',
      'image/x-icon',
      'image/vnd.microsoft.icon'
    ];
    if (!allowedTypes.includes(req.file.mimetype)) {
      // 删除上传的文件
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: '不支持的文件类型，请上传 jpg、jpeg、png、gif、webp、svg 或 ico 格式的图片'
      });
    }

    // 构建文件访问URL，优先使用S3 URL
    const fileUrl = req.file.s3Url || config.getFileUrl(req.file);

    res.json({
      success: true,
      message: '二维码上传成功',
      data: {
        url: fileUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    // 如果出错，删除上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// 批量更新社交链接排序
exports.updateSortOrder = async (req, res, next) => {
  try {
    const { sortData } = req.body;

    if (!sortData || !Array.isArray(sortData)) {
      return res.status(400).json({
        success: false,
        message: '无效的排序数据'
      });
    }

    // 批量更新排序
    for (const item of sortData) {
      const { id, sort_order } = item;
      if (id && sort_order !== undefined) {
        await SocialLink.update(
          { sort_order },
          { where: { id } }
        );
      }
    }

    res.json({
      success: true,
      message: '排序更新成功'
    });
  } catch (error) {
    next(error);
  }
};

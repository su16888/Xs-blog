/**
 * @file profileController.js
 * @description Xs-Blog 个人资料控制器（重构版：公开/管理方法分离）
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 2.0.0
 * @created 2025-11-06
 * @updated 2025-11-18
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const Profile = require('../models/Profile');
const config = require('../config/config');
const { cacheService, CACHE_KEYS } = require('../services/cacheService');

// ==================== 公开API方法（/api/profile） ====================

// 获取公开个人资料（公开访问，只返回展示字段）- 带 Redis 缓存
exports.getPublicProfile = async (req, res, next) => {
  try {
    // 设置响应头，防止CDN缓存动态数据
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // 先尝试从 Redis 缓存获取
    const cached = await cacheService.get(CACHE_KEYS.PROFILE);
    if (cached) {
      res.set({ 'X-Cache': 'HIT' });
      return res.json({
        success: true,
        data: cached
      });
    }

    let profile = await Profile.findOne({
      attributes: ['name', 'title', 'bio', 'avatar', 'background_image', 'location', 'website', 'website_title']
    });

    if (!profile) {
      profile = await Profile.create({
        name: '',
        title: '',
        bio: '',
        avatar: null,
        background_image: null,
        location: '',
        website: '',
        website_title: ''
      });
    }

    // 存入 Redis 缓存（24小时）
    await cacheService.set(CACHE_KEYS.PROFILE, profile);

    res.set({ 'X-Cache': 'MISS' });
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API方法（/api/admin/profile） ====================

// 获取完整个人资料（管理后台，返回所有字段）
exports.getAdminProfile = async (req, res, next) => {
  try {
    let profile = await Profile.findOne();

    if (!profile) {
      profile = await Profile.create({
        name: '',
        title: '',
        bio: '',
        avatar: null,
        background_image: null,
        location: '',
        website: '',
        website_title: ''
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 向后兼容的旧方法 ====================

// 获取个人资料
exports.getProfile = async (req, res, next) => {
  try {
    // 单用户系统，获取第一条记录
    let profile = await Profile.findOne({
      attributes: ['name', 'title', 'bio', 'avatar', 'background_image', 'location', 'website', 'website_title']
    });

    // 如果不存在，创建默认资料
    if (!profile) {
      profile = await Profile.create({
        name: '',
        title: '',
        bio: '',
        avatar: '',
        background_image: '',
        location: '',
        website: '',
        website_title: ''
      });

      // 重新查询以只返回需要的字段
      profile = await Profile.findOne({
        attributes: ['name', 'title', 'bio', 'avatar', 'background_image', 'location', 'website', 'website_title']
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

// 更新个人资料
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, title, bio, avatar, background_image, location, website, website_title } = req.body;

    // 单用户系统，获取或创建第一条记录
    let profile = await Profile.findOne();

    if (!profile) {
      profile = await Profile.create({
        name,
        title,
        bio,
        avatar,
        background_image,
        location,
        website,
        website_title
      });
    } else {
      await profile.update({
        name,
        title,
        bio,
        avatar,
        background_image,
        location,
        website,
        website_title
      });
    }

    res.json({
      success: true,
      message: '个人资料更新成功',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

// 上传头像
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    // 返回完整的URL，优先使用S3 URL
    const avatarUrl = req.file.s3Url || config.getFileUrl(req.file);

    // 更新个人资料中的头像
    let profile = await Profile.findOne();
    if (!profile) {
      profile = await Profile.create({ avatar: avatarUrl });
    } else {
      await profile.update({ avatar: avatarUrl });
    }

    res.json({
      success: true,
      message: '头像上传成功',
      data: {
        avatar: avatarUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

// 上传背景图
exports.uploadBackground = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    const backgroundUrl = req.file.s3Url || config.getFileUrl(req.file);

    // 更新个人资料中的背景图
    let profile = await Profile.findOne();
    if (!profile) {
      profile = await Profile.create({ background_image: backgroundUrl });
    } else {
      await profile.update({ background_image: backgroundUrl });
    }

    res.json({
      success: true,
      message: '背景图上传成功',
      data: {
        url: backgroundUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

// 删除头像
exports.deleteAvatar = async (req, res, next) => {
  try {
    // 获取个人资料
    let profile = await Profile.findOne();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '个人资料不存在'
      });
    }

    // 清空头像字段
    await profile.update({ avatar: '' });

    res.json({
      success: true,
      message: '头像删除成功',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

// 上传背景图（别名，用于admin路由）
exports.uploadBackgroundImage = exports.uploadBackground;

// 删除背景图
exports.deleteBackgroundImage = async (req, res, next) => {
  try {
    // 获取个人资料
    let profile = await Profile.findOne();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '个人资料不存在'
      });
    }

    // 清空背景图字段
    await profile.update({ background_image: '' });

    res.json({
      success: true,
      message: '背景图删除成功',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

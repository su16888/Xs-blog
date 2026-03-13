/**
 * @file settingController.js
 * @description Xs-Blog 后台设置控制器（重构版：公开/管理方法分离）
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 2.0.0
 * @created 2025-11-05
 * @updated 2025-11-18
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const Setting = require('../models/Setting');
const upload = require('../middlewares/upload');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const s3Service = require('../services/s3Service');
const { smartDeleteFile } = require('../middlewares/s3Upload');
const databaseEncryption = require('../utils/databaseEncryption');
const { cacheService, CACHE_KEYS } = require('../services/cacheService');

// 定义前端公开需要的设置键
const publicSettingsKeys = [
  'showSiteNav',
  'showNotes',
  'showSocialLinks',
  'themeColor',
  'themeType',
  'footerCopyright',
  'backgroundImage',
  'backgroundOpacity',
  'showAdminLink',
  'defaultDisplaySection',
  'siteTitle',
  'siteSubtitle',
  'siteDescription',
  'siteKeywords',
  'customFont',
  'customFontName',
  'messageIpLimitDays',
  'noteDisplayMode',
  'showNoteCategories',
  'showNoteTags',
  'todoReminderCheckInterval',
  'showNavigationRecommended',
  'noteLayoutColumns',
  'avatarShape',
  'showNoteCover',
  'defaultNoteCover',
  // 导航栏相关设置
  'showTopNavbar',
  'showWapSidebar',
  // Blog 主题相关设置
  'blogLogo',
  'blogLogoText',
  'blogNavLinks',
  'blogCarouselEnabled',
  'blogCarouselImages',
  'blogCarouselWidth',
  'blogProfileEnabled',
  // 缓存时间设置
  'cacheTime',
  // 头像切换主题开关
  'enableAvatarThemeSwitch',
  // 页面文本配置
  'pageTexts',
  'homeContentSections',
  // 官网主题相关设置
  'promoThemeEnabled',
  'promoSettings',
  // 朋友圈主题相关设置
  'socialFeedThemeEnabled',
  'enableSocialFeedPage',
  // 页面访问控制设置
  'enableUserPage',
  'enableBlogPage',
  'enablePromoPage',
  // 文档主题相关设置
  'docsThemeEnabled',
  // 公告栏设置
  'blogAnnouncements',
  'blogAnnouncementEnabled',
  // 隐藏博客模式个人资料卡
  'hideBlogProfileCard',
  // 自定义脚本代码
  'customScript'
];

// ==================== 公开API方法（/api/settings） ====================

// 获取公开设置（只返回 key 和 value）- 带 Redis 缓存
exports.getPublicSettings = async (req, res, next) => {
  try {
    // 设置响应头，防止CDN缓存动态设置
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // 先尝试从 Redis 缓存获取
    const cached = await cacheService.get(CACHE_KEYS.SETTINGS);
    if (cached) {
      res.set({ 'X-Cache': 'HIT' });
      return res.json({
        success: true,
        data: cached
      });
    }

    // 缓存未命中，从数据库获取
    const settings = await Setting.findAll({
      where: { key: publicSettingsKeys },
      attributes: ['key', 'value'],
      order: [['key', 'ASC']]
    });

    // 存入 Redis 缓存（24小时）
    await cacheService.set(CACHE_KEYS.SETTINGS, settings);

    res.set({ 'X-Cache': 'MISS' });
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个公开设置（只返回 key 和 value）
exports.getPublicSetting = async (req, res, next) => {
  try {
    const { key } = req.params;

    // 检查是否是公开设置
    if (!publicSettingsKeys.includes(key)) {
      return res.status(403).json({
        success: false,
        message: '该设置不公开'
      });
    }

    const setting = await Setting.findOne({
      where: { key },
      attributes: ['key', 'value']
    });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: '设置不存在'
      });
    }

    // 根据类型转换值
    let value = setting.value;
    if (setting.type === 'boolean') {
      value = value === 'true';
    } else if (setting.type === 'number') {
      value = parseFloat(value);
    } else if (setting.type === 'json') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        value = setting.value;
      }
    }

    res.json({
      success: true,
      data: {
        key: setting.key,
        value: value
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API方法（/api/admin/settings） ====================

// 获取所有设置（返回完整字段）
exports.getAdminSettings = async (req, res, next) => {
  try {
    const settings = await Setting.findAll({
      order: [['key', 'ASC']]
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个设置（返回完整字段）
exports.getAdminSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ where: { key } });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: '设置不存在'
      });
    }

    let value = setting.value;

    // 根据类型转换值
    if (setting.type === 'boolean') {
      value = value === 'true';
    } else if (setting.type === 'number') {
      value = parseFloat(value);
    } else if (setting.type === 'json') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        value = setting.value;
      }
    }

    res.json({
      success: true,
      data: {
        key: setting.key,
        value: value,
        type: setting.type,
        description: setting.description
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 向后兼容的旧方法（保留以防万一） ====================

// 获取所有设置
exports.getAllSettings = async (req, res, next) => {
  try {
    // 检查是否是已认证用户
    const isAuthenticated = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');

    // 定义前端公开需要的设置键
    const publicSettings = [
      'showSiteNav',
      'showNotes',
      'showSocialLinks',
      'themeColor',
      'themeType',
      'footerCopyright',
      'backgroundImage',
      'backgroundOpacity',
      'showAdminLink',
      'defaultDisplaySection',
      'siteTitle',
      'siteSubtitle',
      'siteDescription',
      'siteKeywords',
      'customFont',
      'customFontName',
      'messageIpLimitDays',
      'noteDisplayMode',
      'showNoteCategories',
      'showNoteTags',
      'showNoteCategories',
      'todoReminderCheckInterval',
      'showNavigationRecommended',
      'noteLayoutColumns',
      'avatarShape',
      'showNoteCover',
      'defaultNoteCover',
      // 导航栏相关设置
      'showTopNavbar',
      'showWapSidebar',
      // Blog 主题相关设置
      'blogLogo',
      'blogLogoText',
      'blogNavLinks',
      'blogCarouselEnabled',
      'blogCarouselImages',
      'blogCarouselWidth',
      'blogProfileEnabled',
      // 缓存时间设置
      'cacheTime',
      // 头像切换主题开关
      'enableAvatarThemeSwitch',
      // 页面文本配置
      'pageTexts',
      'homeContentSections',
      // 官网主题相关设置
      'promoThemeEnabled',
      'promoSettings',
      // 朋友圈主题相关设置
      'socialFeedThemeEnabled',
      'enableSocialFeedPage',
      // 页面访问控制设置
      'enableUserPage',
      'enableBlogPage',
      'enablePromoPage',
      // 文档主题相关设置
      'docsThemeEnabled',
      // 隐藏博客模式个人资料卡
      'hideBlogProfileCard',
      // 自定义脚本代码
      'customScript'
    ];

    let settings;

    // 检查请求路径：/api/settings 是公开接口，即使有token也返回简化数据
    // 只有明确的后台路径（如 /api/admin/settings）才返回完整数据
    const isPublicRequest = !req.path.includes('/admin');

    if (isAuthenticated && !isPublicRequest) {
      // 后台管理请求：返回所有设置（包含完整字段用于后台管理）
      settings = await Setting.findAll({
        order: [['key', 'ASC']]
      });
    } else {
      // 公开请求：只返回公开设置，且只返回必要字段（即使有token）
      settings = await Setting.findAll({
        where: {
          key: publicSettings
        },
        attributes: ['key', 'value'], // 只返回 key 和 value，不返回 id、created_at、updated_at、type、description
        order: [['key', 'ASC']]
      });
    }

    // 设置响应头，防止CDN缓存动态设置
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个设置
exports.getSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ where: { key } });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: '设置不存在'
      });
    }

    let value = setting.value;
    
    // 根据类型转换值
    if (setting.type === 'boolean') {
      value = value === 'true';
    } else if (setting.type === 'number') {
      value = parseFloat(value);
    } else if (setting.type === 'json') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        value = setting.value;
      }
    }

    res.json({
      success: true,
      data: {
        key: setting.key,
        value: value,
        type: setting.type,
        description: setting.description
      }
    });
  } catch (error) {
    next(error);
  }
};

// 更新或创建设置
exports.updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, type, description } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: '设置键不能为空'
      });
    }

    // 转换值为字符串存储
    let stringValue = value;
    if (type === 'json' && typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else if (typeof value !== 'string') {
      stringValue = String(value);
    }

    const [setting, created] = await Setting.findOrCreate({
      where: { key },
      defaults: {
        key,
        value: stringValue,
        type: type || 'string',
        description
      }
    });

    if (!created) {
      await setting.update({
        value: stringValue,
        type: type || setting.type,
        description: description || setting.description
      });
    }

    res.json({
      success: true,
      message: created ? '设置创建成功' : '设置更新成功',
      data: setting
    });
  } catch (error) {
    next(error);
  }
};

// 批量更新设置
exports.updateMultipleSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: '无效的设置数据'
      });
    }

    const results = [];

    for (const item of settings) {
      const { key, value, type } = item;

      if (!key) continue;

      // 转换值为字符串存储
      let stringValue = value;
      let settingType = type || 'string';

      if (typeof value === 'boolean') {
        settingType = 'boolean';
        stringValue = String(value);
      } else if (typeof value === 'number') {
        settingType = 'number';
        stringValue = String(value);
      } else if (typeof value === 'object') {
        settingType = 'json';
        stringValue = JSON.stringify(value);
      }

      const [setting, created] = await Setting.findOrCreate({
        where: { key },
        defaults: {
          key,
          value: stringValue,
          type: settingType
        }
      });

      if (!created) {
        await setting.update({
          value: stringValue,
          type: settingType
        });
      }

      results.push(setting);
    }

    // 清除 Redis 缓存
    cacheService.del(CACHE_KEYS.SETTINGS).catch(err => {
      console.error('[Settings] 清除缓存失败:', err);
    });

    res.json({
      success: true,
      message: '设置更新成功',
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// 删除设置
exports.deleteSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ where: { key } });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: '设置不存在'
      });
    }

    await setting.destroy();

    res.json({
      success: true,
      message: '设置删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 上传背景图片
exports.uploadBackgroundImage = async (req, res, next) => {
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

    // 保存到设置中
    const [setting, created] = await Setting.findOrCreate({
      where: { key: 'backgroundImage' },
      defaults: {
        key: 'backgroundImage',
        value: fileUrl,
        type: 'string',
        description: '前台背景图片'
      }
    });

    if (!created) {
      // 如果已有背景图片设置，先删除旧文件
      const oldValue = setting.value;
      if (oldValue) {
        const oldFilePath = config.getFilePathFromUrl(oldValue);
        if (oldFilePath && fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      await setting.update({
        value: fileUrl,
        type: 'string',
        description: '前台背景图片'
      });
    }

    res.json({
      success: true,
      message: '背景图片上传成功',
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

// 删除背景图片
exports.deleteBackgroundImage = async (req, res, next) => {
  try {
    const setting = await Setting.findOne({ where: { key: 'backgroundImage' } });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: '背景图片设置不存在'
      });
    }

    // 删除文件
    if (setting.value) {
      const filePath = config.getFilePathFromUrl(setting.value);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // 清空设置值
    await setting.update({ value: '' });

    res.json({
      success: true,
      message: '背景图片删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 通用图片上传接口（不保存到设置中）
exports.uploadImage = async (req, res, next) => {
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
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: '不支持的文件类型，请上传 jpg、jpeg、png、gif、webp、svg 或 ico 格式的图片'
      });
    }

    // 构建文件访问URL，优先使用S3 URL
    const fileUrl = req.file.s3Url || config.getFileUrl(req.file);

    res.json({
      success: true,
      message: '图片上传成功',
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

// 上传自定义字体
exports.uploadCustomFont = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的字体文件'
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const allowedExtensions = ['.ttf', '.otf', '.woff', '.woff2', '.eot'];

    // 双重验证：扩展名检查
    if (!allowedExtensions.includes(ext)) {
      // 删除上传的文件
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: '不支持的文件类型，请上传 ttf、otf、woff、woff2 格式的字体文件'
      });
    }

    // 检查文件大小（10MB限制）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      // 删除上传的文件
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: '字体文件大小不能超过 10MB'
      });
    }

    // 验证字体文件完整性（基本检查）
    try {
      const fileBuffer = fs.readFileSync(req.file.path);

      // 检查文件是否为空
      if (fileBuffer.length === 0) {
        throw new Error('字体文件为空');
      }

      // 检查TTF/OTF文件签名
      if (ext === '.ttf' || ext === '.otf') {
        // 读取前4个字节
        const signature = fileBuffer.slice(0, 4);

        // 检查各种有效的字体签名：
        // 1. 0x00010000 - 标准TrueType字体（最常见）
        // 2. 'OTTO' - OpenType字体（CFF）
        // 3. 'true' - 旧的Apple TrueType字体
        // 4. 'typ1' - OpenType字体（PostScript）
        const isTrueType = signature[0] === 0x00 && signature[1] === 0x01 && signature[2] === 0x00 && signature[3] === 0x00;
        const signatureString = signature.toString('ascii');
        const isValidFont = isTrueType || signatureString === 'OTTO' || signatureString === 'true' || signatureString === 'typ1';

        if (!isValidFont) {
          throw new Error('无效的TTF/OTF字体文件');
        }
      }

      // 检查WOFF文件签名
      if (ext === '.woff') {
        const signature = fileBuffer.toString('ascii', 0, 4);
        if (signature !== 'wOFF') {
          throw new Error('无效的WOFF字体文件');
        }
      }

      // 检查WOFF2文件签名
      if (ext === '.woff2') {
        const signature = fileBuffer.toString('ascii', 0, 4);
        if (signature !== 'wOF2') {
          throw new Error('无效的WOFF2字体文件');
        }
      }
    } catch (validationError) {
      // 删除无效的字体文件
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: `字体文件验证失败：${validationError.message}`
      });
    }

    // 构建文件访问URL，优先使用S3 URL
    const fileUrl = req.file.s3Url || config.getFileUrl(req.file);
    const originalName = req.file.originalname;

    // 保存到设置中
    const [setting, created] = await Setting.findOrCreate({
      where: { key: 'customFont' },
      defaults: {
        key: 'customFont',
        value: fileUrl,
        type: 'string',
        description: '自定义字体文件'
      }
    });

    if (!created) {
      // 如果已有自定义字体设置，先删除旧文件
      const oldValue = setting.value;
      if (oldValue) {
        const oldFilePath = config.getFilePathFromUrl(oldValue);
        if (oldFilePath && fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      await setting.update({
        value: fileUrl,
        type: 'string',
        description: '自定义字体文件'
      });
    }

    // 保存字体原始文件名
    const [fontNameSetting] = await Setting.findOrCreate({
      where: { key: 'customFontName' },
      defaults: {
        key: 'customFontName',
        value: originalName,
        type: 'string',
        description: '自定义字体文件名'
      }
    });

    if (fontNameSetting) {
      await fontNameSetting.update({ value: originalName });
    }

    res.json({
      success: true,
      message: '字体上传成功',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: originalName,
        size: req.file.size
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

// 删除自定义字体
exports.deleteCustomFont = async (req, res, next) => {
  try {
    const setting = await Setting.findOne({ where: { key: 'customFont' } });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: '自定义字体设置不存在'
      });
    }

    // 删除文件
    if (setting.value) {
      const filePath = config.getFilePathFromUrl(setting.value);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // 将字体设置为空字符串而不是删除记录
    await setting.update({ value: '' });

    // 将字体文件名设置为空字符串
    const fontNameSetting = await Setting.findOne({ where: { key: 'customFontName' } });
    if (fontNameSetting) {
      await fontNameSetting.update({ value: '' });
    }

    res.json({
      success: true,
      message: '自定义字体删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 通用图片删除接口（用于博客主题等模块）
exports.deleteImage = async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的图片URL'
      });
    }

    // 删除文件
    const filePath = config.getFilePathFromUrl(url);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 官网主题图片上传接口（保存到 uploads/official 目录）
exports.uploadOfficialImage = async (req, res, next) => {
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
      message: '图片上传成功',
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

// 删除官网主题图片
exports.deleteOfficialImage = async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的图片URL'
      });
    }

    // 删除文件
    const filePath = config.getFilePathFromUrl(url);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== S3存储配置相关API ====================

// 获取S3存储配置
exports.getS3Config = async (req, res, next) => {
  try {
    const s3Config = await s3Service.getS3Config();

    // 不返回敏感信息（secretAccessKey）
    res.json({
      success: true,
      data: {
        storageType: s3Config.storageType,
        endpoint: s3Config.endpoint,
        region: s3Config.region,
        bucket: s3Config.bucket,
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey ? '******' : '',
        customDomain: s3Config.customDomain,
        pathStyle: s3Config.pathStyle
      }
    });
  } catch (error) {
    next(error);
  }
};

// 保存S3存储配置
exports.saveS3Config = async (req, res, next) => {
  try {
    const {
      storageType,
      endpoint,
      region,
      bucket,
      accessKeyId,
      secretAccessKey,
      customDomain,
      pathStyle
    } = req.body;

    // 验证必填字段（当存储类型为S3时）
    if (storageType === 's3') {
      if (!endpoint || !bucket || !accessKeyId) {
        return res.status(400).json({
          success: false,
          message: '使用S3存储时，端点地址、存储桶名称和Access Key ID为必填项'
        });
      }
    }

    // 保存配置
    const configItems = [
      { key: 'storageType', value: storageType || 'local', type: 'string', description: '存储类型：local或s3' },
      { key: 's3Endpoint', value: endpoint || '', type: 'string', description: 'S3端点地址' },
      { key: 's3Region', value: region || 'us-east-1', type: 'string', description: 'S3区域' },
      { key: 's3Bucket', value: bucket || '', type: 'string', description: 'S3存储桶名称' },
      { key: 's3AccessKeyId', value: accessKeyId || '', type: 'string', description: 'S3 Access Key ID' },
      { key: 's3CustomDomain', value: customDomain || '', type: 'string', description: 'S3自定义域名' },
      { key: 's3PathStyle', value: pathStyle ? 'true' : 'false', type: 'string', description: 'S3路径风格' }
    ];

    // 只有当提供了新的secretAccessKey时才更新
    if (secretAccessKey && secretAccessKey !== '******') {
      configItems.push({
        key: 's3SecretAccessKey',
        value: secretAccessKey,
        type: 'string',
        description: 'S3 Secret Access Key'
      });
    }

    for (const item of configItems) {
      const [setting, created] = await Setting.findOrCreate({
        where: { key: item.key },
        defaults: item
      });

      if (!created) {
        await setting.update({
          value: item.value,
          type: item.type,
          description: item.description
        });
      }
    }

    // 刷新S3客户端
    await s3Service.refreshS3Client();

    res.json({
      success: true,
      message: 'S3配置保存成功'
    });
  } catch (error) {
    next(error);
  }
};

// 测试S3连接
exports.testS3Connection = async (req, res, next) => {
  try {
    const {
      endpoint,
      region,
      bucket,
      accessKeyId,
      secretAccessKey,
      pathStyle
    } = req.body;

    // 验证必填字段
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return res.status(400).json({
        success: false,
        message: '请填写完整的S3配置信息'
      });
    }

    // 处理 accessKeyId - 如果是掩码或加密值，从数据库获取并解密
    let realAccessKeyId = accessKeyId;
    if (accessKeyId === '******' || databaseEncryption.isEncrypted(accessKeyId)) {
      const setting = await Setting.findOne({ where: { key: 's3AccessKeyId' } });
      if (setting) {
        realAccessKeyId = databaseEncryption.isEncrypted(setting.value)
          ? databaseEncryption.decryptField(setting.value)
          : setting.value;
      } else {
        return res.status(400).json({
          success: false,
          message: '请输入Access Key ID'
        });
      }
    }

    // 处理 secretAccessKey - 如果是掩码或加密值，从数据库获取并解密
    let realSecretKey = secretAccessKey;
    if (secretAccessKey === '******' || databaseEncryption.isEncrypted(secretAccessKey)) {
      const setting = await Setting.findOne({ where: { key: 's3SecretAccessKey' } });
      if (setting) {
        realSecretKey = databaseEncryption.isEncrypted(setting.value)
          ? databaseEncryption.decryptField(setting.value)
          : setting.value;
      } else {
        return res.status(400).json({
          success: false,
          message: '请输入Secret Access Key'
        });
      }
    }

    const result = await s3Service.testS3Connection({
      endpoint,
      region: region || 'us-east-1',
      bucket,
      accessKeyId: realAccessKeyId,
      secretAccessKey: realSecretKey,
      pathStyle
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @file pageTextController.js
 * @description Xs-Blog 页面文本配置控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-12-16
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const PageText = require('../models/PageText');
const { cacheService, CACHE_KEYS } = require('../services/cacheService');

// ==================== 公开API方法（/api/page-texts） ====================

/**
 * 获取所有页面文本配置（公开）- 带 Redis 缓存
 */
exports.getAllPageTexts = async (req, res, next) => {
  try {
    // 设置响应头，防止CDN缓存动态数据
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // 先尝试从 Redis 缓存获取
    const cached = await cacheService.get(CACHE_KEYS.PAGE_TEXTS);
    if (cached) {
      res.set({ 'X-Cache': 'HIT' });
      return res.json({
        success: true,
        data: cached
      });
    }

    const pageTexts = await PageText.findAll({
      attributes: ['pageKey', 'title', 'description', 'browserTitle', 'browserSubtitle', 'usageTitle', 'usageContent'],
      order: [['id', 'ASC']]
    });

    // 转换为对象格式，方便前端使用
    const result = {};
    pageTexts.forEach(item => {
      result[item.pageKey] = {
        title: item.title || '',
        description: item.description || '',
        browserTitle: item.browserTitle || '',
        browserSubtitle: item.browserSubtitle || '',
        usageTitle: item.usageTitle || '',
        usageContent: item.usageContent || ''
      };
    });

    // 存入 Redis 缓存（24小时）
    await cacheService.set(CACHE_KEYS.PAGE_TEXTS, result);

    res.set({ 'X-Cache': 'MISS' });
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取单个页面文本配置（公开）
 */
exports.getPageText = async (req, res, next) => {
  try {
    const { pageKey } = req.params;

    const pageText = await PageText.findOne({
      where: { pageKey },
      attributes: ['pageKey', 'title', 'description', 'browserTitle', 'browserSubtitle', 'usageTitle', 'usageContent']
    });

    if (!pageText) {
      return res.status(404).json({
        success: false,
        message: '页面配置不存在'
      });
    }

    res.json({
      success: true,
      data: {
        title: pageText.title || '',
        description: pageText.description || '',
        browserTitle: pageText.browserTitle || '',
        browserSubtitle: pageText.browserSubtitle || '',
        usageTitle: pageText.usageTitle || '',
        usageContent: pageText.usageContent || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API方法（/api/admin/page-texts） ====================

/**
 * 获取所有页面文本配置（管理）
 */
exports.getAdminPageTexts = async (req, res, next) => {
  try {
    const pageTexts = await PageText.findAll({
      order: [['id', 'ASC']]
    });

    // 转换为对象格式
    const result = {};
    pageTexts.forEach(item => {
      result[item.pageKey] = {
        id: item.id,
        title: item.title || '',
        description: item.description || '',
        browserTitle: item.browserTitle || '',
        browserSubtitle: item.browserSubtitle || '',
        usageTitle: item.usageTitle || '',
        usageContent: item.usageContent || ''
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新单个页面文本配置
 */
exports.updatePageText = async (req, res, next) => {
  try {
    const { pageKey } = req.params;
    const { title, description, browserTitle, browserSubtitle, usageTitle, usageContent } = req.body;

    let pageText = await PageText.findOne({ where: { pageKey } });

    if (!pageText) {
      // 如果不存在，创建新记录
      pageText = await PageText.create({
        pageKey,
        title: title || '',
        description: description || '',
        browserTitle: browserTitle || '',
        browserSubtitle: browserSubtitle || '',
        usageTitle: usageTitle || '',
        usageContent: usageContent || ''
      });
    } else {
      // 更新现有记录
      await pageText.update({
        title: title !== undefined ? title : pageText.title,
        description: description !== undefined ? description : pageText.description,
        browserTitle: browserTitle !== undefined ? browserTitle : pageText.browserTitle,
        browserSubtitle: browserSubtitle !== undefined ? browserSubtitle : pageText.browserSubtitle,
        usageTitle: usageTitle !== undefined ? usageTitle : pageText.usageTitle,
        usageContent: usageContent !== undefined ? usageContent : pageText.usageContent
      });
    }

    res.json({
      success: true,
      message: '页面文本配置更新成功',
      data: pageText
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 批量更新页面文本配置
 */
exports.updateAllPageTexts = async (req, res, next) => {
  try {
    const { pageTexts } = req.body;

    if (!pageTexts || typeof pageTexts !== 'object') {
      return res.status(400).json({
        success: false,
        message: '无效的页面文本配置数据'
      });
    }

    const results = [];

    for (const [pageKey, config] of Object.entries(pageTexts)) {
      const { title, description, browserTitle, browserSubtitle, usageTitle, usageContent } = config;

      let pageText = await PageText.findOne({ where: { pageKey } });

      if (!pageText) {
        // 创建新记录
        pageText = await PageText.create({
          pageKey,
          title: title || '',
          description: description || '',
          browserTitle: browserTitle || '',
          browserSubtitle: browserSubtitle || '',
          usageTitle: usageTitle || '',
          usageContent: usageContent || ''
        });
      } else {
        // 更新现有记录
        await pageText.update({
          title: title !== undefined ? title : pageText.title,
          description: description !== undefined ? description : pageText.description,
          browserTitle: browserTitle !== undefined ? browserTitle : pageText.browserTitle,
          browserSubtitle: browserSubtitle !== undefined ? browserSubtitle : pageText.browserSubtitle,
          usageTitle: usageTitle !== undefined ? usageTitle : pageText.usageTitle,
          usageContent: usageContent !== undefined ? usageContent : pageText.usageContent
        });
      }

      results.push(pageText);
    }

    // 清除 Redis 缓存
    cacheService.del(CACHE_KEYS.PAGE_TEXTS).catch(err => {
      console.error('[PageTexts] 清除缓存失败:', err);
    });

    res.json({
      success: true,
      message: '页面文本配置批量更新成功',
      data: results
    });
  } catch (error) {
    next(error);
  }
};

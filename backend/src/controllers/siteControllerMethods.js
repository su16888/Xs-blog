/**
 * @file siteControllerMethods.js
 * @description 网站导航控制器的公开/管理方法（需要添加到 siteController.js）
 */

const { Op } = require('sequelize');

// ==================== 公开API方法（/api/sites） ====================

// 获取前端可见站点（公开访问，只返回展示字段）
exports.getPublicSites = async (req, res, next) => {
  try {
    const { category } = req.query;
    // 前端可见：display_type 为 'frontend' 或 'both'
    const where = {
      display_type: { [Op.in]: ['frontend', 'both'] }
    };

    if (category) {
      where.category = category;
    }

    const sites = await Site.findAll({
      where,
      attributes: ['name', 'description', 'logo', 'link'],
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: sites
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API方法（/api/admin/sites） ====================

// 获取所有站点（管理后台，返回完整字段）
exports.getAdminSites = async (req, res, next) => {
  try {
    const { category } = req.query;
    const where = {};

    if (category) {
      where.category = category;
    }

    const sites = await Site.findAll({
      where,
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: sites
    });
  } catch (error) {
    next(error);
  }
};

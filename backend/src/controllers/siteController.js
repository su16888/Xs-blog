/**
 * @file siteController.js
 * @description Xs-Blog 网站导航控制器（重构版：公开/管理方法分离）
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 2.0.0
 * @created 2025-11-06
 * @updated 2025-11-18
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const Site = require('../models/Site');
const NavigationCategory = require('../models/NavigationCategory');
const Setting = require('../models/Setting');
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
    const { category, search } = req.query;
    const pagingEnabled = req.query.page !== undefined || req.query.limit !== undefined;

    const where = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { link: { [Op.like]: `%${search}%` } }
      ];
    }

    if (!pagingEnabled) {
      const sites = await Site.findAll({
        where,
        order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
      });

      return res.json({
        success: true,
        data: sites
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows } = await Site.findAndCountAll({
      where,
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: limit
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 向后兼容的旧方法 ====================

// 获取所有网站
exports.getAllSites = async (req, res, next) => {
  try {
    // 检查是否是已认证用户
    const isAuthenticated = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');

    // 检查请求路径：公开请求即使有token也返回简化数据
    const isPublicRequest = !req.path.includes('/admin');

    const { category } = req.query;
    const where = {};

    if (category) {
      where.category = category;
    }

    // 公开请求只返回前端可见的站点（即使有token）
    if (isPublicRequest) {
      where.display_type = { [Op.in]: ['frontend', 'both'] };
    }

    const sites = await Site.findAll({
      where,
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
      // 公开请求只返回必要字段，即使有token
      attributes: (isAuthenticated && !isPublicRequest)
        ? undefined // 后台管理：返回所有字段
        : ['name', 'description', 'logo', 'link'] // 公开访问：只返回展示字段
    });

    res.json({
      success: true,
      data: sites
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个网站
exports.getSite = async (req, res, next) => {
  try {
    // 检查是否是已认证用户
    const isAuthenticated = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');

    // 检查请求路径：公开请求即使有token也返回简化数据
    const isPublicRequest = !req.path.includes('/admin');

    const { id } = req.params;

    // 构建查询条件
    const where = { id };

    // 公开请求只能访问前端可见的站点（即使有token）
    if (isPublicRequest) {
      where.display_type = { [Op.in]: ['frontend', 'both'] };
    }

    const site = await Site.findOne({
      where,
      // 公开请求只返回必要字段，即使有token
      attributes: (isAuthenticated && !isPublicRequest)
        ? undefined // 后台管理：返回所有字段
        : ['name', 'description', 'logo', 'link'] // 公开访问：只返回展示字段
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: '网站不存在'
      });
    }

    res.json({
      success: true,
      data: site
    });
  } catch (error) {
    next(error);
  }
};

// 创建网站
exports.createSite = async (req, res, next) => {
  try {
    const { name, link, description, logo, sort_order, display_type, category_id, is_recommended } = req.body;

    if (!name || !link) {
      return res.status(400).json({
        success: false,
        message: '名称和链接不能为空'
      });
    }

    // 如果指定了分类，验证分类是否存在
    if (category_id) {
      const category = await NavigationCategory.findByPk(category_id);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: '指定的分类不存在'
        });
      }
    }

    const site = await Site.create({
      name,
      link,
      description,
      logo,
      sort_order,
      display_type: display_type || 'both',
      category_id: category_id || null,
      is_recommended: is_recommended || false
    });

    res.status(201).json({
      success: true,
      message: '网站创建成功',
      data: site
    });
  } catch (error) {
    next(error);
  }
};

// 更新网站
exports.updateSite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, link, description, logo, sort_order, display_type, category_id, is_recommended } = req.body;

    const site = await Site.findByPk(id);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: '网站不存在'
      });
    }

    // 如果指定了分类，验证分类是否存在
    if (category_id !== undefined && category_id !== null) {
      const category = await NavigationCategory.findByPk(category_id);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: '指定的分类不存在'
        });
      }
    }

    await site.update({
      name: name !== undefined ? name : site.name,
      link: link !== undefined ? link : site.link,
      description: description !== undefined ? description : site.description,
      logo: logo !== undefined ? logo : site.logo,
      sort_order: sort_order !== undefined ? sort_order : site.sort_order,
      display_type: display_type !== undefined ? display_type : site.display_type,
      category_id: category_id !== undefined ? category_id : site.category_id,
      is_recommended: is_recommended !== undefined ? is_recommended : site.is_recommended
    });

    res.json({
      success: true,
      message: '网站更新成功',
      data: site
    });
  } catch (error) {
    next(error);
  }
};

// 删除网站
exports.deleteSite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const site = await Site.findByPk(id);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: '网站不存在'
      });
    }

    await site.destroy();

    res.json({
      success: true,
      message: '网站删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 获取按分类分组的站点（用于前台展示）
exports.getSitesGroupedByCategory = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, search, category_id } = req.query;
    const pagingEnabled = req.query.page !== undefined || req.query.limit !== undefined || req.query.search !== undefined || req.query.category_id !== undefined;
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.max(parseInt(limit, 10) || 30, 1);
    const offset = (currentPage - 1) * perPage;

    // 获取导航推荐功能开关设置
    const showRecommendedSetting = await Setting.findOne({
      where: { key: 'showNavigationRecommended' }
    });
    const showRecommended = showRecommendedSetting
      ? showRecommendedSetting.value === 'true'
      : true;

    const where = { display_type: { [Op.in]: ['frontend', 'both'] } };

    if (category_id) {
      where.category_id = category_id;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const queryOptions = {
      where,
      include: [{
        model: NavigationCategory,
        as: 'category',
        attributes: ['id', 'name', 'description', 'icon', 'sort_order'],
        where: { is_visible: true },
        required: false
      }],
      order: [
        ['is_recommended', 'DESC'],
        [{ model: NavigationCategory, as: 'category' }, 'sort_order', 'ASC'],
        ['sort_order', 'ASC'],
        ['created_at', 'DESC']
      ],
      attributes: ['id', 'name', 'description', 'logo', 'link', 'is_recommended', 'category_id', 'sort_order'],
      distinct: true
    };

    let sites = [];
    let totalCount = 0;

    if (pagingEnabled) {
      const result = await Site.findAndCountAll({
        ...queryOptions,
        limit: perPage,
        offset
      });
      sites = result.rows;
      totalCount = result.count;
    } else {
      sites = await Site.findAll(queryOptions);
      totalCount = sites.length;
    }

    // 分离推荐站点
    const recommended = showRecommended
      ? sites.filter(site => site.is_recommended)
      : [];

    // 按分类分组
    const categoryMap = new Map();
    const uncategorizedSites = [];

    sites.forEach(site => {
      // 如果没有分类，添加到未分类列表
      if (!site.category_id || !site.category) {
        uncategorizedSites.push({
          id: site.id,
          name: site.name,
          description: site.description,
          logo: site.logo,
          link: site.link
        });
        return;
      }

      const catId = site.category_id;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          category: {
            id: site.category.id,
            name: site.category.name,
            description: site.category.description,
            icon: site.category.icon,
            sort_order: site.category.sort_order
          },
          sites: []
        });
      }

      // 只返回必要的站点字段，不包含敏感信息
      categoryMap.get(catId).sites.push({
        id: site.id,
        name: site.name,
        description: site.description,
        logo: site.logo,
        link: site.link
      });
    });

    // 转换为数组，保持排序
    const categories = Array.from(categoryMap.values());

    // 如果有未分类的站点，添加到分类列表末尾
    if (uncategorizedSites.length > 0) {
      categories.push({
        category: {
          id: null,
          name: '未分类',
          description: '暂未分类的导航站点',
          icon: '📂',
          sort_order: 0
        },
        sites: uncategorizedSites
      });
    }

    const responseData = {
      showRecommended,
      // 只返回必要的推荐站点字段，不包含敏感信息
      recommended: recommended.map(site => ({
        id: site.id,
        name: site.name,
        description: site.description,
        logo: site.logo,
        link: site.link
      })),
      categories
    };

    if (pagingEnabled) {
      responseData.pagination = {
        current_page: currentPage,
        total_pages: Math.ceil(totalCount / perPage),
        total_count: totalCount,
        per_page: perPage
      };
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

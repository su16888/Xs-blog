/**
 * @file serviceCategoryController.js
 * @description Xs-Blog 服务分类控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-25
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const ServiceCategory = require('../models/ServiceCategory');
const Service = require('../models/Service');

// ==================== 公开API方法（/api/service-categories） ====================

// 获取前端可见分类（公开访问）
exports.getPublicCategories = async (req, res, next) => {
  try {
    const categories = await ServiceCategory.findAll({
      where: { is_visible: true },
      attributes: ['id', 'name', 'description', 'icon'],
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API方法（/api/admin/service-categories） ====================

// 获取所有分类（管理后台）
exports.getAdminCategories = async (req, res, next) => {
  try {
    const { is_visible } = req.query;
    const where = {};

    if (is_visible !== undefined) {
      where.is_visible = is_visible === 'true';
    }

    const categories = await ServiceCategory.findAll({
      where,
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个分类（管理后台）
exports.getAdminCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await ServiceCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// 创建分类
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, icon, sort_order, is_visible } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '分类名称不能为空'
      });
    }

    const category = await ServiceCategory.create({
      name,
      description,
      icon,
      sort_order: sort_order || 0,
      is_visible: is_visible !== undefined ? is_visible : true
    });

    res.status(201).json({
      success: true,
      message: '分类创建成功',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// 更新分类
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, sort_order, is_visible } = req.body;

    const category = await ServiceCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    await category.update({
      name: name !== undefined ? name : category.name,
      description: description !== undefined ? description : category.description,
      icon: icon !== undefined ? icon : category.icon,
      sort_order: sort_order !== undefined ? sort_order : category.sort_order,
      is_visible: is_visible !== undefined ? is_visible : category.is_visible
    });

    res.json({
      success: true,
      message: '分类更新成功',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// 删除分类
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await ServiceCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 检查该分类下是否有服务
    const servicesCount = await Service.count({
      where: { category_id: id }
    });

    if (servicesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `该分类下有 ${servicesCount} 个服务，无法删除。请先移除或删除这些服务。`
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: '分类删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 批量删除分类
exports.batchDeleteCategories = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的分类ID列表'
      });
    }

    // 检查这些分类下是否有服务
    const servicesCount = await Service.count({
      where: { category_id: ids }
    });

    if (servicesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `这些分类下共有 ${servicesCount} 个服务，无法删除。请先移除或删除这些服务。`
      });
    }

    await ServiceCategory.destroy({
      where: { id: ids }
    });

    res.json({
      success: true,
      message: `成功删除 ${ids.length} 个分类`
    });
  } catch (error) {
    next(error);
  }
};

// 获取分类及其服务数量统计
exports.getCategoriesWithStats = async (req, res, next) => {
  try {
    const categories = await ServiceCategory.findAll({
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
      include: [
        {
          model: Service,
          as: 'services',
          attributes: [],
          required: false
        }
      ],
      attributes: {
        include: [
          [
            require('sequelize').fn('COUNT', require('sequelize').col('services.id')),
            'service_count'
          ]
        ]
      },
      group: ['ServiceCategory.id']
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

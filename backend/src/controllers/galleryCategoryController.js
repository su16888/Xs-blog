/**
 * @file galleryCategoryController.js
 * @description Xs-Blog 图册分类控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-25
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const GalleryCategory = require('../models/GalleryCategory');
const Gallery = require('../models/Gallery');

// ==================== 公开API方法 ====================

// 获取可见的图册分类列表（公开访问）
exports.getPublicCategories = async (req, res, next) => {
  try {
    const categories = await GalleryCategory.findAll({
      where: { is_visible: true },
      attributes: ['id', 'name', 'description', 'icon', 'sort_order'],
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

// ==================== 管理API方法 ====================

// 获取所有分类（管理后台）
exports.getAdminCategories = async (req, res, next) => {
  try {
    const categories = await GalleryCategory.findAll({
      include: [{
        model: Gallery,
        as: 'galleries',
        attributes: ['id']
      }],
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    // 添加图册数量统计
    const processedCategories = categories.map(category => {
      const categoryData = category.toJSON();
      categoryData.galleryCount = categoryData.galleries ? categoryData.galleries.length : 0;
      delete categoryData.galleries;
      return categoryData;
    });

    res.json({
      success: true,
      data: processedCategories
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个分类
exports.getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await GalleryCategory.findByPk(id, {
      include: [{
        model: Gallery,
        as: 'galleries',
        attributes: ['id', 'title']
      }]
    });

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

    // 检查分类名称是否已存在
    const existingCategory = await GalleryCategory.findOne({
      where: { name }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: '分类名称已存在'
      });
    }

    const category = await GalleryCategory.create({
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

    const category = await GalleryCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 如果更新名称，检查是否与其他分类重名
    if (name && name !== category.name) {
      const existingCategory = await GalleryCategory.findOne({
        where: { name }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: '分类名称已存在'
        });
      }
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
    const category = await GalleryCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 检查分类下是否有图册
    const galleryCount = await Gallery.count({
      where: { category_id: id }
    });

    if (galleryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `该分类下有 ${galleryCount} 个图册，无法删除。请先将图册移到其他分类或删除图册。`
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

// 批量更新分类排序
exports.updateCategoryOrder = async (req, res, next) => {
  try {
    const { categoryOrders } = req.body; // [{ id: 1, sort_order: 0 }, { id: 2, sort_order: 1 }, ...]

    if (!categoryOrders || !Array.isArray(categoryOrders)) {
      return res.status(400).json({
        success: false,
        message: '无效的排序数据'
      });
    }

    // 批量更新排序
    await Promise.all(
      categoryOrders.map(({ id, sort_order }) =>
        GalleryCategory.update(
          { sort_order },
          { where: { id } }
        )
      )
    );

    res.json({
      success: true,
      message: '排序更新成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;

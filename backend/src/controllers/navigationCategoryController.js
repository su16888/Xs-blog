/**
 * @file navigationCategoryController.js
 * @description Xs-Blog 导航分类控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-10
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const NavigationCategory = require('../models/NavigationCategory');
const Site = require('../models/Site');

// 获取所有导航分类
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await NavigationCategory.findAll({
      where: { is_visible: true },
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
      include: [{
        model: Site,
        as: 'sites',
        attributes: ['id', 'name'],
        required: false
      }]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个导航分类
exports.getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await NavigationCategory.findByPk(id, {
      include: [{
        model: Site,
        as: 'sites',
        attributes: ['id', 'name', 'link', 'description', 'logo'],
        required: false
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

// 创建导航分类
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
    const existingCategory = await NavigationCategory.findOne({ where: { name } });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: '分类名称已存在'
      });
    }

    const category = await NavigationCategory.create({
      name,
      description,
      icon,
      sort_order: sort_order !== undefined ? sort_order : 0,
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

// 更新导航分类
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, sort_order, is_visible } = req.body;

    const category = await NavigationCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 如果修改了名称，检查新名称是否已存在
    if (name && name !== category.name) {
      const existingCategory = await NavigationCategory.findOne({ where: { name } });
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

// 删除导航分类
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await NavigationCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 检查是否有站点使用此分类
    const sitesCount = await Site.count({ where: { category_id: id } });
    if (sitesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `无法删除该分类，还有 ${sitesCount} 个站点正在使用此分类`
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

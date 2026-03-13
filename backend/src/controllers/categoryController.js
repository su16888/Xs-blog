/**
 * @file categoryController.js
 * @description Xs-Blog 分类控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const Category = require('../models/Category');
const { Op } = require('sequelize');

/**
 * 获取所有分类
 * GET /api/categories
 * 支持query参数: type (note|sticky_note|tag), search
 */
exports.getAllCategories = async (req, res) => {
  try {
    const { type, search } = req.query;
    const where = {};

    // 类型筛选
    if (type) {
      where.type = type;
    }

    // 关键词搜索
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const categories = await Category.findAll({
      where,
      include: [
        {
          model: Category,
          as: 'children',
          required: false
        },
        {
          model: Category,
          as: 'parent',
          required: false
        }
      ],
      order: [
        ['sort_order', 'ASC'],
        ['created_at', 'DESC']
      ]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取分类失败'
    });
  }
};

/**
 * 获取单个分类
 * GET /api/categories/:id
 */
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'children'
        },
        {
          model: Category,
          as: 'parent'
        }
      ]
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
    res.status(500).json({
      success: false,
      message: '获取分类失败'
    });
  }
};

/**
 * 创建分类
 * POST /api/categories
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, type, description, icon, sort_order, parent_id } = req.body;

    // 验证必填字段
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '分类名称为必填项'
      });
    }

    // 如果没有提供 type，默认为 'note'
    const categoryType = type || 'note';

    // 检查同类型下是否已存在同名分类
    const existing = await Category.findOne({
      where: { name, type: categoryType }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: '该分类已存在'
      });
    }

    const category = await Category.create({
      name,
      type: categoryType,
      description,
      icon,
      sort_order: sort_order || 0,
      parent_id: parent_id || null
    });

    res.status(201).json({
      success: true,
      message: '分类创建成功',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建分类失败'
    });
  }
};

/**
 * 更新分类
 * PUT /api/categories/:id
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, description, icon, sort_order, parent_id } = req.body;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 如果修改了名称或类型，检查是否冲突
    if ((name && name !== category.name) || (type && type !== category.type)) {
      const existing = await Category.findOne({
        where: {
          name: name || category.name,
          type: type || category.type,
          id: { [Op.ne]: id }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: '该分类已存在'
        });
      }
    }

    // 更新分类
    await category.update({
      name: name !== undefined ? name : category.name,
      type: type !== undefined ? type : category.type,
      description: description !== undefined ? description : category.description,
      icon: icon !== undefined ? icon : category.icon,
      sort_order: sort_order !== undefined ? sort_order : category.sort_order,
      parent_id: parent_id !== undefined ? parent_id : category.parent_id
    });

    res.json({
      success: true,
      message: '分类更新成功',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新分类失败'
    });
  }
};

/**
 * 删除分类
 * DELETE /api/categories/:id
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 检查是否有子分类
    const childrenCount = await Category.count({
      where: { parent_id: id }
    });

    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        message: '该分类下还有子分类，无法删除'
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: '分类删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除分类失败'
    });
  }
};

/**
 * 获取分类统计信息
 * GET /api/categories/stats
 */
exports.getCategoryStats = async (req, res) => {
  try {
    const { type } = req.query;
    const { sequelize } = require('../config/database');

    let countField, tableName;

    switch (type) {
      case 'note':
        countField = 'notes.category_id';
        tableName = 'notes';
        break;
      case 'sticky_note':
        countField = 'sticky_notes.category_id';
        tableName = 'sticky_notes';
        break;
      case 'tag':
        countField = 'tags.category_id';
        tableName = 'tags';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '请指定类型参数 (note|sticky_note|tag)'
        });
    }

    // 查询每个分类的使用次数
    const stats = await sequelize.query(`
      SELECT
        c.*,
        COUNT(t.category_id) as usage_count
      FROM categories c
      LEFT JOIN ${tableName} t ON c.id = t.category_id
      WHERE c.type = :type
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.created_at DESC
    `, {
      replacements: { type },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取分类统计失败'
    });
  }
};

// 别名，用于admin路由
exports.getCategory = exports.getCategoryById;

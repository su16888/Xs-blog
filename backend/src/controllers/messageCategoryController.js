/**
 * @file messageCategoryController.js
 * @description Xs-Blog 留言分类控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-18
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const MessageCategory = require('../models/MessageCategory');
const Message = require('../models/Message');

// 获取所有留言分类
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await MessageCategory.findAll({
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
      include: [{
        model: Message,
        as: 'messages',
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

// 获取单个留言分类
exports.getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await MessageCategory.findByPk(id, {
      include: [{
        model: Message,
        as: 'messages',
        attributes: ['id', 'name', 'content', 'status'],
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

// 创建留言分类
exports.createCategory = async (req, res, next) => {
  try {
    const { name, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '分类名称不能为空'
      });
    }

    // 检查分类名称是否已存在
    const existingCategory = await MessageCategory.findOne({ where: { name } });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: '分类名称已存在'
      });
    }

    const category = await MessageCategory.create({
      name,
      sort_order: sort_order !== undefined ? sort_order : 0
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

// 更新留言分类
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sort_order } = req.body;

    const category = await MessageCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 如果修改了名称，检查新名称是否已存在
    if (name && name !== category.name) {
      const existingCategory = await MessageCategory.findOne({ where: { name } });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: '分类名称已存在'
        });
      }
    }

    await category.update({
      name: name !== undefined ? name : category.name,
      sort_order: sort_order !== undefined ? sort_order : category.sort_order
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

// 删除留言分类
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await MessageCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 检查是否有留言使用此分类
    const messagesCount = await Message.count({ where: { category_id: id } });
    if (messagesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `无法删除该分类，还有 ${messagesCount} 条留言正在使用此分类`
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

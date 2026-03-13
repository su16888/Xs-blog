/**
 * @file stickyNoteController.js
 * @description Xs-Blog 便签控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { StickyNote } = require('../models');
const { Op } = require('sequelize');

// 获取所有便签（支持分类筛选和搜索）
exports.getStickyNotes = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const pagingEnabled = req.query.page !== undefined || req.query.limit !== undefined;

    // 构建查询条件
    const where = {};

    // 分类筛选
    if (category) {
      where.category = category;
    }

    // 关键词搜索（标题或内容）
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    if (!pagingEnabled) {
      const notes = await StickyNote.findAll({
        where,
        order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
      });

      return res.json({
        success: true,
        data: notes
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows } = await StickyNote.findAndCountAll({
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

// 获取所有分类
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await StickyNote.findAll({
      attributes: ['category'],
      where: {
        category: {
          [Op.ne]: null,
          [Op.ne]: ''
        }
      },
      group: ['category'],
      raw: true
    });

    const categoryList = categories
      .map(item => item.category)
      .filter(Boolean)
      .sort();

    res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个便签
exports.getStickyNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = await StickyNote.findByPk(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '便签不存在'
      });
    }

    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    next(error);
  }
};

// 创建便签
exports.createStickyNote = async (req, res, next) => {
  try {
    const { title, content, category, color, sort_order } = req.body;

    const note = await StickyNote.create({
      title,
      content,
      category: category || null,
      color: color || '#fef68a',
      sort_order: sort_order || 0
    });

    res.status(201).json({
      success: true,
      message: '便签创建成功',
      data: note
    });
  } catch (error) {
    next(error);
  }
};

// 更新便签
exports.updateStickyNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, category, color, sort_order } = req.body;

    const note = await StickyNote.findByPk(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '便签不存在'
      });
    }

    await note.update({
      title,
      content,
      category: category || null,
      color,
      sort_order
    });

    res.json({
      success: true,
      message: '便签更新成功',
      data: note
    });
  } catch (error) {
    next(error);
  }
};

// 删除便签
exports.deleteStickyNote = async (req, res, next) => {
  try {
    const { id } = req.params;

    const note = await StickyNote.findByPk(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '便签不存在'
      });
    }

    await note.destroy();

    res.json({
      success: true,
      message: '便签删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 批量更新排序
exports.updateSortOrder = async (req, res, next) => {
  try {
    const { notes } = req.body; // [{id, sort_order}, ...]

    if (!Array.isArray(notes)) {
      return res.status(400).json({
        success: false,
        message: '请求数据格式无效'
      });
    }

    // 批量更新
    await Promise.all(
      notes.map(({ id, sort_order }) =>
        StickyNote.update({ sort_order }, { where: { id } })
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

// 别名，用于admin路由
exports.getAllStickyNotes = exports.getStickyNotes;
exports.getStickyNote = exports.getStickyNoteById;
exports.updateOrder = exports.updateSortOrder;

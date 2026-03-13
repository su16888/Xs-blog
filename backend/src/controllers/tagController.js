/**
 * @file tagController.js
 * @description Xs-Blog 标签控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const Tag = require('../models/Tag');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// 获取所有标签
const getTags = async (req, res) => {
  try {
    const { category, search } = req.query;

    const whereClause = {};

    // 按分类筛选
    if (category) {
      whereClause.category = category;
    }

    // 关键词搜索
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } }
      ];
    }

    const tags = await Tag.findAll({
      where: whereClause,
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取标签失败'
    });
  }
};

// 获取单个标签
const getTagById = async (req, res) => {
  try {
    const { id } = req.params;

    const tag = await Tag.findByPk(id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '标签不存在'
      });
    }

    res.json({
      success: true,
      data: tag
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取标签失败'
    });
  }
};

// 获取所有分类
const getCategories = async (req, res) => {
  try {
    const categories = await Tag.findAll({
      attributes: ['category'],
      where: {
        category: {
          [Op.ne]: null
        }
      },
      group: ['category'],
      order: [['category', 'ASC']]
    });

    const categoryList = categories
      .map(tag => tag.category)
      .filter(category => category && category.trim() !== '');

    res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取分类失败'
    });
  }
};

// 创建标签
const createTag = async (req, res) => {
  try {
    const { name, category, description, color, sort_order } = req.body;

    // 验证必填字段
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '标签名称不能为空'
      });
    }

    const tag = await Tag.create({
      name: name.trim(),
      category: category ? category.trim() : null,
      description: description ? description.trim() : null,
      color: color || '#3b82f6',
      sort_order: sort_order || 0
    });

    res.status(201).json({
      success: true,
      message: '标签创建成功',
      data: tag
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建标签失败'
    });
  }
};

// 更新标签
const updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, color, sort_order } = req.body;

    const tag = await Tag.findByPk(id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '标签不存在'
      });
    }

    // 验证必填字段
    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '标签名称不能为空'
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (category !== undefined) updates.category = category ? category.trim() : null;
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (color !== undefined) updates.color = color;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    await tag.update(updates);

    res.json({
      success: true,
      message: '标签更新成功',
      data: tag
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新标签失败'
    });
  }
};

// 删除标签
const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    const tag = await Tag.findByPk(id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '标签不存在'
      });
    }

    await tag.destroy();

    res.json({
      success: true,
      message: '标签删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除标签失败'
    });
  }
};

// 获取标签使用统计
const getTagStats = async (req, res) => {
  try {
    const stats = await sequelize.query(`
      SELECT
        t.id,
        t.name,
        t.color,
        t.description,
        t.category,
        t.category_id,
        t.sort_order,
        COUNT(nt.note_id) as usage_count
      FROM tags t
      LEFT JOIN note_tags nt ON t.id = nt.tag_id
      GROUP BY t.id
      ORDER BY usage_count DESC, t.sort_order ASC, t.name ASC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取标签统计失败'
    });
  }
};

// 获取某个标签下的所有笔记
const getTagNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { Note } = require('../models/associations');

    const tag = await Tag.findByPk(id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '标签不存在'
      });
    }

    const notes = await sequelize.query(`
      SELECT n.*
      FROM notes n
      INNER JOIN note_tags nt ON n.id = nt.note_id
      WHERE nt.tag_id = :tagId
      ORDER BY n.is_pinned DESC, n.sort_order DESC, n.published_at DESC
    `, {
      replacements: { tagId: id },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        tag,
        notes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取标签笔记失败'
    });
  }
};

module.exports = {
  getTags,
  getAllTags: getTags, // 别名，用于admin路由
  getTagById,
  getTag: getTagById, // 别名，用于admin路由
  getCategories,
  getTagCategories: getCategories, // 别名，用于admin路由
  createTag,
  updateTag,
  deleteTag,
  getTagStats,
  getTagNotes
};

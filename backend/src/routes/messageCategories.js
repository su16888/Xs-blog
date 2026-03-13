/**
 * @file messageCategories.js
 * @description Xs-Blog 留言分类路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const MessageCategory = require('../models/MessageCategory');
const authenticateToken = require('../middlewares/auth');

// 获取所有留言分类
router.get('/', async (req, res) => {
  try {
    const categories = await MessageCategory.findAll({
      order: [['sort_order', 'ASC']]
    });
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('获取留言分类失败:', error);
    res.status(500).json({
      success: false,
      message: '获取留言分类失败'
    });
  }
});

// 创建留言分类（需要认证）
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, sort_order = 0 } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '分类名称不能为空'
      });
    }

    const category = await MessageCategory.create({
      name,
      sort_order
    });

    res.status(201).json({
      success: true,
      message: '分类创建成功',
      data: category
    });
  } catch (error) {
    console.error('创建留言分类失败:', error);
    res.status(500).json({
      success: false,
      message: '创建留言分类失败'
    });
  }
});

// 更新留言分类（需要认证）
router.put('/:id', authenticateToken, async (req, res) => {
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

    if (name) category.name = name;
    if (sort_order !== undefined) category.sort_order = sort_order;

    await category.save();

    res.json({
      success: true,
      message: '分类更新成功',
      data: category
    });
  } catch (error) {
    console.error('更新留言分类失败:', error);
    res.status(500).json({
      success: false,
      message: '更新留言分类失败'
    });
  }
});

// 删除留言分类（需要认证）
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const category = await MessageCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: '分类删除成功'
    });
  } catch (error) {
    console.error('删除留言分类失败:', error);
    res.status(500).json({
      success: false,
      message: '删除留言分类失败'
    });
  }
});

module.exports = router;
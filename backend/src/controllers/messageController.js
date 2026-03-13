/**
 * @file messageController.js
 * @description Xs-Blog 留言控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-18
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const Message = require('../models/Message');
const MessageCategory = require('../models/MessageCategory');
const { Op } = require('sequelize');

// 获取所有留言
exports.getAllMessages = async (req, res, next) => {
  try {
    const { status, category_id, search, page = 1, limit = 20 } = req.query;
    const where = {};

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 分类筛选
    if (category_id) {
      where.category_id = category_id;
    }

    // 关键词搜索
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { contact: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: messages } = await Message.findAndCountAll({
      where,
      include: [{
        model: MessageCategory,
        as: 'MessageCategory',
        attributes: ['id', 'name'],
        required: false
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个留言
exports.getMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const message = await Message.findByPk(id, {
      include: [{
        model: MessageCategory,
        as: 'MessageCategory',
        attributes: ['id', 'name'],
        required: false
      }]
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: '留言不存在'
      });
    }

    // 如果状态是 pending，自动标记为 read
    if (message.status === 'pending') {
      await message.update({ status: 'read' });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// 更新留言状态
exports.updateMessageStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'read', 'replied'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值，必须是 pending、read 或 replied'
      });
    }

    const message = await Message.findByPk(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: '留言不存在'
      });
    }

    await message.update({ status });

    res.json({
      success: true,
      message: '状态更新成功',
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// 删除留言
exports.deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const message = await Message.findByPk(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: '留言不存在'
      });
    }

    await message.destroy();

    res.json({
      success: true,
      message: '留言删除成功'
    });
  } catch (error) {
    next(error);
  }
};

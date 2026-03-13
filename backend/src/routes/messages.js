/**
 * @file messages.js
 * @description Xs-Blog 留言路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const MessageCategory = require('../models/MessageCategory');
const authenticateToken = require('../middlewares/auth');
const { sequelize } = require('../config/database');
const { validateCaptcha } = require('../utils/captcha');
const { checkIPLimit, recordIPSubmission } = require('../utils/ipLimit');
const { sendMessageNotification } = require('../utils/email');
const { getClientIP } = require('../utils/ipHelper');

// 获取分类名称的辅助函数
async function getCategoryName(categoryId) {
  try {
    const category = await MessageCategory.findByPk(categoryId);
    return category ? category.name : '未分类';
  } catch (error) {
    console.error('获取分类名称失败:', error);
    return '未分类';
  }
}

// 获取所有留言（需要认证）
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category_id } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (category_id) where.category_id = category_id;

    const { count, rows: messages } = await Message.findAndCountAll({
      where,
      include: [{
        model: MessageCategory,
        as: 'MessageCategory',
        attributes: ['id', 'name']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取留言失败:', error);
    res.status(500).json({
      success: false,
      message: '获取留言失败'
    });
  }
});

// 获取单个留言详情（需要认证）
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findByPk(id, {
      include: [{
        model: MessageCategory,
        as: 'MessageCategory',
        attributes: ['id', 'name']
      }]
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: '留言不存在'
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('获取留言详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取留言详情失败'
    });
  }
});

// 提交留言（公开接口）
router.post('/', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { name, contact, category_id, content, attachments, captcha } = req.body;
    const ip_address = getClientIP(req);
    const user_agent = req.get('User-Agent');

    // 基础验证
    if (!name || !contact || !content) {
      return res.status(400).json({
        success: false,
        message: '姓名、联系方式和内容不能为空'
      });
    }

    // 验证码验证
    if (!captcha || !captcha.id || !captcha.text) {
      return res.status(400).json({
        success: false,
        message: '验证码不能为空'
      });
    }

    if (!validateCaptcha(captcha.id, captcha.text)) {
      return res.status(400).json({
        success: false,
        message: '验证码错误或已过期'
      });
    }

    // IP限制验证
    const ipCheck = await checkIPLimit(ip_address);
    if (!ipCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: ipCheck.message
      });
    }

    // 创建留言
    const message = await Message.create({
      name,
      contact,
      category_id: category_id || null,
      content,
      attachments: attachments ? JSON.stringify(attachments) : null,
      ip_address,
      user_agent,
      status: 'pending'
    }, { transaction });

    // 记录IP提交
    await recordIPSubmission(ip_address);

    // 发送邮件通知（异步，不阻塞响应）
    if (sendMessageNotification) {
      const categoryName = category_id ? await getCategoryName(category_id) : '未分类';
      sendMessageNotification({
        ...message.toJSON(),
        created_at: message.created_at
      }, categoryName).catch(err => {
        console.error('发送邮件通知失败:', err);
      });
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: '留言提交成功，我们会尽快处理',
      data: { id: message.id }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('提交留言失败:', error);
    res.status(500).json({
      success: false,
      message: '提交留言失败'
    });
  }
});

// 更新留言状态（需要认证）
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'read', 'replied'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '状态值无效'
      });
    }

    const message = await Message.findByPk(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: '留言不存在'
      });
    }

    message.status = status;
    await message.save();

    res.json({
      success: true,
      message: '状态更新成功',
      data: message
    });
  } catch (error) {
    console.error('更新留言状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新留言状态失败'
    });
  }
});

// 删除留言（需要认证）
router.delete('/:id', authenticateToken, async (req, res) => {
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
    console.error('删除留言失败:', error);
    res.status(500).json({
      success: false,
      message: '删除留言失败'
    });
  }
});

module.exports = router;
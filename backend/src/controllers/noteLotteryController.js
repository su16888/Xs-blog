/**
 * @file noteLotteryController.js
 * @description 笔记抽奖控制器
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-22
 */

const { NoteLottery, NoteLotteryPrize, NoteLotteryEntry, Note, NotePoll, NoteSurvey } = require('../models/associations');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');
const { sendLotteryWinnerNotification, validateEmailConfig } = require('../utils/email');
const lotteryService = require('../services/lotteryService');

// 获取客户端IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip ||
         'unknown';
};

const getRequester = async (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return { isAuthenticated: false, isAdmin: false, userId: null };

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const userId = decoded?.id;
    if (!userId) return { isAuthenticated: false, isAdmin: false, userId: null };

    const user = await User.findByPk(userId, { attributes: ['id', 'role'] });
    if (!user) return { isAuthenticated: false, isAdmin: false, userId: null };
    return { isAuthenticated: true, isAdmin: user.role === 'admin', userId };
  } catch (e) {
    return { isAuthenticated: false, isAdmin: false, userId: null };
  }
};

const ensureNoteAccess = (req, res, note, requester, password) => {
  if (!note) {
    res.status(404).json({ success: false, message: '笔记不存在' });
    return false;
  }

  if (!requester.isAuthenticated && !note.is_published) {
    res.status(403).json({ success: false, message: '无权访问此笔记' });
    return false;
  }

  const notePassword = note.password;
  const hasPassword = notePassword && typeof notePassword === 'string' && notePassword.trim() !== '';
  if (hasPassword) {
    if (!password) {
      res.status(401).json({ success: false, message: '需要密码访问此笔记' });
      return false;
    }
    if (String(password).trim() !== String(notePassword).trim()) {
      res.status(401).json({ success: false, message: '密码错误' });
      return false;
    }
  }

  return true;
};

const normalizeLotteryResultVisibility = (value, fallback = 'before') => {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const normalized = String(value).trim();
  if (normalized === 'none') return 'admin';
  if (normalized === 'public') return 'before';
  if (normalized === 'before' || normalized === 'after' || normalized === 'admin') return normalized;
  return fallback;
};

// ==================== 管理端接口 ====================

/**
 * 创建抽奖
 * POST /api/admin/notes/:noteId/lotteries
 */
exports.createLottery = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { noteId } = req.params;
    const {
      title,
      description,
      draw_time,
      ip_limit,
      enable_email_notification,
      custom_fields,
      show_prizes,
      show_probability,
      show_quantity,
      show_participants,
      result_visibility,
      draw_type,
      prizes
    } = req.body;

    // 验证笔记是否存在
    const note = await Note.findByPk(noteId);
    if (!note) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 检查该笔记是否已有投票、问卷或抽奖
    const [existingPoll, existingSurvey, existingLottery] = await Promise.all([
      NotePoll.findOne({ where: { note_id: noteId } }),
      NoteSurvey.findOne({ where: { note_id: noteId } }),
      NoteLottery.findOne({ where: { note_id: noteId } })
    ]);

    if (existingPoll) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '该笔记已有投票，不能同时创建抽奖'
      });
    }

    if (existingSurvey) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '该笔记已有问卷，不能同时创建抽奖'
      });
    }

    if (existingLottery) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '该笔记已有抽奖，每个笔记只能创建1个抽奖'
      });
    }

    // 验证奖项数量和概率
    if (!prizes || prizes.length < 1) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '至少需要1个奖项'
      });
    }

    if (prizes.length > 20) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '奖项最多20个'
      });
    }

    // 验证概率总和
    const totalProbability = prizes.reduce((sum, prize) => sum + (parseFloat(prize.probability) || 0), 0);
    if (Math.abs(totalProbability - 100) > 0.01) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `所有奖项概率总和必须为100%，当前为${totalProbability.toFixed(2)}%`
      });
    }

    // 创建抽奖
    const lottery = await NoteLottery.create({
      note_id: noteId,
      title,
      description,
      draw_time,
      ip_limit: ip_limit || 1,
      enable_email_notification: enable_email_notification !== undefined ? enable_email_notification : true,
      custom_fields: custom_fields || [],
      show_prizes: show_prizes !== undefined ? show_prizes : true,
      show_probability: show_probability !== undefined ? show_probability : true,
      show_quantity: show_quantity !== undefined ? show_quantity : true,
      show_participants: show_participants !== undefined ? show_participants : true,
      result_visibility: normalizeLotteryResultVisibility(result_visibility, 'before'),
      draw_type: draw_type || 'manual',
      redirect_url: req.body.redirect_url || null,
      is_active: true,
      is_drawn: false
    }, { transaction });

    // 创建奖项
    const lotteryPrizes = prizes.map((prize, index) => ({
      lottery_id: lottery.id,
      prize_name: prize.prize_name,
      prize_image: prize.prize_image || null,
      prize_description: prize.prize_description || null,
      probability: parseFloat(prize.probability),
      quantity: prize.quantity || 1,
      sort_order: prize.sort_order !== undefined ? prize.sort_order : index
    }));

    await NoteLotteryPrize.bulkCreate(lotteryPrizes, { transaction });

    await transaction.commit();

    // 重新查询完整数据
    const createdLottery = await NoteLottery.findByPk(lottery.id, {
      include: [{
        model: NoteLotteryPrize,
        as: 'prizes',
        attributes: ['id', 'prize_name', 'prize_image', 'prize_description', 'probability', 'quantity', 'sort_order']
      }],
      order: [[{ model: NoteLotteryPrize, as: 'prizes' }, 'sort_order', 'ASC']]
    });

    res.json({
      success: true,
      message: '抽奖创建成功',
      data: createdLottery
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * 更新抽奖
 * PUT /api/admin/notes/:noteId/lotteries/:lotteryId
 */
exports.updateLottery = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { noteId, lotteryId } = req.params;
    const {
      title,
      description,
      draw_time,
      ip_limit,
      enable_email_notification,
      custom_fields,
      show_prizes,
      show_probability,
      show_quantity,
      show_participants,
      result_visibility,
      draw_type,
      is_active,
      prizes
    } = req.body;

    const resolvedIpLimit =
      ip_limit === undefined || ip_limit === null || String(ip_limit).trim() === ''
        ? undefined
        : Math.max(1, parseInt(String(ip_limit), 10) || 1);

    // 查找抽奖
    const lottery = await NoteLottery.findOne({
      where: { id: lotteryId, note_id: noteId }
    });

    if (!lottery) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '抽奖不存在'
      });
    }

    // 检查是否已开奖
    if (lottery.is_drawn) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '抽奖已开奖，不可修改'
      });
    }

    // 更新抽奖基本信息
    await lottery.update({
      title,
      description,
      draw_time,
      ip_limit: resolvedIpLimit !== undefined ? resolvedIpLimit : lottery.ip_limit,
      enable_email_notification,
      custom_fields,
      show_prizes,
      show_probability,
      show_quantity,
      show_participants,
      result_visibility: result_visibility !== undefined ? normalizeLotteryResultVisibility(result_visibility, lottery.result_visibility) : lottery.result_visibility,
      draw_type,
      redirect_url: req.body.redirect_url !== undefined ? req.body.redirect_url : lottery.redirect_url,
      is_active
    }, { transaction });

    // 如果提供了奖项，更新奖项
    if (prizes && Array.isArray(prizes)) {
      // 验证概率总和
      const totalProbability = prizes.reduce((sum, prize) => sum + (parseFloat(prize.probability) || 0), 0);
      if (Math.abs(totalProbability - 100) > 0.01) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `所有奖项概率总和必须为100%，当前为${totalProbability.toFixed(2)}%`
        });
      }

      // 删除旧奖项
      await NoteLotteryPrize.destroy({
        where: { lottery_id: lotteryId },
        transaction
      });

      // 创建新奖项
      const lotteryPrizes = prizes.map((prize, index) => ({
        lottery_id: lotteryId,
        prize_name: prize.prize_name,
        prize_image: prize.prize_image || null,
        prize_description: prize.prize_description || null,
        probability: parseFloat(prize.probability),
        quantity: prize.quantity || 1,
        sort_order: prize.sort_order !== undefined ? prize.sort_order : index
      }));

      await NoteLotteryPrize.bulkCreate(lotteryPrizes, { transaction });
    }

    await transaction.commit();

    // 重新查询完整数据
    const updatedLottery = await NoteLottery.findByPk(lotteryId, {
      include: [{
        model: NoteLotteryPrize,
        as: 'prizes',
        attributes: ['id', 'prize_name', 'prize_image', 'prize_description', 'probability', 'quantity', 'sort_order']
      }],
      order: [[{ model: NoteLotteryPrize, as: 'prizes' }, 'sort_order', 'ASC']]
    });

    res.json({
      success: true,
      message: '抽奖更新成功',
      data: updatedLottery
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * 删除抽奖
 * DELETE /api/admin/notes/:noteId/lotteries/:lotteryId
 */
exports.deleteLottery = async (req, res, next) => {
  try {
    const { noteId, lotteryId } = req.params;

    const lottery = await NoteLottery.findOne({
      where: { id: lotteryId, note_id: noteId }
    });

    if (!lottery) {
      return res.status(404).json({
        success: false,
        message: '抽奖不存在'
      });
    }

    await lottery.destroy();

    res.json({
      success: true,
      message: '抽奖删除成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取笔记的所有抽奖（管理端）
 * GET /api/admin/notes/:noteId/lotteries
 */
exports.getAdminNoteLotteries = async (req, res, next) => {
  try {
    const { noteId } = req.params;

    const lotteries = await NoteLottery.findAll({
      where: { note_id: noteId },
      include: [{
        model: NoteLotteryPrize,
        as: 'prizes',
        attributes: ['id', 'prize_name', 'prize_image', 'prize_description', 'probability', 'quantity', 'sort_order']
      }],
      order: [
        ['created_at', 'DESC'],
        [{ model: NoteLotteryPrize, as: 'prizes' }, 'sort_order', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: lotteries
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取抽奖统计数据
 * GET /api/admin/lotteries/:lotteryId/statistics
 */
exports.getLotteryStatistics = async (req, res, next) => {
  try {
    const { lotteryId } = req.params;

    const lottery = await NoteLottery.findByPk(lotteryId, {
      include: [{
        model: NoteLotteryPrize,
        as: 'prizes',
        attributes: ['id', 'prize_name', 'prize_image', 'probability', 'quantity']
      }]
    });

    if (!lottery) {
      return res.status(404).json({
        success: false,
        message: '抽奖不存在'
      });
    }

    // 获取参与记录
    const entries = await NoteLotteryEntry.findAll({
      where: { lottery_id: lotteryId },
      attributes: ['participant_ip', 'participant_email', 'prize_id', 'is_winner', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    // 统计数据
    const totalParticipants = entries.length;
    const winners = entries.filter(e => e.is_winner);
    const totalWinners = winners.length;

    // 按奖项统计中奖人数
    const prizeWinners = {};
    winners.forEach(winner => {
      if (winner.prize_id) {
        prizeWinners[winner.prize_id] = (prizeWinners[winner.prize_id] || 0) + 1;
      }
    });

    // 按时间分组统计（按天）
    const entriesByDate = {};
    entries.forEach(entry => {
      const date = entry.created_at.toISOString().split('T')[0];
      entriesByDate[date] = (entriesByDate[date] || 0) + 1;
    });

    // 统计唯一IP数量
    const uniqueIPs = new Set(entries.map(e => e.participant_ip)).size;

    res.json({
      success: true,
      data: {
        lottery,
        totalParticipants,
        totalWinners,
        uniqueIPs,
        entriesByDate,
        prizeWinners
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取抽奖参与记录（管理端）
 * GET /api/admin/lotteries/:lotteryId/entries
 */
exports.getLotteryEntries = async (req, res, next) => {
  try {
    const { lotteryId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const lottery = await NoteLottery.findByPk(lotteryId);
    if (!lottery) {
      return res.status(404).json({
        success: false,
        message: '抽奖不存在'
      });
    }

    const { count, rows } = await NoteLotteryEntry.findAndCountAll({
      where: { lottery_id: lotteryId },
      include: [{
        model: NoteLotteryPrize,
        as: 'prize',
        attributes: ['id', 'prize_name'],
        required: false
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: {
        entries: rows,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 执行开奖
 * POST /api/admin/lotteries/:lotteryId/draw
 */
exports.drawLottery = async (req, res, next) => {
  try {
    const { lotteryId } = req.params;
    
    const result = await lotteryService.executeDraw(lotteryId);

    res.json({
      success: true,
      message: '开奖成功' + (result.emailSent > 0 ? `，已发送 ${result.emailSent} 封中奖邮件` : ''),
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 导出抽奖数据（管理端）
 * GET /api/admin/notes/:noteId/lotteries/:lotteryId/export
 */
exports.exportLotteryData = async (req, res, next) => {
  try {
    const { noteId, lotteryId } = req.params;

    const lottery = await NoteLottery.findOne({
      where: { id: lotteryId, note_id: noteId },
      include: [{
        model: NoteLotteryPrize,
        as: 'prizes',
        attributes: ['id', 'prize_name', 'sort_order'],
        order: [['sort_order', 'ASC']]
      }]
    });

    if (!lottery) {
      return res.status(404).json({
        success: false,
        message: '抽奖不存在'
      });
    }

    const entries = await NoteLotteryEntry.findAll({
      where: { lottery_id: lotteryId },
      include: [{
        model: NoteLotteryPrize,
        as: 'prize',
        attributes: ['prize_name'],
        required: false
      }],
      order: [['created_at', 'DESC']]
    });

    // 构建CSV数据
    const rows = [];

    // 表头
    const headers = ['序号', '参与时间', 'IP地址', '邮箱', '是否中奖', '中奖奖项'];
    rows.push(headers);

    // 数据行
    entries.forEach((entry, index) => {
      const row = [
        index + 1,
        new Date(entry.created_at).toLocaleString('zh-CN'),
        entry.participant_ip,
        entry.participant_email || '',
        entry.is_winner ? '是' : '否',
        entry.prize ? entry.prize.prize_name : ''
      ];
      rows.push(row);
    });

    // 转换为CSV格式
    const csv = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const sanitizedTitle = lottery.title.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 50);
    const filename = `${sanitizedTitle}_抽奖数据_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send('\ufeff' + csv);
  } catch (error) {
    next(error);
  }
};

// ==================== 前台接口 ====================

/**
 * 获取笔记的抽奖列表（前台）
 * GET /api/notes/:noteId/lotteries
 */
exports.getNoteLotteries = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const clientIP = getClientIP(req);
    const requester = await getRequester(req);
    const password = req.query?.password;

    // 尝试通过 ID 或 custom_slug 查找笔记
    let note;
    const isNumericId = /^\d+$/.test(noteId);

    if (isNumericId) {
      note = await Note.findByPk(noteId);
    } else {
      note = await Note.findOne({ where: { custom_slug: noteId } });
    }

    if (!ensureNoteAccess(req, res, note, requester, password)) return;

    const lotteries = await NoteLottery.findAll({
      where: {
        note_id: note.id,
        is_active: true
      },
      include: [{
        model: NoteLotteryPrize,
        as: 'prizes',
        attributes: ['id', 'prize_name', 'prize_image', 'prize_description', 'probability', 'quantity', 'sort_order']
      }],
      order: [
        ['created_at', 'ASC'],
        [{ model: NoteLotteryPrize, as: 'prizes' }, 'sort_order', 'ASC']
      ]
    });

    // 检查用户是否已参与
    const lotteriesWithEntryStatus = await Promise.all(lotteries.map(async (lottery) => {
      const userEntries = await NoteLotteryEntry.findAll({
        where: {
          lottery_id: lottery.id,
          participant_ip: clientIP
        },
        attributes: ['id', 'created_at']
      });

      const lotteryData = lottery.toJSON();
      lotteryData.hasEntered = userEntries.length > 0;
      lotteryData.entryCount = userEntries.length;

      // 检查抽奖状态
      // drawn: 已开奖
      // active: 开奖时间之前，可以参与
      // ended: 开奖时间已过但还没开奖，等待开奖
      const now = new Date();
      const drawTime = new Date(lottery.draw_time);

      if (lottery.is_drawn) {
        lotteryData.status = 'drawn';
      } else if (drawTime.getTime() > now.getTime()) {
        lotteryData.status = 'active';  // 开奖时间还没到，可以参与
      } else {
        lotteryData.status = 'ended';   // 开奖时间已过，等待开奖
      }

      const resolvedResultVisibility = normalizeLotteryResultVisibility(lottery.result_visibility, 'before');
      const canShowResults =
        requester.isAdmin ||
        resolvedResultVisibility === 'before' ||
        (resolvedResultVisibility === 'after' && lotteryData.hasEntered);

      const canShowParticipants =
        requester.isAdmin ||
        (lottery.show_participants && (
          resolvedResultVisibility === 'before' ||
          (resolvedResultVisibility === 'after' && lotteryData.hasEntered)
        ));

      if (!canShowParticipants) {
        lotteryData.total_participants = undefined;
        lotteryData.show_participants = false;
      }

      if (!canShowResults) {
        lotteryData.show_probability = false;
        lotteryData.show_quantity = false;
      }

      // 如果已开奖且用户参与，显示是否中奖
      if (canShowResults && lottery.is_drawn && lotteryData.hasEntered) {
        const winnerEntry = await NoteLotteryEntry.findOne({
          where: {
            lottery_id: lottery.id,
            participant_ip: clientIP,
            is_winner: true
          },
          include: [{
            model: NoteLotteryPrize,
            as: 'prize',
            attributes: ['prize_name', 'prize_image', 'prize_description'],
            required: false
          }]
        });
        lotteryData.wonPrize = winnerEntry;
      }

      return lotteryData;
    }));

    res.json({
      success: true,
      data: lotteriesWithEntryStatus
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 参与抽奖
 * POST /api/lotteries/:lotteryId/enter
 */
exports.enterLottery = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { lotteryId } = req.params;
    const { participant_email, custom_data } = req.body;
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const requester = await getRequester(req);
    const password = req.body?.password;

    // 验证抽奖是否存在
    const lottery = await NoteLottery.findByPk(lotteryId);

    if (!lottery || !lottery.is_active) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '抽奖不存在或已关闭'
      });
    }

    const note = await Note.findByPk(lottery.note_id);
    if (!ensureNoteAccess(req, res, note, requester, password)) {
      await transaction.rollback();
      return;
    }

    // 检查是否已开奖
    if (lottery.is_drawn) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '抽奖已开奖'
      });
    }

    // 检查抽奖时间
    const now = new Date();
    if (new Date(lottery.draw_time) < now) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '抽奖已结束'
      });
    }

    // 检查IP参与次数限制
    const existingEntries = await NoteLotteryEntry.count({
      where: {
        lottery_id: lotteryId,
        participant_ip: clientIP
      }
    });

    if (existingEntries >= lottery.ip_limit) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `您已达到参与次数限制（${lottery.ip_limit}次）`
      });
    }

    // 验证必填字段
    if (lottery.custom_fields && lottery.custom_fields.length > 0) {
      const missingFields = [];
      lottery.custom_fields.forEach(field => {
        if (field.required && !custom_data[field.name]) {
          missingFields.push(field.label);
        }
      });
      if (missingFields.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `请填写必填字段：${missingFields.join('、')}`
        });
      }
    }

    // 创建参与记录
    await NoteLotteryEntry.create({
      lottery_id: lotteryId,
      participant_ip: clientIP,
      participant_email: participant_email || null,
      custom_data: custom_data || {},
      is_winner: false
    }, { transaction });

    // 更新参与人数
    await NoteLottery.increment('total_participants', {
      where: { id: lotteryId },
      transaction
    });

    await transaction.commit();

    res.json({
      success: true,
      message: '参与成功，请等待开奖'
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * 获取当前用户的参与记录
 * GET /api/lotteries/:lotteryId/my-entry
 */
exports.getMyEntry = async (req, res, next) => {
  try {
    const { lotteryId } = req.params;
    const clientIP = getClientIP(req);
    const requester = await getRequester(req);
    const password = req.query?.password;

    const lottery = await NoteLottery.findByPk(lotteryId, { attributes: ['id', 'note_id', 'is_active', 'result_visibility'] });
    if (!lottery || !lottery.is_active) {
      return res.status(404).json({
        success: false,
        message: '抽奖不存在或已关闭'
      });
    }

    const note = await Note.findByPk(lottery.note_id);
    if (!ensureNoteAccess(req, res, note, requester, password)) return;

    const resolvedResultVisibility = normalizeLotteryResultVisibility(lottery.result_visibility, 'before');

    const entries = await NoteLotteryEntry.findAll({
      where: {
        lottery_id: lotteryId,
        participant_ip: clientIP
      },
      include: [{
        model: NoteLotteryPrize,
        as: 'prize',
        attributes: ['prize_name', 'prize_image', 'prize_description'],
        required: false
      }],
      attributes: ['id', 'participant_email', 'custom_data', 'is_winner', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    if (!requester.isAdmin) {
      if (resolvedResultVisibility === 'admin') {
        return res.status(403).json({
          success: false,
          message: '抽奖结果仅管理员可见'
        });
      }
      if (resolvedResultVisibility === 'after' && entries.length === 0) {
        return res.status(403).json({
          success: false,
          message: '请先参与后查看结果'
        });
      }
    }

    res.json({
      success: true,
      data: {
        hasEntered: entries.length > 0,
        entries: entries.map(e => ({
          entered_at: e.created_at,
          is_winner: e.is_winner,
          prize: e.prize
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有抽奖列表（管理端）
 * GET /api/admin/lotteries/all
 */
exports.getAllLotteries = async (req, res, next) => {
  try {
    const lotteries = await NoteLottery.findAll({
      include: [
        {
          model: Note,
          as: 'Note',
          attributes: ['id', 'title']
        },
        {
          model: NoteLotteryPrize,
          as: 'Prizes',
          attributes: ['id', 'prize_name', 'prize_image', 'prize_description', 'probability', 'quantity', 'sort_order']
        }
      ],
      order: [
        ['created_at', 'DESC'],
        [{ model: NoteLotteryPrize, as: 'Prizes' }, 'sort_order', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: lotteries
    });
  } catch (error) {
    next(error);
  }
};

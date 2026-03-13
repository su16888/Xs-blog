/**
 * @file notePollController.js
 * @description 笔记投票控制器
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-19
 */

const { NotePoll, NotePollOption, NotePollVote, Note, NoteSurvey, NoteLottery } = require('../models/associations');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

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

const normalizePollResultVisibility = (value, fallback = 'before') => {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const normalized = String(value).trim();
  if (normalized === 'none') return 'admin';
  if (normalized === 'public') return 'before';
  if (normalized === 'before' || normalized === 'after' || normalized === 'admin') return normalized;
  return fallback;
};

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off' || normalized === '') return false;
  return fallback;
};

// ==================== 管理端接口 ====================

/**
 * 创建投票
 * POST /api/admin/notes/:noteId/polls
 */
exports.createPoll = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { noteId } = req.params;
    const { title, description, poll_type, max_choices, start_time, end_time,
            result_visibility, show_participants, allow_revote, ip_limit, options } = req.body;

    // 验证笔记是否存在
    const note = await Note.findByPk(noteId);
    if (!note) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 检查该笔记是否已有问卷
    const existingSurvey = await NoteSurvey.findOne({
      where: { note_id: noteId }
    });
    if (existingSurvey) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '该笔记已有问卷，不能同时创建投票'
      });
    }

    // 检查该笔记是否已有抽奖
    const existingLottery = await NoteLottery.findOne({
      where: { note_id: noteId }
    });
    if (existingLottery) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '该笔记已有抽奖，不能同时创建投票'
      });
    }

    // 检查该笔记是否已有投票
    const existingPoll = await NotePoll.findOne({
      where: { note_id: noteId }
    });
    if (existingPoll) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '该笔记已有投票，每个笔记只能创建1个投票'
      });
    }

    // 验证选项数量
    if (!options || options.length < 2) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '至少需要2个投票选项'
      });
    }

    if (options.length > 20) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '投票选项最多20个'
      });
    }

    // 创建投票
    const poll = await NotePoll.create({
      note_id: noteId,
      title,
      description,
      poll_type: poll_type || 'single',
      max_choices: Math.max(1, parseInt(String(max_choices), 10) || 1),
      start_time,
      end_time,
      result_visibility: normalizePollResultVisibility(result_visibility, 'before'),
      show_participants: show_participants === undefined ? true : normalizeBoolean(show_participants, true),
      allow_revote: allow_revote === undefined ? false : normalizeBoolean(allow_revote, false),
      ip_limit: Math.max(1, parseInt(String(ip_limit), 10) || 1),
      redirect_url: req.body.redirect_url || null,
      is_active: true
    }, { transaction });

    // 创建投票选项
    const pollOptions = options.map((option, index) => ({
      poll_id: poll.id,
      option_text: option.option_text,
      option_image: option.option_image || null,
      sort_order: option.sort_order !== undefined ? option.sort_order : index
    }));

    await NotePollOption.bulkCreate(pollOptions, { transaction });

    await transaction.commit();

    // 重新查询完整数据
    const createdPoll = await NotePoll.findByPk(poll.id, {
      include: [{
        model: NotePollOption,
        as: 'options',
        attributes: ['id', 'option_text', 'option_image', 'sort_order', 'vote_count']
      }],
      order: [[{ model: NotePollOption, as: 'options' }, 'sort_order', 'ASC']]
    });

    res.json({
      success: true,
      message: '投票创建成功',
      data: createdPoll
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * 更新投票
 * PUT /api/admin/notes/:noteId/polls/:pollId
 */
exports.updatePoll = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { noteId, pollId } = req.params;
    const { title, description, poll_type, max_choices, start_time, end_time,
            result_visibility, show_participants, allow_revote, ip_limit, is_active, options } = req.body;

    const resolvedMaxChoices =
      max_choices === undefined || max_choices === null || String(max_choices).trim() === ''
        ? undefined
        : Math.max(1, parseInt(String(max_choices), 10) || 1);
    const resolvedIpLimit =
      ip_limit === undefined || ip_limit === null || String(ip_limit).trim() === ''
        ? undefined
        : Math.max(1, parseInt(String(ip_limit), 10) || 1);

    // 查找投票
    const poll = await NotePoll.findOne({
      where: { id: pollId, note_id: noteId }
    });

    if (!poll) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '投票不存在'
      });
    }

    const totalVoteRecords = await NotePollVote.count({
      where: { poll_id: pollId },
      transaction
    });

    const existingOptions = await NotePollOption.findAll({
      where: { poll_id: pollId },
      attributes: ['id', 'option_text', 'option_image', 'sort_order'],
      order: [['sort_order', 'ASC']],
      transaction
    });

    const normalizeDateValue = (value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      if (String(value).trim() === '') return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed;
    };

    const isSameDateOrNull = (a, b) => {
      const ta = a ? new Date(a).getTime() : null;
      const tb = b ? new Date(b).getTime() : null;
      return ta === tb;
    };

    const normalizeIncomingOptions = (incoming) => {
      if (!Array.isArray(incoming)) return null;
      return incoming.map((opt, index) => ({
        id: opt?.id ? parseInt(String(opt.id), 10) : undefined,
        option_text: opt?.option_text ?? '',
        option_image: opt?.option_image ? String(opt.option_image) : null,
        sort_order: opt?.sort_order !== undefined ? opt.sort_order : index
      }));
    };

    const normalizedIncomingOptions = normalizeIncomingOptions(options);
    const normalizedExistingOptions = existingOptions.map(opt => ({
      id: opt.id,
      option_text: opt.option_text,
      option_image: opt.option_image || null,
      sort_order: opt.sort_order
    }));

    const optionsChanged = (() => {
      if (!normalizedIncomingOptions) return false;
      if (normalizedIncomingOptions.length !== normalizedExistingOptions.length) return true;
      for (let i = 0; i < normalizedIncomingOptions.length; i++) {
        const incomingOpt = normalizedIncomingOptions[i];
        const existingOpt = normalizedExistingOptions[i];
        if (incomingOpt.id !== existingOpt.id) return true;
        if (String(incomingOpt.option_text) !== String(existingOpt.option_text)) return true;
        if ((incomingOpt.option_image || null) !== (existingOpt.option_image || null)) return true;
        if (Number(incomingOpt.sort_order) !== Number(existingOpt.sort_order)) return true;
      }
      return false;
    })();

    if (totalVoteRecords > 0) {
      const incomingStartTime = normalizeDateValue(start_time);
      const incomingEndTime = normalizeDateValue(end_time);

      const incomingTitle = title !== undefined ? String(title) : undefined;
      const incomingDescription = description !== undefined ? (description === null ? null : String(description)) : undefined;
      const incomingPollType = poll_type !== undefined ? String(poll_type) : undefined;
      const incomingMaxChoices = resolvedMaxChoices !== undefined ? resolvedMaxChoices : undefined;
      const incomingIpLimit = resolvedIpLimit !== undefined ? resolvedIpLimit : undefined;
      const incomingAllowRevote =
        allow_revote !== undefined ? normalizeBoolean(allow_revote, normalizeBoolean(poll.allow_revote, false)) : undefined;

      const changedLockedFields =
        (incomingTitle !== undefined && incomingTitle !== String(poll.title)) ||
        (incomingDescription !== undefined && String(incomingDescription ?? '') !== String(poll.description ?? '')) ||
        (incomingPollType !== undefined && incomingPollType !== String(poll.poll_type)) ||
        (incomingMaxChoices !== undefined && Number(incomingMaxChoices) !== Number(poll.max_choices)) ||
        (incomingIpLimit !== undefined && Number(incomingIpLimit) !== Number(poll.ip_limit)) ||
        (incomingAllowRevote !== undefined && Boolean(incomingAllowRevote) !== Boolean(normalizeBoolean(poll.allow_revote, false))) ||
        (start_time !== undefined && !isSameDateOrNull(incomingStartTime, poll.start_time)) ||
        (optionsChanged);

      if (changedLockedFields) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: '投票已产生记录，禁止修改投票内容与选项'
        });
      }

      const currentShowParticipants = normalizeBoolean(poll.show_participants, true);
      const currentIsActive = normalizeBoolean(poll.is_active, true);

      await poll.update({
        end_time: end_time !== undefined ? incomingEndTime : poll.end_time,
        result_visibility: result_visibility !== undefined ? normalizePollResultVisibility(result_visibility, poll.result_visibility) : poll.result_visibility,
        show_participants: show_participants !== undefined ? normalizeBoolean(show_participants, currentShowParticipants) : currentShowParticipants,
        redirect_url: req.body.redirect_url !== undefined ? req.body.redirect_url : poll.redirect_url,
        is_active: is_active !== undefined ? normalizeBoolean(is_active, currentIsActive) : currentIsActive
      }, { transaction });

      await transaction.commit();

      const updatedPoll = await NotePoll.findByPk(pollId, {
        include: [{
          model: NotePollOption,
          as: 'options',
          attributes: ['id', 'option_text', 'option_image', 'sort_order', 'vote_count']
        }],
        order: [[{ model: NotePollOption, as: 'options' }, 'sort_order', 'ASC']]
      });

      return res.json({
        success: true,
        message: '投票更新成功',
        data: updatedPoll
      });
    }

    const currentShowParticipants = normalizeBoolean(poll.show_participants, true);
    const currentAllowRevote = normalizeBoolean(poll.allow_revote, false);
    const currentIsActive = normalizeBoolean(poll.is_active, true);

    // 更新投票基本信息
    await poll.update({
      title: title !== undefined ? title : poll.title,
      description: description !== undefined ? description : poll.description,
      poll_type: poll_type !== undefined ? poll_type : poll.poll_type,
      max_choices: resolvedMaxChoices !== undefined ? resolvedMaxChoices : poll.max_choices,
      start_time: start_time !== undefined ? start_time : poll.start_time,
      end_time: end_time !== undefined ? end_time : poll.end_time,
      result_visibility: result_visibility !== undefined ? normalizePollResultVisibility(result_visibility, poll.result_visibility) : poll.result_visibility,
      show_participants: show_participants !== undefined ? normalizeBoolean(show_participants, currentShowParticipants) : currentShowParticipants,
      allow_revote: allow_revote !== undefined ? normalizeBoolean(allow_revote, currentAllowRevote) : currentAllowRevote,
      ip_limit: resolvedIpLimit !== undefined ? resolvedIpLimit : poll.ip_limit,
      redirect_url: req.body.redirect_url !== undefined ? req.body.redirect_url : poll.redirect_url,
      is_active: is_active !== undefined ? normalizeBoolean(is_active, currentIsActive) : currentIsActive
    }, { transaction });

    // 如果提供了选项，更新选项
    if (options && Array.isArray(options)) {
      if (options.length < 2) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: '至少需要2个投票选项'
        });
      }

      if (options.length > 20) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: '投票选项最多20个'
        });
      }

      const incomingNormalized = normalizeIncomingOptions(options);
      const existingById = new Map(existingOptions.map(opt => [opt.id, opt]));
      const keepIds = new Set();

      for (const incomingOpt of incomingNormalized) {
        const resolvedSortOrder = incomingOpt.sort_order;
        const resolvedText = incomingOpt.option_text;
        const resolvedImage = incomingOpt.option_image || null;

        if (incomingOpt.id && existingById.has(incomingOpt.id)) {
          keepIds.add(incomingOpt.id);
          await NotePollOption.update({
            option_text: resolvedText,
            option_image: resolvedImage,
            sort_order: resolvedSortOrder
          }, {
            where: { id: incomingOpt.id, poll_id: pollId },
            transaction
          });
          continue;
        }

        const created = await NotePollOption.create({
          poll_id: pollId,
          option_text: resolvedText,
          option_image: resolvedImage,
          sort_order: resolvedSortOrder
        }, { transaction });
        keepIds.add(created.id);
      }

      const existingIds = existingOptions.map(opt => opt.id);
      const deleteIds = existingIds.filter(id => !keepIds.has(id));
      if (deleteIds.length > 0) {
        await NotePollOption.destroy({
          where: {
            poll_id: pollId,
            id: { [Op.in]: deleteIds }
          },
          transaction
        });
      }
    }

    await transaction.commit();

    // 重新查询完整数据
    const updatedPoll = await NotePoll.findByPk(pollId, {
      include: [{
        model: NotePollOption,
        as: 'options',
        attributes: ['id', 'option_text', 'option_image', 'sort_order', 'vote_count']
      }],
      order: [[{ model: NotePollOption, as: 'options' }, 'sort_order', 'ASC']]
    });

    res.json({
      success: true,
      message: '投票更新成功',
      data: updatedPoll
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * 删除投票
 * DELETE /api/admin/notes/:noteId/polls/:pollId
 */
exports.deletePoll = async (req, res, next) => {
  try {
    const { noteId, pollId } = req.params;

    const poll = await NotePoll.findOne({
      where: { id: pollId, note_id: noteId }
    });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: '投票不存在'
      });
    }

    await poll.destroy();

    res.json({
      success: true,
      message: '投票删除成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取笔记的所有投票（管理端）
 * GET /api/admin/notes/:noteId/polls
 */
exports.getAdminNotePolls = async (req, res, next) => {
  try {
    const { noteId } = req.params;

    const polls = await NotePoll.findAll({
      where: { note_id: noteId },
      include: [{
        model: NotePollOption,
        as: 'options',
        attributes: ['id', 'option_text', 'option_image', 'sort_order', 'vote_count']
      }],
      order: [
        ['created_at', 'DESC'],
        [{ model: NotePollOption, as: 'options' }, 'sort_order', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: polls
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取投票统计数据
 * GET /api/admin/polls/:pollId/statistics
 */
exports.getPollStatistics = async (req, res, next) => {
  try {
    const { pollId } = req.params;

    const poll = await NotePoll.findByPk(pollId, {
      include: [{
        model: NotePollOption,
        as: 'options',
        attributes: ['id', 'option_text', 'option_image', 'sort_order', 'vote_count']
      }]
    });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: '投票不存在'
      });
    }

    // 获取投票记录
    const votes = await NotePollVote.findAll({
      where: { poll_id: pollId },
      attributes: ['voter_ip', 'created_at', 'option_id'],
      order: [['created_at', 'DESC']]
    });

    // 统计每个IP的投票次数
    const ipVoteCount = {};
    votes.forEach(vote => {
      ipVoteCount[vote.voter_ip] = (ipVoteCount[vote.voter_ip] || 0) + 1;
    });

    // 按时间分组统计（按天）
    const votesByDate = {};
    votes.forEach(vote => {
      const date = vote.created_at.toISOString().split('T')[0];
      votesByDate[date] = (votesByDate[date] || 0) + 1;
    });

    // 统计唯一IP数量
    const uniqueIPs = Object.keys(ipVoteCount).length;

    res.json({
      success: true,
      data: {
        poll,
        totalVotes: votes.length,
        uniqueVoters: uniqueIPs,
        votesByDate,
        topVoters: Object.entries(ipVoteCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([ip, count]) => ({ ip, count }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 前台接口 ====================

/**
 * 获取笔记的投票列表（前台）
 * GET /api/notes/:noteId/polls
 */
exports.getNotePolls = async (req, res, next) => {
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

    const polls = await NotePoll.findAll({
      where: {
        note_id: note.id,
        is_active: true
      },
      include: [{
        model: NotePollOption,
        as: 'options',
        attributes: ['id', 'option_text', 'option_image', 'sort_order', 'vote_count']
      }],
      order: [
        ['created_at', 'ASC'],
        [{ model: NotePollOption, as: 'options' }, 'sort_order', 'ASC']
      ]
    });

    // 检查用户是否已投票
    const pollsWithVoteStatus = await Promise.all(polls.map(async (poll) => {
      const userVotes = await NotePollVote.findAll({
        where: {
          poll_id: poll.id,
          voter_ip: clientIP
        },
        attributes: ['option_id']
      });

      const pollData = poll.toJSON();
      pollData.hasVoted = userVotes.length > 0;
      pollData.userVotes = userVotes.map(v => v.option_id);
      pollData.voteCount = userVotes.length;

      // 检查投票状态
      const now = new Date();
      if (poll.start_time && new Date(poll.start_time) > now) {
        pollData.status = 'not_started';
      } else if (poll.end_time && new Date(poll.end_time) < now) {
        pollData.status = 'ended';
      } else {
        pollData.status = 'active';
      }

      const resolvedResultVisibility = normalizePollResultVisibility(poll.result_visibility, 'admin');

      const canShowResults =
        resolvedResultVisibility === 'before' ||
        (resolvedResultVisibility === 'after' && pollData.hasVoted);

      if (!canShowResults) {
        pollData.options = pollData.options.map(opt => ({
          ...opt,
          vote_count: undefined
        }));
      }

      const canShowParticipants = normalizeBoolean(poll.show_participants, true);

      if (!canShowParticipants) {
        pollData.total_votes = undefined;
      }

      return pollData;
    }));

    res.json({
      success: true,
      data: pollsWithVoteStatus
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 提交投票
 * POST /api/polls/:pollId/vote
 */
exports.submitVote = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { pollId } = req.params;
    const { option_ids } = req.body;
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const requester = await getRequester(req);
    const password = req.body?.password;

    // 验证投票是否存在
    const poll = await NotePoll.findByPk(pollId, {
      include: [{
        model: NotePollOption,
        as: 'options'
      }]
    });

    const isActive = poll ? normalizeBoolean(poll.is_active, true) : false;
    if (!poll || !isActive) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '投票不存在或已关闭'
      });
    }

    const note = await Note.findByPk(poll.note_id);
    if (!ensureNoteAccess(req, res, note, requester, password)) {
      await transaction.rollback();
      return;
    }

    // 检查投票时间
    const now = new Date();
    if (poll.start_time && new Date(poll.start_time) > now) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '投票尚未开始'
      });
    }

    if (poll.end_time && new Date(poll.end_time) < now) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '投票已结束'
      });
    }

    // 检查IP投票次数限制
    const existingVotes = await NotePollVote.count({
      where: {
        poll_id: pollId,
        voter_ip: clientIP
      }
    });

    const ipLimit = Math.max(1, parseInt(String(poll.ip_limit), 10) || 1);
    const allowRevote = normalizeBoolean(poll.allow_revote, false);

    if (existingVotes >= ipLimit && !allowRevote) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `您已达到投票次数限制（${ipLimit}次）`
      });
    }

    // 验证选项
    if (!option_ids || !Array.isArray(option_ids) || option_ids.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '请选择至少一个选项'
      });
    }

    const uniqueOptionIds = Array.from(new Set(option_ids));

    // 如果允许修改投票，删除之前的投票
    if (allowRevote && existingVotes > 0) {
      const oldVotes = await NotePollVote.findAll({
        where: {
          poll_id: pollId,
          voter_ip: clientIP
        },
        transaction
      });

      await NotePollVote.destroy({
        where: {
          poll_id: pollId,
          voter_ip: clientIP
        },
        transaction
      });

      for (const vote of oldVotes) {
        await NotePollOption.decrement('vote_count', {
          where: { id: vote.option_id },
          transaction
        });
      }
    }

    // 验证选项数量
    if (poll.poll_type === 'single' && uniqueOptionIds.length > 1) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '单选投票只能选择一个选项'
      });
    }

    if (poll.poll_type === 'multiple' && uniqueOptionIds.length > poll.max_choices) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `最多只能选择${poll.max_choices}个选项`
      });
    }

    // 验证选项是否属于该投票
    const validOptions = poll.options.map(opt => opt.id);
    const invalidOptions = uniqueOptionIds.filter(id => !validOptions.includes(id));
    if (invalidOptions.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '选项无效'
      });
    }

    // 创建投票记录
    const votes = uniqueOptionIds.map(option_id => ({
      poll_id: pollId,
      option_id,
      voter_ip: clientIP,
      user_agent: userAgent
    }));

    await NotePollVote.bulkCreate(votes, { transaction });

    // 更新选项投票数
    for (const option_id of uniqueOptionIds) {
      await NotePollOption.increment('vote_count', {
        where: { id: option_id },
        transaction
      });
    }

    // 更新总投票人数（如果是新投票者）
    if (existingVotes === 0) {
      await NotePoll.increment('total_votes', {
        where: { id: pollId },
        transaction
      });
    }

    await transaction.commit();

    // 返回更新后的投票结果
    const updatedPoll = await NotePoll.findByPk(pollId, {
      include: [{
        model: NotePollOption,
        as: 'options',
        attributes: ['id', 'option_text', 'option_image', 'sort_order', 'vote_count']
      }],
      order: [[{ model: NotePollOption, as: 'options' }, 'sort_order', 'ASC']]
    });

    const pollData = updatedPoll.toJSON();

    const resolvedResultVisibility = normalizePollResultVisibility(updatedPoll.result_visibility, 'admin');
    const hasVoted = true;

    const canShowResults =
      resolvedResultVisibility === 'before' ||
      (resolvedResultVisibility === 'after' && hasVoted);

    if (!canShowResults) {
      pollData.options = pollData.options.map(opt => ({
        ...opt,
        vote_count: undefined
      }));
    }

    const canShowParticipants = normalizeBoolean(updatedPoll.show_participants, true);

    if (!canShowParticipants) {
      pollData.total_votes = undefined;
    }

    res.json({
      success: true,
      message: '投票成功',
      data: pollData
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * 获取投票结果
 * GET /api/polls/:pollId/results
 */
exports.getPollResults = async (req, res, next) => {
  try {
    const { pollId } = req.params;
    const clientIP = getClientIP(req);
    const requester = await getRequester(req);
    const password = req.query?.password;

    const poll = await NotePoll.findByPk(pollId, {
      include: [{
        model: NotePollOption,
        as: 'options',
        attributes: ['id', 'option_text', 'option_image', 'sort_order', 'vote_count']
      }],
      order: [[{ model: NotePollOption, as: 'options' }, 'sort_order', 'ASC']]
    });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: '投票不存在'
      });
    }

    const note = await Note.findByPk(poll.note_id);
    if (!ensureNoteAccess(req, res, note, requester, password)) return;

    // 检查用户是否已投票
    const hasVoted = await NotePollVote.count({
      where: {
        poll_id: pollId,
        voter_ip: clientIP
      }
    }) > 0;

    const resolvedResultVisibility = normalizePollResultVisibility(poll.result_visibility, 'admin');

    // 根据结果可见性决定是否返回结果
    if (resolvedResultVisibility === 'admin') {
      return res.status(403).json({
        success: false,
        message: '投票结果仅管理员可见'
      });
    }

    if (resolvedResultVisibility === 'after' && !hasVoted) {
      return res.status(403).json({
        success: false,
        message: '请先投票后查看结果'
      });
    }

    res.json({
      success: true,
      data: (() => {
        const showParticipants = normalizeBoolean(poll.show_participants, true);
        const pollData = poll.toJSON();
        if (!showParticipants) pollData.total_votes = undefined;
        return pollData;
      })()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前用户的投票记录
 * GET /api/polls/:pollId/my-vote
 */
exports.getMyVote = async (req, res, next) => {
  try {
    const { pollId } = req.params;
    const clientIP = getClientIP(req);
    const requester = await getRequester(req);
    const password = req.query?.password;

    const poll = await NotePoll.findByPk(pollId, { attributes: ['id', 'note_id', 'is_active'] });
    const isActive = poll ? normalizeBoolean(poll.is_active, true) : false;
    if (!poll || !isActive) {
      return res.status(404).json({
        success: false,
        message: '投票不存在或已关闭'
      });
    }

    const note = await Note.findByPk(poll.note_id);
    if (!ensureNoteAccess(req, res, note, requester, password)) return;

    const votes = await NotePollVote.findAll({
      where: {
        poll_id: pollId,
        voter_ip: clientIP
      },
      attributes: ['option_id', 'created_at']
    });

    res.json({
      success: true,
      data: {
        hasVoted: votes.length > 0,
        votes: votes.map(v => ({
          option_id: v.option_id,
          voted_at: v.created_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取投票详细记录（管理端）
 * GET /api/admin/polls/:pollId/votes
 */
exports.getPollVotes = async (req, res, next) => {
  try {
    const { pollId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // 获取投票信息
    const poll = await NotePoll.findByPk(pollId, {
      include: [{
        model: NotePollOption,
        as: 'options',
        attributes: ['id', 'option_text', 'sort_order'],
        order: [['sort_order', 'ASC']]
      }]
    });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: '投票不存在'
      });
    }

    // 获取所有投票记录
    const allVotes = await NotePollVote.findAll({
      where: { poll_id: pollId },
      attributes: ['voter_ip', 'option_id', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    // 按 IP 和时间分组投票记录
    const votesBySubmission = {};
    allVotes.forEach(vote => {
      const key = `${vote.voter_ip}_${vote.created_at.getTime()}`;
      if (!votesBySubmission[key]) {
        votesBySubmission[key] = {
          voter_ip: vote.voter_ip,
          created_at: vote.created_at,
          selected_options: []
        };
      }
      votesBySubmission[key].selected_options.push(vote.option_id);
    });

    // 转换为数组并排序
    const submissions = Object.values(votesBySubmission).sort((a, b) =>
      b.created_at.getTime() - a.created_at.getTime()
    );

    // 分页
    const total = submissions.length;
    const paginatedSubmissions = submissions.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        poll: {
          id: poll.id,
          title: poll.title,
          poll_type: poll.poll_type,
          max_choices: poll.max_choices,
          start_time: poll.start_time,
          end_time: poll.end_time,
          result_visibility: poll.result_visibility,
          show_participants: poll.show_participants,
          allow_revote: poll.allow_revote,
          ip_limit: poll.ip_limit,
          is_active: poll.is_active,
          options: poll.options
        },
        votes: paginatedSubmissions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 导出投票数据（管理端）
 * GET /api/admin/notes/:noteId/polls/:pollId/export
 */
exports.exportPollData = async (req, res, next) => {
  try {
    const { noteId, pollId } = req.params;

    // 获取投票信息
    const poll = await NotePoll.findOne({
      where: { id: pollId, note_id: noteId },
      include: [{
        model: NotePollOption,
        as: 'options',
        attributes: ['id', 'option_text', 'sort_order'],
        order: [['sort_order', 'ASC']]
      }]
    });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: '投票不存在'
      });
    }

    // 获取所有投票记录
    const allVotes = await NotePollVote.findAll({
      where: { poll_id: pollId },
      attributes: ['voter_ip', 'option_id', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    // 按 IP 和时间分组投票记录
    const votesBySubmission = {};
    allVotes.forEach(vote => {
      const key = `${vote.voter_ip}_${vote.created_at.getTime()}`;
      if (!votesBySubmission[key]) {
        votesBySubmission[key] = {
          voter_ip: vote.voter_ip,
          created_at: vote.created_at,
          selected_options: []
        };
      }
      votesBySubmission[key].selected_options.push(vote.option_id);
    });

    // 转换为数组并排序
    const submissions = Object.values(votesBySubmission).sort((a, b) =>
      b.created_at.getTime() - a.created_at.getTime()
    );

    // 构建CSV数据
    const rows = [];

    // 表头：序号、提交时间、IP地址、每个选项
    const headers = ['序号', '提交时间', 'IP地址'];
    poll.options.forEach(option => {
      headers.push(option.option_text);
    });
    rows.push(headers);

    // 数据行
    submissions.forEach((submission, index) => {
      const row = [
        index + 1,
        new Date(submission.created_at).toLocaleString('zh-CN'),
        submission.voter_ip
      ];

      // 为每个选项添加一列，选中显示"✓"，未选中显示空
      poll.options.forEach(option => {
        row.push(submission.selected_options.includes(option.id) ? '✓' : '');
      });

      rows.push(row);
    });

    // 转换为CSV格式
    const csv = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // 使用投票标题作为文件名
    const sanitizedTitle = poll.title.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 50);
    const filename = `${sanitizedTitle}_投票数据_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send('\ufeff' + csv); // 添加BOM以支持Excel正确显示中文
  } catch (error) {
    next(error);
  }
};

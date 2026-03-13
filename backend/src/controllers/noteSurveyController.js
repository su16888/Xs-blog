/**
 * @file noteSurveyController.js
 * @description 笔记问卷控制器
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-20
 */

const { NoteSurvey, NoteSurveyQuestion, NoteSurveyQuestionOption, NoteSurveySubmission, NoteSurveyAnswer, Note, NotePoll, NoteLottery } = require('../models/associations');
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

const normalizeSurveyResultVisibility = (value, fallback = 'before') => {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const normalized = String(value).trim();
  if (normalized === 'none') return 'admin';
  if (normalized === 'public') return 'before';
  if (normalized === 'before' || normalized === 'after' || normalized === 'admin') return normalized;
  return fallback;
};

// ==================== 管理端接口 ====================

/**
 * 创建问卷
 * POST /api/admin/notes/:noteId/surveys
 */
exports.createSurvey = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { noteId } = req.params;
    const { title, description, start_time, end_time, ip_limit, allow_resubmit,
            result_visibility, show_results_after_submit, show_participants, is_active, questions } = req.body;

    // 验证笔记是否存在
    const note = await Note.findByPk(noteId);
    if (!note) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
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
        message: '该笔记已有投票，不能同时创建问卷'
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
        message: '该笔记已有抽奖，不能同时创建问卷'
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
        message: '该笔记已有问卷，每个笔记只能创建1个问卷'
      });
    }

    // 验证题目数量
    if (!questions || questions.length < 1) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '至少需要1个题目'
      });
    }

    // 创建问卷
    const resolvedResultVisibility =
      result_visibility !== undefined
        ? normalizeSurveyResultVisibility(result_visibility, 'before')
        : (show_results_after_submit ? 'after' : 'before');

    const survey = await NoteSurvey.create({
      note_id: noteId,
      title,
      description,
      start_time,
      end_time,
      ip_limit: ip_limit || 1,
      allow_resubmit: allow_resubmit || false,
      result_visibility: resolvedResultVisibility,
      show_participants: show_participants !== undefined ? show_participants : true,
      redirect_url: req.body.redirect_url || null,
      is_active: is_active !== undefined ? is_active : true
    }, { transaction });

    // 创建题目
    for (const question of questions) {
      const createdQuestion = await NoteSurveyQuestion.create({
        survey_id: survey.id,
        question_type: question.question_type,
        question_title: question.question_title,
        question_description: question.question_description,
        question_image: question.question_image,
        is_required: question.is_required || false,
        sort_order: question.sort_order || 0,
        config: question.config || {}
      }, { transaction });

      // 如果是选择题，创建选项
      if (['radio', 'checkbox'].includes(question.question_type) && question.options) {
        const options = question.options.map((opt, index) => ({
          question_id: createdQuestion.id,
          option_text: opt.option_text,
          option_image: opt.option_image,
          sort_order: opt.sort_order !== undefined ? opt.sort_order : index
        }));
        await NoteSurveyQuestionOption.bulkCreate(options, { transaction });
      }
    }

    await transaction.commit();

    // 重新查询完整数据
    const createdSurvey = await NoteSurvey.findByPk(survey.id, {
      include: [{
        model: NoteSurveyQuestion,
        as: 'questions',
        include: [{
          model: NoteSurveyQuestionOption,
          as: 'options'
        }],
        order: [['sort_order', 'ASC']]
      }]
    });

    res.json({
      success: true,
      message: '问卷创建成功',
      data: createdSurvey
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * 更新问卷
 * PUT /api/admin/notes/:noteId/surveys/:surveyId
 */
exports.updateSurvey = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { noteId, surveyId } = req.params;
    const { title, description, start_time, end_time, ip_limit, allow_resubmit,
            result_visibility, show_results_after_submit, show_participants, is_active, questions } = req.body;

    const resolvedIpLimit =
      ip_limit === undefined || ip_limit === null || String(ip_limit).trim() === ''
        ? undefined
        : Math.max(1, parseInt(String(ip_limit), 10) || 1);

    // 查找问卷
    const survey = await NoteSurvey.findOne({
      where: { id: surveyId, note_id: noteId }
    });

    if (!survey) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '问卷不存在'
      });
    }

    const totalSubmissionRecords = await NoteSurveySubmission.count({
      where: { survey_id: surveyId },
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

    const stableStringify = (input) => {
      const sortValue = (value) => {
        if (Array.isArray(value)) return value.map(sortValue);
        if (value && typeof value === 'object') {
          const keys = Object.keys(value).sort();
          const result = {};
          for (const key of keys) result[key] = sortValue(value[key]);
          return result;
        }
        return value;
      };
      return JSON.stringify(sortValue(input));
    };

    const normalizeQuestion = (q, fallbackSortOrder) => ({
      id: q?.id ? parseInt(String(q.id), 10) : undefined,
      question_type: q?.question_type ? String(q.question_type) : '',
      question_title: q?.question_title ? String(q.question_title) : '',
      question_description: q?.question_description ? String(q.question_description) : '',
      question_image: q?.question_image ? String(q.question_image) : '',
      is_required: !!q?.is_required,
      sort_order: q?.sort_order !== undefined ? Number(q.sort_order) : fallbackSortOrder,
      config: q?.config ?? {},
      options: Array.isArray(q?.options)
        ? q.options.map((opt, index) => ({
            id: opt?.id ? parseInt(String(opt.id), 10) : undefined,
            option_text: opt?.option_text ? String(opt.option_text) : '',
            option_image: opt?.option_image ? String(opt.option_image) : '',
            sort_order: opt?.sort_order !== undefined ? Number(opt.sort_order) : index
          }))
        : []
    });

    if (totalSubmissionRecords > 0) {
      const incomingStartTime = normalizeDateValue(start_time);
      const incomingTitle = title !== undefined ? String(title) : undefined;
      const incomingDescription = description !== undefined ? (description === null ? '' : String(description)) : undefined;

      const lockedMetaChanged =
        (incomingTitle !== undefined && incomingTitle !== String(survey.title)) ||
        (incomingDescription !== undefined && incomingDescription !== String(survey.description ?? '')) ||
        (start_time !== undefined && !isSameDateOrNull(incomingStartTime, survey.start_time));

      if (lockedMetaChanged) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: '问卷已产生提交，禁止修改问卷内容与题目'
        });
      }

      if (questions !== undefined && Array.isArray(questions)) {
        const existingQuestions = await NoteSurveyQuestion.findAll({
          where: { survey_id: surveyId },
          include: [{
            model: NoteSurveyQuestionOption,
            as: 'options'
          }],
          order: [
            ['sort_order', 'ASC'],
            [{ model: NoteSurveyQuestionOption, as: 'options' }, 'sort_order', 'ASC']
          ],
          transaction
        });

        const normalizedExisting = existingQuestions.map((q, index) => normalizeQuestion(q.toJSON(), index));
        const normalizedIncoming = questions.map((q, index) => normalizeQuestion(q, index));

        const isSameQuestions =
          normalizedExisting.length === normalizedIncoming.length &&
          normalizedExisting.every((existingQ, i) => {
            const incomingQ = normalizedIncoming[i];
            if (existingQ.id !== incomingQ.id) return false;
            if (existingQ.question_type !== incomingQ.question_type) return false;
            if (existingQ.question_title !== incomingQ.question_title) return false;
            if (existingQ.question_description !== incomingQ.question_description) return false;
            if (existingQ.question_image !== incomingQ.question_image) return false;
            if (existingQ.is_required !== incomingQ.is_required) return false;
            if (existingQ.sort_order !== incomingQ.sort_order) return false;
            if (stableStringify(existingQ.config) !== stableStringify(incomingQ.config)) return false;

            const existingOptions = existingQ.options || [];
            const incomingOptions = incomingQ.options || [];
            if (existingOptions.length !== incomingOptions.length) return false;
            for (let j = 0; j < existingOptions.length; j++) {
              const eo = existingOptions[j];
              const io = incomingOptions[j];
              if (eo.id !== io.id) return false;
              if (eo.option_text !== io.option_text) return false;
              if (eo.option_image !== io.option_image) return false;
              if (eo.sort_order !== io.sort_order) return false;
            }
            return true;
          });

        if (!isSameQuestions) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: '问卷已产生提交，禁止修改问卷内容与题目'
          });
        }
      }
    }

    // 更新问卷基本信息
    const resolvedResultVisibility =
      result_visibility !== undefined
        ? normalizeSurveyResultVisibility(result_visibility, survey.result_visibility)
        : (show_results_after_submit ? 'after' : 'before');

    await survey.update({
      title: title !== undefined ? title : survey.title,
      description: description !== undefined ? description : survey.description,
      start_time: start_time !== undefined ? start_time : survey.start_time,
      end_time: end_time !== undefined ? end_time : survey.end_time,
      ip_limit: resolvedIpLimit !== undefined ? resolvedIpLimit : survey.ip_limit,
      allow_resubmit: allow_resubmit !== undefined ? allow_resubmit : survey.allow_resubmit,
      result_visibility: resolvedResultVisibility,
      show_participants: show_participants !== undefined ? show_participants : survey.show_participants,
      redirect_url: req.body.redirect_url !== undefined ? req.body.redirect_url : survey.redirect_url,
      is_active: is_active !== undefined ? is_active : survey.is_active
    }, { transaction });

    // 如果提供了题目，更新题目
    if (questions && Array.isArray(questions) && totalSubmissionRecords === 0) {
      // 删除旧题目（会级联删除选项和答案）
      await NoteSurveyQuestion.destroy({
        where: { survey_id: surveyId },
        transaction
      });

      // 创建新题目
      for (const question of questions) {
        const createdQuestion = await NoteSurveyQuestion.create({
          survey_id: surveyId,
          question_type: question.question_type,
          question_title: question.question_title,
          question_description: question.question_description,
          question_image: question.question_image,
          is_required: question.is_required || false,
          sort_order: question.sort_order || 0,
          config: question.config || {}
        }, { transaction });

        // 如果是选择题，创建选项
        if (['radio', 'checkbox'].includes(question.question_type) && question.options) {
          const options = question.options.map((opt, index) => ({
            question_id: createdQuestion.id,
            option_text: opt.option_text,
            option_image: opt.option_image,
            sort_order: opt.sort_order !== undefined ? opt.sort_order : index
          }));
          await NoteSurveyQuestionOption.bulkCreate(options, { transaction });
        }
      }
    }

    await transaction.commit();

    // 重新查询完整数据
    const updatedSurvey = await NoteSurvey.findByPk(surveyId, {
      include: [{
        model: NoteSurveyQuestion,
        as: 'questions',
        include: [{
          model: NoteSurveyQuestionOption,
          as: 'options'
        }],
        order: [['sort_order', 'ASC']]
      }]
    });

    res.json({
      success: true,
      message: '问卷更新成功',
      data: updatedSurvey
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * 删除问卷
 * DELETE /api/admin/notes/:noteId/surveys/:surveyId
 */
exports.deleteSurvey = async (req, res, next) => {
  try {
    const { noteId, surveyId } = req.params;

    const survey = await NoteSurvey.findOne({
      where: { id: surveyId, note_id: noteId }
    });

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: '问卷不存在'
      });
    }

    await survey.destroy();

    res.json({
      success: true,
      message: '问卷删除成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取笔记的所有问卷（管理端）
 * GET /api/admin/notes/:noteId/surveys
 */
exports.getAdminNoteSurveys = async (req, res, next) => {
  try {
    const { noteId } = req.params;

    const surveys = await NoteSurvey.findAll({
      where: { note_id: noteId },
      include: [{
        model: NoteSurveyQuestion,
        as: 'questions',
        include: [{
          model: NoteSurveyQuestionOption,
          as: 'options',
          order: [['sort_order', 'ASC']]
        }],
        separate: true,
        order: [['sort_order', 'ASC']]
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: surveys
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取问卷提交记录
 * GET /api/admin/surveys/:surveyId/submissions
 */
exports.getSurveySubmissions = async (req, res, next) => {
  try {
    const { surveyId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: submissions } = await NoteSurveySubmission.findAndCountAll({
      where: { survey_id: surveyId },
      include: [{
        model: NoteSurveyAnswer,
        as: 'answers',
        include: [{
          model: NoteSurveyQuestion,
          as: 'question',
          include: [{
            model: NoteSurveyQuestionOption,
            as: 'options'
          }]
        }]
      }],
      order: [['submitted_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        submissions,
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

/**
 * 导出问卷数据
 * GET /api/admin/surveys/:surveyId/export
 */
exports.exportSurveyData = async (req, res, next) => {
  try {
    const { surveyId } = req.params;

    const survey = await NoteSurvey.findByPk(surveyId, {
      include: [{
        model: NoteSurveyQuestion,
        as: 'questions',
        include: [{
          model: NoteSurveyQuestionOption,
          as: 'options'
        }]
      }]
    });

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: '问卷不存在'
      });
    }

    const submissions = await NoteSurveySubmission.findAll({
      where: { survey_id: surveyId },
      include: [{
        model: NoteSurveyAnswer,
        as: 'answers',
        include: [{
          model: NoteSurveyQuestion,
          as: 'question'
        }]
      }],
      order: [['submitted_at', 'DESC']]
    });

    // 构建CSV数据
    const headers = ['提交时间', 'IP地址'];
    survey.questions.forEach(q => {
      headers.push(q.question_title);
    });

    const rows = [headers];
    submissions.forEach(submission => {
      const row = [
        new Date(submission.submitted_at).toLocaleString('zh-CN'),
        submission.submitter_ip
      ];

      survey.questions.forEach(question => {
        const answer = submission.answers.find(a => a.question_id === question.id);
        if (answer) {
          if (answer.answer_text) {
            row.push(answer.answer_text);
          } else if (answer.selected_options && answer.selected_options.length > 0) {
            const selectedTexts = answer.selected_options.map(optId => {
              const opt = question.options.find(o => o.id === optId);
              return opt ? opt.option_text : '';
            }).filter(Boolean);
            row.push(selectedTexts.join('; '));
          } else if (answer.answer_file) {
            row.push(answer.answer_file);
          } else {
            row.push('');
          }
        } else {
          row.push('');
        }
      });

      rows.push(row);
    });

    // 转换为CSV格式
    const csv = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // 使用问卷标题作为文件名
    const sanitizedTitle = survey.title.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 50);
    const filename = `${sanitizedTitle}_问卷数据_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send('\ufeff' + csv); // 添加BOM以支持Excel正确显示中文
  } catch (error) {
    next(error);
  }
};

// ==================== 前台接口 ====================

/**
 * 获取笔记的问卷列表（前台）
 * GET /api/notes/:noteId/surveys
 */
exports.getNoteSurveys = async (req, res, next) => {
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

    const surveys = await NoteSurvey.findAll({
      where: {
        note_id: note.id,
        is_active: true
      },
      include: [{
        model: NoteSurveyQuestion,
        as: 'questions',
        include: [{
          model: NoteSurveyQuestionOption,
          as: 'options'
        }],
        order: [['sort_order', 'ASC']]
      }],
      order: [['created_at', 'ASC']]
    });

    // 检查用户是否已提交
    const surveysWithStatus = await Promise.all(surveys.map(async (survey) => {
      const submissionCount = await NoteSurveySubmission.count({
        where: {
          survey_id: survey.id,
          submitter_ip: clientIP
        }
      });

      const surveyData = survey.toJSON();
      surveyData.hasSubmitted = submissionCount > 0;
      surveyData.submissionCount = submissionCount;

      // 检查问卷状态
      const now = new Date();
      if (survey.start_time && new Date(survey.start_time) > now) {
        surveyData.status = 'not_started';
      } else if (survey.end_time && new Date(survey.end_time) < now) {
        surveyData.status = 'ended';
      } else {
        surveyData.status = 'active';
      }

      const resolvedResultVisibility = normalizeSurveyResultVisibility(survey.result_visibility, 'before');
      const canShowParticipants =
        requester.isAdmin ||
        (survey.show_participants && (
          resolvedResultVisibility === 'before' ||
          (resolvedResultVisibility === 'after' && surveyData.hasSubmitted)
        ));

      if (!canShowParticipants) {
        surveyData.total_submissions = undefined;
      }

      return surveyData;
    }));

    res.json({
      success: true,
      data: surveysWithStatus
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 提交问卷
 * POST /api/surveys/:surveyId/submit
 */
exports.submitSurvey = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { surveyId } = req.params;
    const { answers } = req.body;
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const requester = await getRequester(req);
    const password = req.body?.password;

    // 验证问卷是否存在
    const survey = await NoteSurvey.findByPk(surveyId, {
      include: [{
        model: NoteSurveyQuestion,
        as: 'questions',
        include: [{
          model: NoteSurveyQuestionOption,
          as: 'options'
        }]
      }]
    });

    if (!survey || !survey.is_active) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '问卷不存在或已关闭'
      });
    }

    const note = await Note.findByPk(survey.note_id);
    if (!ensureNoteAccess(req, res, note, requester, password)) {
      await transaction.rollback();
      return;
    }

    // 检查问卷时间
    const now = new Date();
    if (survey.start_time && new Date(survey.start_time) > now) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '问卷尚未开始'
      });
    }

    if (survey.end_time && new Date(survey.end_time) < now) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '问卷已结束'
      });
    }

    // 检查IP提交次数限制
    const existingSubmissions = await NoteSurveySubmission.findAll({
      where: {
        survey_id: surveyId,
        submitter_ip: clientIP
      },
      attributes: ['id'],
      raw: true
    });
    const existingSubmissionCount = existingSubmissions.length;

    if (existingSubmissionCount >= survey.ip_limit && !survey.allow_resubmit) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `您已达到提交次数限制（${survey.ip_limit}次）`
      });
    }

    if (survey.allow_resubmit && existingSubmissionCount > 0) {
      const submissionIds = existingSubmissions.map(submission => submission.id);

      await NoteSurveyAnswer.destroy({
        where: { submission_id: submissionIds },
        transaction
      });

      await NoteSurveySubmission.destroy({
        where: { id: submissionIds },
        transaction
      });

      await NoteSurvey.decrement('total_submissions', {
        by: existingSubmissionCount,
        where: { id: surveyId },
        transaction
      });
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '请填写问卷内容'
      });
    }

    // 验证必填题
    for (const question of survey.questions) {
      if (question.is_required) {
        const answer = answers.find(a => a.question_id === question.id);
        if (!answer || (!answer.answer_text && !answer.answer_file && (!answer.selected_options || answer.selected_options.length === 0))) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `题目"${question.question_title}"为必填项`
          });
        }
      }
    }

    // 创建提交记录
    const submission = await NoteSurveySubmission.create({
      survey_id: surveyId,
      submitter_ip: clientIP,
      user_agent: userAgent,
      submitted_at: new Date()
    }, { transaction });

    // 保存答案
    for (const answer of answers) {
      await NoteSurveyAnswer.create({
        submission_id: submission.id,
        question_id: answer.question_id,
        answer_text: answer.answer_text || null,
        answer_file: answer.answer_file || null,
        selected_options: answer.selected_options || []
      }, { transaction });
    }

    // 更新总提交数
    await NoteSurvey.increment('total_submissions', {
      where: { id: surveyId },
      transaction
    });

    await transaction.commit();

    res.json({
      success: true,
      message: '提交成功',
      data: { submission_id: submission.id }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * 获取我的提交记录
 * GET /api/surveys/:surveyId/my-submission
 */
exports.getMySubmission = async (req, res, next) => {
  try {
    const { surveyId } = req.params;
    const clientIP = getClientIP(req);
    const requester = await getRequester(req);
    const password = req.query?.password;

    const survey = await NoteSurvey.findByPk(surveyId, { attributes: ['id', 'note_id', 'is_active', 'result_visibility'] });
    if (!survey || !survey.is_active) {
      return res.status(404).json({
        success: false,
        message: '问卷不存在或已关闭'
      });
    }

    const note = await Note.findByPk(survey.note_id);
    if (!ensureNoteAccess(req, res, note, requester, password)) return;

    const submissions = await NoteSurveySubmission.findAll({
      where: {
        survey_id: surveyId,
        submitter_ip: clientIP
      },
      include: [{
        model: NoteSurveyAnswer,
        as: 'answers',
        include: [{
          model: NoteSurveyQuestion,
          as: 'question'
        }]
      }],
      order: [['submitted_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        hasSubmitted: submissions.length > 0,
        submissions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取问卷统计结果（公开接口）
 * GET /api/surveys/:surveyId/statistics
 */
exports.getSurveyStatistics = async (req, res, next) => {
  try {
    const { surveyId } = req.params;
    const requester = await getRequester(req);
    const password = req.query?.password;

    // 获取问卷信息
    const survey = await NoteSurvey.findByPk(surveyId, {
      include: [{
        model: NoteSurveyQuestion,
        as: 'questions',
        include: [{
          model: NoteSurveyQuestionOption,
          as: 'options'
        }],
        order: [['sort_order', 'ASC']]
      }]
    });

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: '问卷不存在'
      });
    }

    const note = await Note.findByPk(survey.note_id);
    if (!ensureNoteAccess(req, res, note, requester, password)) return;

    const resolvedResultVisibility = normalizeSurveyResultVisibility(survey.result_visibility, 'before');
    let hasSubmitted = false;

    if (!requester.isAdmin) {
      if (resolvedResultVisibility === 'admin') {
        return res.status(403).json({
          success: false,
          message: '问卷结果仅管理员可见'
        });
      }

      const clientIP = getClientIP(req);
      hasSubmitted = await NoteSurveySubmission.count({
        where: {
          survey_id: surveyId,
          submitter_ip: clientIP
        }
      }) > 0;

      if (resolvedResultVisibility === 'after' && !hasSubmitted) {
        return res.status(403).json({
          success: false,
          message: '请先提交后查看结果'
        });
      }
    }

    // 获取所有提交记录
    const submissions = await NoteSurveySubmission.findAll({
      where: { survey_id: surveyId },
      include: [{
        model: NoteSurveyAnswer,
        as: 'answers'
      }]
    });

    // 计算统计数据
    const statistics = {
      total_submissions: submissions.length,
      questions: []
    };

    if (!requester.isAdmin) {
      const canShowParticipants =
        survey.show_participants && (
          resolvedResultVisibility === 'before' ||
          (resolvedResultVisibility === 'after' && hasSubmitted)
        );

      if (!canShowParticipants) {
        statistics.total_submissions = undefined;
      }
    }

    for (const question of survey.questions) {
      const questionStats = {
        id: question.id,
        question_type: question.question_type,
        question_title: question.question_title,
        total_answers: 0
      };

      if (['radio', 'checkbox'].includes(question.question_type)) {
        // 选择题统计
        questionStats.options = question.options.map(option => ({
          id: option.id,
          option_text: option.option_text,
          count: 0,
          percentage: 0
        }));

        submissions.forEach(submission => {
          const answer = submission.answers.find(a => a.question_id === question.id);
          if (answer && answer.selected_options) {
            questionStats.total_answers++;
            answer.selected_options.forEach(optId => {
              const optStat = questionStats.options.find(o => o.id === optId);
              if (optStat) {
                optStat.count++;
              }
            });
          }
        });

        // 计算百分比
        questionStats.options.forEach(opt => {
          opt.percentage = submissions.length > 0
            ? Math.round((opt.count / submissions.length) * 100)
            : 0;
        });
      } else if (question.question_type === 'rating') {
        // 评分题统计
        const ratings = [];
        submissions.forEach(submission => {
          const answer = submission.answers.find(a => a.question_id === question.id);
          if (answer && answer.answer_text) {
            ratings.push(parseInt(answer.answer_text));
            questionStats.total_answers++;
          }
        });

        questionStats.average = ratings.length > 0
          ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
          : 0;
        questionStats.count = ratings.length;
      } else {
        // 文本题统计
        submissions.forEach(submission => {
          const answer = submission.answers.find(a => a.question_id === question.id);
          if (answer && answer.answer_text) {
            questionStats.total_answers++;
          }
        });
      }

      statistics.questions.push(questionStats);
    }

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

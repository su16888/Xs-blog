/**
 * @file noteController.js
 * @description Xs-Blog 笔记控制器（重构版：公开/管理方法分离）
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 2.0.0
 * @created 2025-11-06
 * @updated 2025-11-18
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { Note, Tag, Category, NoteTag, NotePoll, NoteSurvey, NoteLottery } = require('../models/associations');
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const config = require('../config/config');

// IP密码错误次数限制
const passwordAttempts = new Map();
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 60 * 60 * 1000;

const getClientIP = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';

const checkPasswordAttempts = (ip) => {
  const record = passwordAttempts.get(ip);
  if (!record || Date.now() - record.firstAttempt > LOCKOUT_DURATION) {
    if (record) passwordAttempts.delete(ip);
    return { allowed: true, remaining: MAX_ATTEMPTS, count: 0 };
  }
  const remaining = MAX_ATTEMPTS - record.count;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining), count: record.count };
};

const recordFailedAttempt = (ip) => {
  const record = passwordAttempts.get(ip);
  if (!record || Date.now() - record.firstAttempt > LOCKOUT_DURATION) {
    passwordAttempts.set(ip, { count: 1, firstAttempt: Date.now() });
    return { remaining: MAX_ATTEMPTS - 1, count: 1 };
  }
  record.count++;
  return { remaining: Math.max(0, MAX_ATTEMPTS - record.count), count: record.count };
};

const clearAttempts = (ip) => passwordAttempts.delete(ip);
// ==================== 公开API方法（/api/notes） ====================

// 获取已发布笔记列表（公开访问，只返回展示字段）
exports.getPublicNotes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || 'desc';
    const offset = (page - 1) * limit;

    const { category_id, tag_id, category, tag, search } = req.query;
    const where = {
      is_published: true,
      show_in_list: true
    };

    const include = [
      {
        model: Tag,
        as: 'tagList',
        attributes: ['name', 'color'],
        through: { attributes: [] },
        required: false
      },
      {
        model: Category,
        as: 'categoryInfo',
        attributes: ['name', 'icon'],
        required: false
      }
    ];

    if (category_id) {
      where.category_id = category_id;
    } else if (category) {
      where.category = { [Op.like]: `%${category}%` };
    }

    if (tag_id) {
      include[0].where = { id: tag_id };
      include[0].required = true;
    } else if (tag) {
      where.tags = { [Op.like]: `%${tag}%` };
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
        { tags: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Note.findAndCountAll({
      where,
      include,
      attributes: {
        exclude: ['created_at', 'updated_at', 'sort_order', 'content']
      },
      order: [
        ['is_pinned', 'DESC'],
        ['published_at', sort.toUpperCase()]
      ],
      limit,
      offset,
      distinct: true
    });

    const noteIds = rows.map(note => note.id);
    const [pollCounts, surveyCounts, lotteryCounts, diskCounts] = noteIds.length > 0
      ? await Promise.all([
          NotePoll.findAll({
            where: { note_id: noteIds },
            attributes: ['note_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['note_id'],
            raw: true
          }),
          NoteSurvey.findAll({
            where: { note_id: noteIds },
            attributes: ['note_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['note_id'],
            raw: true
          }),
          NoteLottery.findAll({
            where: { note_id: noteIds },
            attributes: ['note_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['note_id'],
            raw: true
          }),
          sequelize.query(
            'SELECT note_id, COUNT(*) as count FROM note_disks WHERE note_id IN (:noteIds) GROUP BY note_id',
            {
              replacements: { noteIds },
              type: QueryTypes.SELECT
            }
          )
        ])
      : [[], [], [], []];

    const pollCountMap = new Map(pollCounts.map(item => [item.note_id, Number(item.count || 0)]));
    const surveyCountMap = new Map(surveyCounts.map(item => [item.note_id, Number(item.count || 0)]));
    const lotteryCountMap = new Map(lotteryCounts.map(item => [item.note_id, Number(item.count || 0)]));
    const diskCountMap = new Map(diskCounts.map(item => [item.note_id, Number(item.count || 0)]));

    const sanitizedNotes = rows.map(note => {
      const noteData = note.toJSON();

      const pollCount = pollCountMap.get(note.id) || 0;
      const surveyCount = surveyCountMap.get(note.id) || 0;
      const lotteryCount = lotteryCountMap.get(note.id) || 0;
      const diskCount = diskCountMap.get(note.id) || 0;

      noteData.has_poll = pollCount > 0;
      noteData.has_survey = surveyCount > 0;
      noteData.has_lottery = lotteryCount > 0;
      noteData.has_disk = diskCount > 0;
      
      delete noteData.password;
      delete noteData.created_at;
      delete noteData.updated_at;
      delete noteData.sort_order;
      delete noteData.content;

      if (note.password && note.password.trim() !== '') {
        noteData.requiresPassword = true;
        delete noteData.media_urls;
        delete noteData.external_link;
      }

      return noteData;
    });

    res.json({
      success: true,
      data: {
        notes: sanitizedNotes,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count / limit),
          total_count: count,
          per_page: limit
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取公开笔记详情
exports.getPublicNoteById = async (req, res, next) => {
  try {
    console.log('[getPublicNoteById] 开始处理请求, id:', req.params.id);
    const { id } = req.params;
    console.log('[getPublicNoteById] 步骤1: 获取ID成功');
    console.log('[getPublicNoteById] req.body:', req.body);
    console.log('[getPublicNoteById] req.query:', req.query);

    // 验证 id 参数
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: '无效的笔记ID'
      });
    }

    // 安全地获取密码参数
    const password = (req.body && req.body.password) || (req.query && req.query.password);

    let note;
    try {
      console.log('[getPublicNoteById] 步骤2: 开始查询数据库');
      const includeOptions = [
        { model: Tag, as: 'tagList', attributes: ['name', 'color'], through: { attributes: [] } },
        { model: Category, as: 'categoryInfo', attributes: ['name', 'icon'] }
      ];

      // 优先用 custom_slug 查询
      note = await Note.findOne({ where: { custom_slug: id }, include: includeOptions });

      // 如果没找到且是纯数字，再用 id 查询
      if (!note && /^\d+$/.test(id)) {
        note = await Note.findOne({ where: { id: parseInt(id) }, include: includeOptions });
      }
      console.log('[getPublicNoteById] 步骤3: 数据库查询完成, note:', note ? 'found' : 'not found');
    } catch (dbError) {
      console.error('[getPublicNoteById] 数据库查询错误:', dbError);
      return res.status(500).json({
        success: false,
        message: '数据库查询失败'
      });
    }

    if (!note) {
      console.log('[getPublicNoteById] 步骤4: 笔记不存在');
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    console.log('[getPublicNoteById] 步骤5: 检查发布状态, is_published:', note.is_published);
    if (!note.is_published) {
      return res.status(403).json({
        success: false,
        message: '无权访问此笔记'
      });
    }

    console.log('[getPublicNoteById] 步骤6: 检查密码字段');
    // 安全地检查密码字段
    const notePassword = note.password;
    console.log('[getPublicNoteById] 步骤7: notePassword类型:', typeof notePassword);
    const hasPassword = notePassword && typeof notePassword === 'string' && notePassword.trim() !== '';
    console.log('[getPublicNoteById] 步骤8: hasPassword:', hasPassword);

    if (hasPassword) {
      if (!password) {
        console.log('[getPublicNoteById] 步骤9a: 需要密码但未提供');
        return res.json({
          success: true,
          data: {
            id: note.id,
            title: note.title,
            category: note.category,
            category_id: note.category_id,
            tags: note.tags,
            tagList: note.tagList,
            categoryInfo: note.categoryInfo,
            is_published: note.is_published,
            is_pinned: note.is_pinned,
            published_at: note.published_at,
            requiresPassword: true,
            content: null
          }
        });
      }

      if (password !== notePassword) {
        console.log('[getPublicNoteById] 步骤9b: 密码错误');
        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
    }

    console.log('[getPublicNoteById] 步骤9: 准备返回数据');
    const noteData = note.toJSON();
    console.log('[getPublicNoteById] 步骤10: toJSON完成');
    delete noteData.password;
    delete noteData.created_at;
    delete noteData.updated_at;
    delete noteData.sort_order;
    console.log('[getPublicNoteById] 步骤11: 删除敏感字段完成');

    console.log('[getPublicNoteById] 步骤12: 准备发送响应');
    res.json({
      success: true,
      data: {
        ...noteData,
        requiresPassword: false
      }
    });
    console.log('[getPublicNoteById] 步骤13: 响应发送完成');
  } catch (error) {
    console.error('[getPublicNoteById] 捕获到错误:', error);
    console.error('[getPublicNoteById] 错误堆栈:', error.stack);
    next(error);
  }
};

// 获取公开笔记标签统计
exports.getPublicNoteTagStats = async (req, res, next) => {
  try {
    const { sequelize } = require('../config/database');

    const stats = await sequelize.query(`
      SELECT
        t.name, t.color,
        COUNT(nt.note_id) as usage_count
      FROM tags t
      LEFT JOIN note_tags nt ON t.id = nt.tag_id
      GROUP BY t.id
      ORDER BY usage_count DESC, t.name ASC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// 获取公开笔记云盘列表（需要密码验证）
exports.getPublicNoteDisks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.query;
    const { sequelize } = require('../config/database');

    // 验证 id 参数
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: '无效的笔记ID'
      });
    }

    const note = await Note.findByPk(id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    if (!note.is_published) {
      return res.status(403).json({
        success: false,
        message: '无权访问此笔记'
      });
    }

    // 安全地检查密码字段
    const notePassword = note.password;
    const hasPassword = notePassword && typeof notePassword === 'string' && notePassword.trim() !== '';

    if (hasPassword) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: '此笔记需要密码',
          requiresPassword: true
        });
      }

      if (password !== notePassword) {
        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
    }

    const disks = await sequelize.query(`
      SELECT * FROM note_disks
      WHERE note_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: disks
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理API方法（/api/admin/notes） ====================

// 获取所有笔记（管理后台，返回完整字段）
exports.getAdminNotes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || 'desc';
    const offset = (page - 1) * limit;

    const { category_id, tag_id, category, tag, search, is_published, category_empty } = req.query;
    const where = {};

    if (is_published !== undefined) {
      where.is_published = is_published === 'true';
    }

    const include = [
      {
        model: Tag,
        as: 'tagList',
        through: { attributes: [] },
        required: false
      },
      {
        model: Category,
        as: 'categoryInfo',
        required: false
      }
    ];

    if (category_id) {
      where.category_id = category_id;
    } else if (category_empty === 'true') {
      const andConditions = Array.isArray(where[Op.and]) ? where[Op.and] : [];
      andConditions.push({
        [Op.or]: [{ category: { [Op.is]: null } }, { category: '' }]
      });
      where[Op.and] = andConditions;
    } else if (category) {
      where.category = { [Op.like]: `%${category}%` };
    }

    if (tag_id) {
      include[0].where = { id: tag_id };
      include[0].required = true;
    } else if (tag) {
      where.tags = { [Op.like]: `%${tag}%` };
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
        { tags: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Note.findAndCountAll({
      where,
      include,
      order: [
        ['is_pinned', 'DESC'],
        ['sort_order', 'DESC'],
        ['published_at', sort.toUpperCase()]
      ],
      limit,
      offset,
      distinct: true
    });

    const noteIds = rows.map(note => note.id);
    const [pollCounts, surveyCounts, lotteryCounts, diskCounts] = noteIds.length > 0
      ? await Promise.all([
          NotePoll.findAll({
            where: { note_id: noteIds },
            attributes: ['note_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['note_id'],
            raw: true
          }),
          NoteSurvey.findAll({
            where: { note_id: noteIds },
            attributes: ['note_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['note_id'],
            raw: true
          }),
          NoteLottery.findAll({
            where: { note_id: noteIds },
            attributes: ['note_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['note_id'],
            raw: true
          }),
          sequelize.query(
            'SELECT note_id, COUNT(*) as count FROM note_disks WHERE note_id IN (:noteIds) GROUP BY note_id',
            {
              replacements: { noteIds },
              type: QueryTypes.SELECT
            }
          )
        ])
      : [[], [], [], []];

    const pollCountMap = new Map(pollCounts.map(item => [item.note_id, Number(item.count || 0)]));
    const surveyCountMap = new Map(surveyCounts.map(item => [item.note_id, Number(item.count || 0)]));
    const lotteryCountMap = new Map(lotteryCounts.map(item => [item.note_id, Number(item.count || 0)]));
    const diskCountMap = new Map(diskCounts.map(item => [item.note_id, Number(item.count || 0)]));

    const notesWithFlags = rows.map(note => {
      const noteData = note.toJSON();

      const pollCount = pollCountMap.get(note.id) || 0;
      const surveyCount = surveyCountMap.get(note.id) || 0;
      const lotteryCount = lotteryCountMap.get(note.id) || 0;
      const diskCount = diskCountMap.get(note.id) || 0;

      noteData.has_poll = pollCount > 0;
      noteData.has_survey = surveyCount > 0;
      noteData.has_lottery = lotteryCount > 0;
      noteData.has_disk = diskCount > 0;

      return noteData;
    });

    res.json({
      success: true,
      data: {
        notes: notesWithFlags,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count / limit),
          total_count: count,
          per_page: limit
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取管理后台笔记详情
exports.getAdminNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const note = await Note.findByPk(id, {
      include: [
        {
          model: Tag,
          as: 'tagList',
          through: { attributes: [] }
        },
        {
          model: Category,
          as: 'categoryInfo'
        }
      ]
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
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

// 获取管理后台标签统计
exports.getAdminNoteTagStats = async (req, res, next) => {
  try {
    const { sequelize } = require('../config/database');

    const stats = await sequelize.query(`
      SELECT
        t.id, t.name, t.color, t.description, t.category, t.category_id,
        COUNT(nt.note_id) as usage_count
      FROM tags t
      LEFT JOIN note_tags nt ON t.id = nt.tag_id
      GROUP BY t.id
      ORDER BY usage_count DESC, t.name ASC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// 获取管理后台笔记云盘列表（无需密码）
exports.getAdminNoteDisks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sequelize } = require('../config/database');

    const note = await Note.findByPk(id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    const disks = await sequelize.query(`
      SELECT * FROM note_disks
      WHERE note_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: disks
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 向后兼容的旧方法 ====================

// 获取笔记列表（分页）
exports.getNotes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || 'desc';
    const offset = (page - 1) * limit;

    // 筛选条件
    const { category_id, tag_id, category, tag, search } = req.query;
    const where = {};

    // 检查是否是已认证用户（通过token判断）
    const isAuthenticated = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');

    // 检查请求路径：公开请求即使有token也返回简化数据
    const isPublicRequest = !req.path.includes('/admin');

    const include = [
      {
        model: Tag,
        as: 'tagList',
        // 公开请求只返回必要的标签字段，即使有token
        attributes: (isAuthenticated && !isPublicRequest) ? undefined : ['name', 'color'],
        through: { attributes: [] }, // 不返回中间表字段
        required: false
      },
      {
        model: Category,
        as: 'categoryInfo',
        // 公开请求只返回必要的分类字段，即使有token
        attributes: (isAuthenticated && !isPublicRequest) ? undefined : ['name', 'icon'],
        required: false
      }
    ];

    // 如果是公开请求，只返回已发布且在列表中展示的笔记
    if (isPublicRequest) {
      where.is_published = true;
      where.show_in_list = true;
    }

    // 分类筛选 - 支持 category_id 和 category 参数
    if (category_id) {
      where.category_id = category_id;
    } else if (category) {
      // 支持通过分类名称筛选
      where.category = { [Op.like]: `%${category}%` };
    }

    // 标签筛选 - 支持 tag_id 和 tag 参数
    if (tag_id) {
      include[0].where = { id: tag_id };
      include[0].required = true;
    } else if (tag) {
      // 支持通过标签名称筛选（兼容旧的tags字段）
      where.tags = { [Op.like]: `%${tag}%` };
    }

    // 关键词搜索
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
        { tags: { [Op.like]: `%${search}%` } } // 兼容旧的tags字段
      ];
    }

    const { count, rows } = await Note.findAndCountAll({
      where,
      include,
      order: [
        ['is_pinned', 'DESC'],       // 置顶的笔记优先
        ['sort_order', 'DESC'],       // 然后按自定义排序
        ['published_at', sort.toUpperCase()]  // 最后按发布时间排序
      ],
      limit,
      offset,
      distinct: true // 避免重复计数
    });

    // 处理返回数据，移除敏感信息
    const sanitizedNotes = rows.map(note => {
      const noteData = note.toJSON();

      // 对于公开请求，移除敏感字段和内部字段（即使有token）
      if (isPublicRequest) {
        delete noteData.password; // 永远不返回密码
        delete noteData.created_at; // 不返回创建时间
        delete noteData.updated_at; // 不返回更新时间
        delete noteData.sort_order; // 不返回排序字段

        // 列表接口不返回完整正文，只返回摘要
        delete noteData.content;

        // 如果笔记有密码保护，标记需要密码但保留摘要用于预览
        if (note.password && note.password.trim() !== '') {
          noteData.requiresPassword = true;
          // 保留 summary 字段用于列表预览
          delete noteData.media_urls; // 加密笔记不返回媒体URL
          delete noteData.external_link; // 加密笔记不返回外部链接
        }
      } else {
        // 后台管理请求：保留完整数据，包括password字段用于后台管理
      }

      return noteData;
    });

    res.json({
      success: true,
      data: {
        notes: sanitizedNotes,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count / limit),
          total_count: count,
          per_page: limit
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取笔记详情
exports.getNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;
    // 从请求体或URL查询参数获取密码（优先使用请求体）
    const password = (req.body && req.body.password) || (req.query && req.query.password);

    // 检查是否是已认证用户
    const isAuthenticated = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');

    // 尝试通过 ID 或 custom_slug 查找笔记
    let note;
    const isNumericId = /^\d+$/.test(id);

    if (isNumericId) {
      // 如果是数字，按 ID 查找
      note = await Note.findByPk(id, {
        include: [
          {
            model: Tag,
            as: 'tagList',
            // 未认证用户只返回必要的标签字段
            attributes: isAuthenticated ? undefined : ['name', 'color'],
            through: { attributes: [] }
          },
          {
            model: Category,
            as: 'categoryInfo',
            // 未认证用户只返回必要的分类字段
            attributes: isAuthenticated ? undefined : ['name', 'icon']
          }
        ]
      });
    } else {
      // 如果不是数字，按 custom_slug 查找
      note = await Note.findOne({
        where: { custom_slug: id },
        include: [
          {
            model: Tag,
            as: 'tagList',
            // 未认证用户只返回必要的标签字段
            attributes: isAuthenticated ? undefined : ['name', 'color'],
            through: { attributes: [] }
          },
          {
            model: Category,
            as: 'categoryInfo',
            // 未认证用户只返回必要的分类字段
            attributes: isAuthenticated ? undefined : ['name', 'icon']
          }
        ]
      });
    }

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 如果是未认证用户且笔记未发布，拒绝访问
    if (!isAuthenticated && !note.is_published) {
      return res.status(403).json({
        success: false,
        message: '无权访问此笔记'
      });
    }

    // 安全地检查是否需要密码
    const notePassword = note.password;
    const hasPassword = notePassword && typeof notePassword === 'string' && notePassword.trim() !== '';

    // 如果笔记有密码保护
    if (hasPassword) {
      // 如果没有提供密码，返回需要密码的提示
      if (!password) {
        return res.json({
          success: true,
          data: {
            id: note.id,
            title: note.title,
            category: note.category,
            category_id: note.category_id,
            tags: note.tags,
            tagList: note.tagList,
            categoryInfo: note.categoryInfo,
            is_published: note.is_published,
            is_pinned: note.is_pinned,
            published_at: note.published_at,
            created_at: note.created_at,
            requiresPassword: true, // 标记需要密码
            content: null // 不返回内容
          }
        });
      }

      // 验证密码
      if (password !== notePassword) {
        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
    }

    // 密码正确或无需密码，返回完整内容（但不包含密码字段）
    const noteData = note.toJSON();
    delete noteData.password; // 永远不返回密码字段

    // 对于未认证用户，移除内部字段
    if (!isAuthenticated) {
      delete noteData.created_at;
      delete noteData.updated_at;
      delete noteData.sort_order;
    }

    res.json({
      success: true,
      data: {
        ...noteData,
        requiresPassword: false
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取密码尝试状态
exports.getPasswordAttemptStatus = async (req, res) => {
  const clientIP = getClientIP(req);
  const status = checkPasswordAttempts(clientIP);
  res.json({
    success: true,
    errorCount: status.count,
    remaining: status.remaining
  });
};

// 验证笔记密码
exports.verifyNotePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const clientIP = getClientIP(req);

    // 检查IP是否被锁定
    const attemptStatus = checkPasswordAttempts(clientIP);
    if (!attemptStatus.allowed) {
      return res.status(429).json({
        success: false,
        message: '密码错误次数过多，请1小时后重试！',
        errorCount: attemptStatus.count,
        remaining: 0
      });
    }

    const includeOptions = [
      { model: Tag, as: 'tagList', attributes: ['name', 'color'], through: { attributes: [] } },
      { model: Category, as: 'categoryInfo', attributes: ['name', 'icon'] }
    ];

    // 优先用 custom_slug 查询
    let note = await Note.findOne({ where: { custom_slug: id }, include: includeOptions });

    // 如果没找到且是纯数字，再用 id 查询
    if (!note && /^\d+$/.test(id)) {
      note = await Note.findOne({ where: { id: parseInt(id) }, include: includeOptions });
    }

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    if (!note.is_published) {
      return res.status(403).json({
        success: false,
        message: '无权访问此笔记'
      });
    }

    const notePassword = note.password;
    const hasPassword = notePassword && typeof notePassword === 'string' && notePassword.trim() !== '';

    if (!hasPassword) {
      const noteData = note.toJSON();
      delete noteData.password;
      delete noteData.created_at;
      delete noteData.updated_at;
      delete noteData.sort_order;

      return res.json({
        success: true,
        data: {
          ...noteData,
          requiresPassword: false
        }
      });
    }

    // 验证密码
    if (!password || password.trim() !== notePassword.trim()) {
      const result = recordFailedAttempt(clientIP);
      return res.status(401).json({
        success: false,
        message: result.remaining > 0 ? '密码错误' : '密码错误次数过多，请1小时后重试！',
        errorCount: result.count,
        remaining: result.remaining
      });
    }

    // 密码正确，清除错误记录
    clearAttempts(clientIP);

    const noteData = note.toJSON();
    delete noteData.password;
    delete noteData.created_at;
    delete noteData.updated_at;
    delete noteData.sort_order;

    res.json({
      success: true,
      data: {
        ...noteData,
        requiresPassword: false
      }
    });
  } catch (error) {
    next(error);
  }
};

// 创建笔记
exports.createNote = async (req, res, next) => {
  try {
    const {
      title,
      content,
      summary,
      category,
      category_id,
      tags,
      tag_ids,
      is_published,
      password,
      media_type,
      media_urls,
      external_link,
      published_at,
      sort_order,
      is_pinned,
      show_in_list,
      cover_image,
      source_type,
      source_url,
      source_text,
      display_mode,
      custom_slug
    } = req.body;

    // 如果没有提供摘要，自动生成（截取正文前 150 字）
    let noteSummary = summary;
    if (!noteSummary && content) {
      noteSummary = content.length > 150 ? content.substring(0, 150) + '...' : content;
    }

    // 创建笔记
    const note = await Note.create({
      title: title || '',
      content,
      summary: noteSummary,
      category: category || null,
      category_id: category_id || null,
      tags: tags || null, // 保留用于兼容
      is_published: is_published || false,
      password: password && password.trim() !== '' ? password : null,
      media_type: media_type || 'none',
      media_urls: media_urls || null,
      external_link: external_link || null,
      published_at: published_at || new Date(),
      sort_order: sort_order || 0,
      is_pinned: is_pinned || false,
      show_in_list: show_in_list !== undefined ? show_in_list : true,
      cover_image: cover_image || null,
      source_type: source_type || 'none',
      source_url: source_url || null,
      source_text: source_text || null,
      display_mode: display_mode || 'modal',
      custom_slug: custom_slug && custom_slug.trim() !== '' ? custom_slug.trim() : null
    });

    // 关联标签
    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      await note.setTagList(tag_ids);
    }

    // 重新查询以获取完整数据（包含关联）
    const noteWithRelations = await Note.findByPk(note.id, {
      include: [
        {
          model: Tag,
          as: 'tagList',
          through: { attributes: [] }
        },
        {
          model: Category,
          as: 'categoryInfo'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: '笔记创建成功',
      data: noteWithRelations
    });
  } catch (error) {
    next(error);
  }
};

// 更新笔记
exports.updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      summary,
      category,
      category_id,
      tags,
      tag_ids,
      is_published,
      password,
      media_type,
      media_urls,
      external_link,
      published_at,
      sort_order,
      is_pinned,
      show_in_list,
      cover_image,
      source_type,
      source_url,
      source_text,
      display_mode,
      custom_slug
    } = req.body;

    const note = await Note.findByPk(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 如果更新了正文但没有提供摘要，自动生成摘要
    let noteSummary = summary;
    if (summary === undefined && content !== undefined) {
      noteSummary = content.length > 150 ? content.substring(0, 150) + '...' : content;
    }

    // 更新笔记基本信息
    await note.update({
      title: title !== undefined ? title : note.title,
      content: content !== undefined ? content : note.content,
      summary: noteSummary !== undefined ? noteSummary : note.summary,
      category: category !== undefined ? category : note.category,
      category_id: category_id !== undefined ? category_id : note.category_id,
      tags: tags !== undefined ? tags : note.tags,
      is_published: is_published !== undefined ? is_published : note.is_published,
      password: password !== undefined ? (password && password.trim() !== '' ? password : null) : note.password,
      media_type: media_type !== undefined ? media_type : note.media_type,
      media_urls: media_urls !== undefined ? media_urls : note.media_urls,
      external_link: external_link !== undefined ? external_link : note.external_link,
      published_at: published_at !== undefined ? published_at : note.published_at,
      sort_order: sort_order !== undefined ? sort_order : note.sort_order,
      is_pinned: is_pinned !== undefined ? is_pinned : note.is_pinned,
      show_in_list: show_in_list !== undefined ? show_in_list : note.show_in_list,
      cover_image: cover_image !== undefined ? cover_image : note.cover_image,
      source_type: source_type !== undefined ? source_type : note.source_type,
      source_url: source_url !== undefined ? source_url : note.source_url,
      source_text: source_text !== undefined ? source_text : note.source_text,
      custom_slug: custom_slug !== undefined ? (custom_slug && custom_slug.trim() !== '' ? custom_slug.trim() : null) : note.custom_slug
    });

    // 更新标签关联
    if (tag_ids !== undefined) {
      if (Array.isArray(tag_ids)) {
        await note.setTagList(tag_ids);
      } else {
        await note.setTagList([]);
      }
    }

    // 重新查询以获取完整数据（包含关联）
    const noteWithRelations = await Note.findByPk(note.id, {
      include: [
        {
          model: Tag,
          as: 'tagList',
          through: { attributes: [] }
        },
        {
          model: Category,
          as: 'categoryInfo'
        }
      ]
    });

    res.json({
      success: true,
      message: '笔记更新成功',
      data: noteWithRelations
    });
  } catch (error) {
    next(error);
  }
};

// 删除笔记
exports.deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;

    const note = await Note.findByPk(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    await note.destroy();

    res.json({
      success: true,
      message: '笔记删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 上传媒体文件
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '未上传文件'
      });
    }

    const urls = req.files.map(file => file.s3Url || config.getFileUrl(file));

    res.json({
      success: true,
      message: '文件上传成功',
      data: {
        urls
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取笔记分类列表
exports.getNoteCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      where: { type: 'note' },
      order: [
        ['sort_order', 'ASC'],
        ['name', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// 获取笔记标签统计（包括使用次数）
exports.getNoteTagStats = async (req, res, next) => {
  try {
    const { sequelize } = require('../config/database');

    // 检查是否是已认证用户
    const isAuthenticated = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');

    // 未认证用户只返回必要字段，不包含敏感信息
    const selectFields = isAuthenticated
      ? 't.id, t.name, t.color, t.description, t.category, t.category_id,'
      : 't.name, t.color,';

    const stats = await sequelize.query(`
      SELECT
        ${selectFields}
        COUNT(nt.note_id) as usage_count
      FROM tags t
      LEFT JOIN note_tags nt ON t.id = nt.tag_id
      GROUP BY t.id
      ORDER BY usage_count DESC, t.name ASC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// 获取笔记网盘列表
exports.getNoteDisks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.query; // 从查询参数获取密码
    const { sequelize } = require('../config/database');

    // 检查是否是已认证用户
    const isAuthenticated = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');

    // 尝试通过 ID 或 custom_slug 查找笔记
    let note;
    const isNumericId = /^\d+$/.test(id);

    if (isNumericId) {
      note = await Note.findByPk(id);
    } else {
      note = await Note.findOne({ where: { custom_slug: id } });
    }

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 如果是未认证用户且笔记未发布，拒绝访问
    if (!isAuthenticated && !note.is_published) {
      return res.status(403).json({
        success: false,
        message: '无权访问此笔记'
      });
    }

    // 安全地检查笔记是否有密码保护
    const notePassword = note.password;
    const hasPassword = notePassword && typeof notePassword === 'string' && notePassword.trim() !== '';

    // 如果笔记有密码保护且不是认证用户，必须验证密码
    if (hasPassword && !isAuthenticated) {
      // 如果没有提供密码，拒绝访问
      if (!password) {
        return res.status(401).json({
          success: false,
          message: '此笔记需要密码',
          requiresPassword: true
        });
      }

      // 验证密码
      if (password !== notePassword) {
        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
    }

    // 密码验证通过，返回云盘列表
    const disks = await sequelize.query(`
      SELECT * FROM note_disks
      WHERE note_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: disks
    });
  } catch (error) {
    next(error);
  }
};

// 添加网盘
exports.addNoteDisk = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { disk_name, title, file_size, extract_code, download_url, sort_order } = req.body;
    const { sequelize } = require('../config/database');

    // 验证笔记是否存在
    const note = await Note.findByPk(id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 插入网盘记录
    const [result] = await sequelize.query(`
      INSERT INTO note_disks (note_id, disk_name, title, file_size, extract_code, download_url, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [id, disk_name, title, file_size || null, extract_code || null, download_url || null, sort_order || 0]
    });

    res.json({
      success: true,
      message: '网盘添加成功',
      data: { id: result }
    });
  } catch (error) {
    next(error);
  }
};

// 更新网盘
exports.updateNoteDisk = async (req, res, next) => {
  try {
    const { id, diskId } = req.params;
    const { disk_name, title, file_size, extract_code, download_url } = req.body;
    const { sequelize } = require('../config/database');

    await sequelize.query(`
      UPDATE note_disks
      SET disk_name = ?, title = ?, file_size = ?, extract_code = ?, download_url = ?
      WHERE id = ? AND note_id = ?
    `, {
      replacements: [disk_name, title, file_size || null, extract_code || null, download_url || null, diskId, id]
    });

    res.json({
      success: true,
      message: '网盘更新成功'
    });
  } catch (error) {
    next(error);
  }
};

// 删除网盘
exports.deleteNoteDisk = async (req, res, next) => {
  try {
    const { id, diskId } = req.params;
    const { sequelize } = require('../config/database');

    await sequelize.query(`
      DELETE FROM note_disks
      WHERE id = ? AND note_id = ?
    `, {
      replacements: [diskId, id]
    });

    res.json({
      success: true,
      message: '网盘删除成功'
    });
  } catch (error) {
    next(error);
  }
};

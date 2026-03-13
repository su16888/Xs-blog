/**
 * @file noteControllerMethods.js
 * @description 笔记控制器的公开/管理方法（需要添加到 noteController.js）
 * @author Arran
 * @created 2025-11-18
 */

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
        attributes: ['name', 'color'], // 只返回必要字段
        through: { attributes: [] },
        required: false
      },
      {
        model: Category,
        as: 'categoryInfo',
        attributes: ['name', 'icon'], // 只返回必要字段
        required: false
      }
    ];

    // 分类筛选
    if (category_id) {
      where.category_id = category_id;
    } else if (category) {
      where.category = { [Op.like]: `%${category}%` };
    }

    // 标签筛选
    if (tag_id) {
      include[0].where = { id: tag_id };
      include[0].required = true;
    } else if (tag) {
      where.tags = { [Op.like]: `%${tag}%` };
    }

    // 关键词搜索
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

    // 处理返回数据，只返回展示字段
    const sanitizedNotes = rows.map(note => {
      const noteData = note.toJSON();

      // 删除敏感和内部字段
      delete noteData.password;
      delete noteData.created_at;
      delete noteData.updated_at;
      delete noteData.sort_order;
      delete noteData.content; // 列表不返回完整正文

      // 加密笔记隐藏媒体信息，但保留摘要用于预览
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
    const { id } = req.params;
    const password = req.body.password || req.query.password;

    const note = await Note.findByPk(id, {
      include: [
        {
          model: Tag,
          as: 'tagList',
          attributes: ['name', 'color'],
          through: { attributes: [] }
        },
        {
          model: Category,
          as: 'categoryInfo',
          attributes: ['name', 'icon']
        }
      ]
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 未发布的笔记拒绝访问
    if (!note.is_published) {
      return res.status(403).json({
        success: false,
        message: '无权访问此笔记'
      });
    }

    const hasPassword = note.password && typeof note.password === 'string' && note.password.trim() !== '';

    // 如果有密码保护
    if (hasPassword) {
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
            requiresPassword: true,
            content: null
          }
        });
      }

      if (password !== note.password) {
        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
    }

    // 密码正确或无需密码，返回完整内容
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

    const hasPassword = note.password && typeof note.password === 'string' && note.password.trim() !== '';

    if (hasPassword) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: '此笔记需要密码',
          requiresPassword: true
        });
      }

      if (password !== note.password) {
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

    const { category_id, tag_id, category, tag, search } = req.query;
    const where = {};

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

    res.json({
      success: true,
      data: {
        notes: rows, // 返回完整数据
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
      data: note // 返回完整数据，包括password字段用于后台管理
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

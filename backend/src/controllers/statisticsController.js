/**
 * @file statisticsController.js
 * @description Xs-Blog 统计数据控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-12-15
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const PageVisit = require('../models/PageVisit');
const Note = require('../models/Note');
const Site = require('../models/Site');
const StickyNote = require('../models/StickyNote');
const Todo = require('../models/Todo');
const Message = require('../models/Message');
const Gallery = require('../models/Gallery');
const Service = require('../models/Service');
const { getClientIP } = require('../utils/ipHelper');
const fs = require('fs').promises;
const path = require('path');

// 页面类型映射
const PAGE_TYPES = {
  'home': '首页',
  'social-feed': '动态',
  'notes': '笔记',
  'navigation': '导航',
  'galleries': '图库',
  'services': '服务',
  'messages': '留言',
  'docs': '文档'
};

/**
 * 记录页面访问
 */
exports.recordVisit = async (req, res) => {
  try {
    const { page_type, page_path } = req.body;
    const ip_address = getClientIP(req);
    const user_agent = req.get('User-Agent');
    const referer = req.get('Referer');

    // 验证页面类型
    if (!page_type || !PAGE_TYPES[page_type]) {
      return res.status(400).json({
        success: false,
        message: '无效的页面类型'
      });
    }

    // 获取当前日期
    const visit_date = new Date().toISOString().split('T')[0];

    await PageVisit.create({
      page_type,
      page_path,
      ip_address,
      user_agent,
      referer,
      visit_date
    });

    res.json({
      success: true,
      message: '访问记录成功'
    });
  } catch (error) {
    console.error('记录访问失败:', error);
    res.status(500).json({
      success: false,
      message: '记录访问失败'
    });
  }
};

/**
 * 获取访问趋势数据（日/周/月）
 */
exports.getVisitTrends = async (req, res) => {
  try {
    const { period = 'day', page_type } = req.query;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 构建基础查询条件
    const baseWhere = {};
    if (page_type && PAGE_TYPES[page_type]) {
      baseWhere.page_type = page_type;
    }

    if (period === 'day') {
      // 按天查看：显示今天24小时的数据，按3小时间隔分组 (0, 3, 6, 9, 12, 15, 18, 21)
      const hourlyWhere = {
        ...baseWhere,
        visit_date: today
      };

      // 检测数据库类型并使用相应的小时提取函数
      const dbType = sequelize.getDialect();
      let hourExpr;
      if (dbType === 'sqlite') {
        hourExpr = literal("CAST(strftime('%H', created_at) AS INTEGER)");
      } else {
        hourExpr = fn('HOUR', col('created_at'));
      }

      const hourlyVisits = await PageVisit.findAll({
        attributes: [
          [hourExpr, 'hour'],
          [fn('COUNT', col('id')), 'visit_count'],
          [fn('COUNT', fn('DISTINCT', col('ip_address'))), 'unique_ips']
        ],
        where: hourlyWhere,
        group: [hourExpr],
        order: [[hourExpr, 'ASC']],
        raw: true
      });

      // 按3小时间隔聚合数据 (0-2点归到0点, 3-5点归到3点, etc.)
      const hourlyMap = {};
      hourlyVisits.forEach(v => {
        const hour = parseInt(v.hour);
        const groupHour = Math.floor(hour / 3) * 3; // 0, 3, 6, 9, 12, 15, 18, 21
        if (!hourlyMap[groupHour]) {
          hourlyMap[groupHour] = { visit_count: 0, unique_ips: 0 };
        }
        hourlyMap[groupHour].visit_count += parseInt(v.visit_count) || 0;
        hourlyMap[groupHour].unique_ips += parseInt(v.unique_ips) || 0;
      });

      // 生成完整的3小时间隔数据点
      const result = [];
      for (let h = 0; h < 24; h += 3) {
        result.push({
          date: today,
          hour: h,
          visit_count: hourlyMap[h]?.visit_count || 0,
          unique_ips: hourlyMap[h]?.unique_ips || 0
        });
      }

      return res.json({
        success: true,
        data: {
          period,
          page_type: page_type || 'all',
          trends: result
        }
      });
    }

    // 按周/月查看：显示过去N天的日数据
    let dateRange;
    switch (period) {
      case 'week':
        dateRange = 7;
        break;
      case 'month':
        dateRange = 30;
        break;
      default:
        dateRange = 7;
    }

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - dateRange + 1);
    const startDateStr = startDate.toISOString().split('T')[0];

    const where = {
      ...baseWhere,
      visit_date: {
        [Op.gte]: startDateStr
      }
    };

    // 按日期分组统计
    const visits = await PageVisit.findAll({
      attributes: [
        'visit_date',
        [fn('COUNT', col('id')), 'visit_count'],
        [fn('COUNT', fn('DISTINCT', col('ip_address'))), 'unique_ips']
      ],
      where,
      group: ['visit_date'],
      order: [['visit_date', 'ASC']],
      raw: true
    });

    // 填充缺失的日期
    const result = [];
    for (let i = 0; i < dateRange; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const found = visits.find(v => v.visit_date === dateStr);
      result.push({
        date: dateStr,
        visit_count: found ? parseInt(found.visit_count) : 0,
        unique_ips: found ? parseInt(found.unique_ips) : 0
      });
    }

    res.json({
      success: true,
      data: {
        period,
        page_type: page_type || 'all',
        trends: result
      }
    });
  } catch (error) {
    console.error('获取访问趋势失败:', error);
    res.status(500).json({
      success: false,
      message: '获取访问趋势失败'
    });
  }
};

/**
 * 获取各模块统计数据
 */
exports.getModuleStats = async (req, res) => {
  try {
    // 获取今天的日期
    const today = new Date().toISOString().split('T')[0];

    // 并行查询所有模块的数据
    const [
      socialFeedCount,
      notesCount,
      stickyNotesCount,
      sitesCount,
      galleriesCount,
      servicesCount,
      todosCount,
      messagesData,
      docsCount,
      pageVisitsStats
    ] = await Promise.all([
      // 动态数量 - 使用 raw query 避免模型依赖问题
      sequelize.query(
        "SELECT COUNT(*) as count FROM social_feed_posts WHERE status = 'published'",
        { type: sequelize.QueryTypes.SELECT }
      ).then(r => r[0]?.count || 0).catch(() => 0),

      // 笔记数量
      Note.count({ where: { is_published: true } }),

      // 便签数量
      StickyNote.count(),

      // 导航数量
      Site.count({ where: { is_visible: true } }),

      // 图库数量
      Gallery.count({ where: { is_visible: true } }),

      // 服务数量
      Service.count({ where: { is_visible: true } }),

      // 待办事项数量
      Todo.count(),

      // 留言数量和未读数
      Message.findAll({
        attributes: [
          [fn('COUNT', col('id')), 'total'],
          [fn('SUM', literal("CASE WHEN status = 'pending' THEN 1 ELSE 0 END")), 'unread']
        ],
        raw: true
      }).then(r => ({
        total: parseInt(r[0]?.total) || 0,
        unread: parseInt(r[0]?.unread) || 0
      })),

      // docs 文件数量
      countDocsFiles(),

      // 各模块访问统计
      PageVisit.findAll({
        attributes: [
          'page_type',
          [fn('COUNT', fn('DISTINCT', col('ip_address'))), 'unique_ips']
        ],
        group: ['page_type'],
        raw: true
      })
    ]);

    // 构建访问统计映射
    const visitsMap = {};
    pageVisitsStats.forEach(stat => {
      visitsMap[stat.page_type] = parseInt(stat.unique_ips) || 0;
    });

    const stats = {
      socialFeed: {
        count: parseInt(socialFeedCount),
        visits: visitsMap['social-feed'] || 0,
        label: '动态'
      },
      notes: {
        count: notesCount,
        visits: visitsMap['notes'] || 0,
        label: '笔记'
      },
      stickyNotes: {
        count: stickyNotesCount,
        visits: 0, // 便签是后台功能，无前台访问
        label: '便签'
      },
      navigation: {
        count: sitesCount,
        visits: visitsMap['navigation'] || 0,
        label: '导航'
      },
      galleries: {
        count: galleriesCount,
        visits: visitsMap['galleries'] || 0,
        label: '图库'
      },
      services: {
        count: servicesCount,
        visits: visitsMap['services'] || 0,
        label: '服务'
      },
      todos: {
        count: todosCount,
        visits: 0, // 待办是后台功能，无前台访问
        label: '待办'
      },
      messages: {
        count: messagesData.total,
        unread: messagesData.unread,
        visits: visitsMap['messages'] || 0,
        label: '留言'
      },
      docs: {
        count: docsCount,
        visits: visitsMap['docs'] || 0,
        label: '文档'
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取模块统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取模块统计失败'
    });
  }
};

/**
 * 获取IP访问排行
 */
exports.getIPRanking = async (req, res) => {
  try {
    const { limit = 10, days = 7 } = req.query;
    const topLimit = Math.min(Math.max(parseInt(limit), 5), 20); // 限制5-20
    const daysRange = Math.min(Math.max(parseInt(days), 1), 30); // 限制1-30天

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysRange);
    const startDateStr = startDate.toISOString().split('T')[0];

    // 按IP统计访问次数
    const ipStats = await PageVisit.findAll({
      attributes: [
        'ip_address',
        [fn('COUNT', col('id')), 'visit_count'],
        [fn('MAX', col('created_at')), 'last_visit']
      ],
      where: {
        visit_date: {
          [Op.gte]: startDateStr
        }
      },
      group: ['ip_address'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: topLimit,
      raw: true
    });

    // 获取按日期的IP访问分布
    const dailyStats = await PageVisit.findAll({
      attributes: [
        'visit_date',
        [fn('COUNT', fn('DISTINCT', col('ip_address'))), 'unique_ips'],
        [fn('COUNT', col('id')), 'total_visits']
      ],
      where: {
        visit_date: {
          [Op.gte]: startDateStr
        }
      },
      group: ['visit_date'],
      order: [['visit_date', 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        ranking: ipStats.map(stat => ({
          ip: stat.ip_address,
          visits: parseInt(stat.visit_count),
          lastVisit: stat.last_visit
        })),
        daily: dailyStats.map(stat => ({
          date: stat.visit_date,
          uniqueIPs: parseInt(stat.unique_ips),
          totalVisits: parseInt(stat.total_visits)
        }))
      }
    });
  } catch (error) {
    console.error('获取IP排行失败:', error);
    res.status(500).json({
      success: false,
      message: '获取IP排行失败'
    });
  }
};

/**
 * 统计docs目录下的文档数量
 */
async function countDocsFiles() {
  try {
    // 尝试多个可能的docs路径
    const possiblePaths = [
      path.join(__dirname, '../../../frontend/public/markdown'),
      path.join(__dirname, '../../../docs'),
      process.env.MARKDOWN_DIR
    ].filter(Boolean);

    for (const docsPath of possiblePaths) {
      try {
        const files = await fs.readdir(docsPath);
        const mdFiles = files.filter(file => file.endsWith('.md'));
        return mdFiles.length;
      } catch (e) {
        continue;
      }
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * 清理访问数据（清空page_visits表）
 */
exports.clearVisitData = async (req, res) => {
  try {
    // 删除所有访问记录
    const deletedCount = await PageVisit.destroy({
      where: {},
      truncate: true
    });

    res.json({
      success: true,
      message: '访问数据清理成功',
      data: {
        deletedCount
      }
    });
  } catch (error) {
    console.error('清理访问数据失败:', error);
    res.status(500).json({
      success: false,
      message: '清理访问数据失败'
    });
  }
};

/**
 * 获取仪表盘概览数据（整合所有统计）
 */
exports.getDashboardOverview = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // 获取今日访问统计
    const todayStats = await PageVisit.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'total_visits'],
        [fn('COUNT', fn('DISTINCT', col('ip_address'))), 'unique_ips']
      ],
      where: {
        visit_date: today
      },
      raw: true
    });

    // 获取总访问统计
    const totalStats = await PageVisit.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'total_visits'],
        [fn('COUNT', fn('DISTINCT', col('ip_address'))), 'unique_ips']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        today: {
          visits: parseInt(todayStats?.total_visits) || 0,
          uniqueIPs: parseInt(todayStats?.unique_ips) || 0
        },
        total: {
          visits: parseInt(totalStats?.total_visits) || 0,
          uniqueIPs: parseInt(totalStats?.unique_ips) || 0
        }
      }
    });
  } catch (error) {
    console.error('获取仪表盘概览失败:', error);
    res.status(500).json({
      success: false,
      message: '获取仪表盘概览失败'
    });
  }
};

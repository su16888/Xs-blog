/**
 * @file metadataController.js
 * @description Xs-Blog 元数据控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-18
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { sequelize } = require('../config/database');

/**
 * 获取统计信息
 * GET /api/admin/metadata/stats
 */
exports.getStats = async (req, res, next) => {
  try {
    // 获取各类数据的统计
    const [noteCount] = await sequelize.query('SELECT COUNT(*) as count FROM notes');
    const [stickyNoteCount] = await sequelize.query('SELECT COUNT(*) as count FROM sticky_notes');
    const [todoCount] = await sequelize.query('SELECT COUNT(*) as count FROM todos');
    const [tagCount] = await sequelize.query('SELECT COUNT(*) as count FROM tags');
    const [categoryCount] = await sequelize.query('SELECT COUNT(*) as count FROM categories');
    const [siteCount] = await sequelize.query('SELECT COUNT(*) as count FROM sites');
    const [messageCount] = await sequelize.query('SELECT COUNT(*) as count FROM messages');
    const [socialLinkCount] = await sequelize.query('SELECT COUNT(*) as count FROM social_links');

    // 获取待办事项统计
    const [todoStats] = await sequelize.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM todos
      GROUP BY status
    `);

    // 获取留言状态统计
    const [messageStats] = await sequelize.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM messages
      GROUP BY status
    `);

    // 获取笔记统计
    const [noteStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN is_encrypted = 1 THEN 1 ELSE 0 END) as encrypted
      FROM notes
    `);

    res.json({
      success: true,
      data: {
        notes: noteCount[0]?.count || 0,
        stickyNotes: stickyNoteCount[0]?.count || 0,
        todos: todoCount[0]?.count || 0,
        tags: tagCount[0]?.count || 0,
        categories: categoryCount[0]?.count || 0,
        sites: siteCount[0]?.count || 0,
        messages: messageCount[0]?.count || 0,
        socialLinks: socialLinkCount[0]?.count || 0,
        todoStats: todoStats.reduce((acc, stat) => {
          acc[stat.status] = stat.count;
          return acc;
        }, {}),
        messageStats: messageStats.reduce((acc, stat) => {
          acc[stat.status] = stat.count;
          return acc;
        }, {}),
        noteStats: noteStats[0] || { total: 0, published: 0, encrypted: 0 }
      }
    });
  } catch (error) {
    next(error);
  }
};

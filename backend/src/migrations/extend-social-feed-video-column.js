/**
 * @file extend-social-feed-video-column.js
 * @description 扩展 social_feed_posts 表的 video 字段长度
 * 用于支持抖音等第三方视频的长URL
 */

const { sequelize } = require('../config/database');

async function migrate() {
  try {
    console.log('开始迁移: 扩展 social_feed_posts.video 字段长度...');

    // 修改 video 字段为 TEXT 类型，支持更长的URL
    await sequelize.query(`
      ALTER TABLE social_feed_posts
      MODIFY COLUMN video TEXT
    `);

    console.log('迁移完成: video 字段已扩展为 TEXT 类型');
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error.message);
    process.exit(1);
  }
}

migrate();

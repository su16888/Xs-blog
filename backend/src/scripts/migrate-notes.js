const { sequelize } = require('../config/database');

async function migrateNotes() {
  try {
    console.log('开始迁移 notes 表...');

    // 检查 sort_order 列是否存在
    const [sortOrderExists] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'notes'
        AND COLUMN_NAME = 'sort_order'
    `);

    if (sortOrderExists[0].count === 0) {
      console.log('添加 sort_order 列...');
      await sequelize.query(`
        ALTER TABLE notes
        ADD COLUMN sort_order INT DEFAULT 0 AFTER published_at
      `);
      console.log('✅ sort_order 列添加成功');
    } else {
      console.log('sort_order 列已存在，跳过');
    }

    // 检查 is_pinned 列是否存在
    const [isPinnedExists] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'notes'
        AND COLUMN_NAME = 'is_pinned'
    `);

    if (isPinnedExists[0].count === 0) {
      console.log('添加 is_pinned 列...');
      await sequelize.query(`
        ALTER TABLE notes
        ADD COLUMN is_pinned TINYINT(1) DEFAULT 0 AFTER sort_order
      `);
      console.log('✅ is_pinned 列添加成功');
    } else {
      console.log('is_pinned 列已存在，跳过');
    }

    console.log('✅ 迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

migrateNotes();

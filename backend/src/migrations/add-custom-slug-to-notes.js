const { sequelize } = require('../config/database');

async function migrate() {
  try {
    // 检查列是否已存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'notes' AND COLUMN_NAME = 'custom_slug'
    `);

    if (results.length === 0) {
      // 添加 custom_slug 列
      await sequelize.query(`
        ALTER TABLE notes
        ADD COLUMN custom_slug VARCHAR(200) NULL UNIQUE COMMENT '自定义URL路径'
      `);
      console.log('Successfully added custom_slug column to notes table');
    } else {
      console.log('custom_slug column already exists');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

module.exports = { migrate };

// 直接运行
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

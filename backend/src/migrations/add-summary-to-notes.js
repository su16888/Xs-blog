const { sequelize } = require('../config/database');

async function addSummaryColumn() {
  try {
    console.log('开始添加 summary 字段到 notes 表...');

    // 先检查字段是否存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'notes'
      AND COLUMN_NAME = 'summary'
    `);

    if (results.length > 0) {
      console.log('⚠️  summary 字段已存在，跳过添加');
      process.exit(0);
      return;
    }

    // 添加 summary 字段
    await sequelize.query(`
      ALTER TABLE notes
      ADD COLUMN summary TEXT DEFAULT NULL
      COMMENT '笔记摘要'
      AFTER content
    `);

    console.log('✅ summary 字段添加成功！');

    // 为现有笔记自动生成摘要（截取正文前 150 字）
    console.log('开始为现有笔记生成摘要...');
    await sequelize.query(`
      UPDATE notes
      SET summary = CASE
        WHEN LENGTH(content) > 150 THEN CONCAT(SUBSTRING(content, 1, 150), '...')
        ELSE content
      END
      WHERE summary IS NULL AND content IS NOT NULL
    `);

    console.log('✅ 现有笔记摘要生成成功！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加字段失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  addSummaryColumn();
}

module.exports = addSummaryColumn;

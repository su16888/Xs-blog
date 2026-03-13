const { sequelize } = require('../config/database');

async function createNoteDisksTable() {
  try {
    console.log('开始创建 note_disks 表...');

    // 先检查表是否存在
    const [results] = await sequelize.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'note_disks'
    `);

    if (results.length > 0) {
      console.log('⚠️  note_disks 表已存在，跳过创建');
      process.exit(0);
      return;
    }

    // 创建 note_disks 表
    await sequelize.query(`
      CREATE TABLE note_disks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        note_id INT NOT NULL COMMENT '笔记ID',
        disk_name VARCHAR(50) NOT NULL COMMENT '网盘名称（百度网盘、阿里云盘等）',
        title VARCHAR(200) NOT NULL COMMENT '资源标题',
        file_size VARCHAR(50) COMMENT '文件大小',
        extract_code VARCHAR(50) COMMENT '提取码',
        download_url TEXT COMMENT '下载链接',
        sort_order INT DEFAULT 0 COMMENT '排序',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_note_id (note_id),
        INDEX idx_sort_order (sort_order),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记网盘资源表'
    `);

    console.log('✅ note_disks 表创建成功！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建表失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  createNoteDisksTable();
}

module.exports = createNoteDisksTable;

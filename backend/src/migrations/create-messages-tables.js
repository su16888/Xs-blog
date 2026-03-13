const { sequelize } = require('../config/database');

async function createMessagesTables() {
  try {
    console.log('开始创建留言相关表...');

    // 创建留言分类表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS message_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL COMMENT '分类名称',
        sort_order INT DEFAULT 0 COMMENT '排序顺序',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言分类表'
    `);
    console.log('✅ message_categories 表创建成功');

    // 创建留言表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL COMMENT '用户称呼',
        contact VARCHAR(200) NOT NULL COMMENT '用户联系方式',
        category_id INT DEFAULT NULL COMMENT '分类ID',
        content TEXT NOT NULL COMMENT '留言内容',
        attachments TEXT DEFAULT NULL COMMENT '附件路径（JSON数组）',
        ip_address VARCHAR(45) DEFAULT NULL COMMENT '提交者IP地址',
        user_agent TEXT DEFAULT NULL COMMENT '用户代理信息',
        status ENUM('pending', 'read', 'replied') DEFAULT 'pending' COMMENT '状态',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES message_categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言表'
    `);
    console.log('✅ messages 表创建成功');

    // 创建IP提交记录表（用于限制24小时内只能提交一次）
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS message_ip_records (
        id INT PRIMARY KEY AUTO_INCREMENT,
        ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址',
        last_submit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最后提交时间',
        UNIQUE KEY unique_ip (ip_address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言IP记录表'
    `);
    console.log('✅ message_ip_records 表创建成功');

    // 插入默认分类
    await sequelize.query(`
      INSERT IGNORE INTO message_categories (id, name, sort_order) VALUES
      (1, '咨询', 1),
      (2, '建议', 2),
      (3, '反馈', 3),
      (4, '其他', 4)
    `);
    console.log('✅ 默认分类插入成功');

    console.log('✅ 所有留言相关表创建完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建表失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  createMessagesTables();
}

module.exports = createMessagesTables;

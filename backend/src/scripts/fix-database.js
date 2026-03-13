const { sequelize } = require('../config/database');

async function fixDatabase() {
  try {
    console.log('开始修复数据库表结构...');

    // 1. 修复 profile 表
    console.log('修复 profile 表...');
    try {
      await sequelize.query(`ALTER TABLE profile ADD COLUMN location VARCHAR(200) DEFAULT NULL AFTER bio`);
    } catch (e) { console.log('location column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE profile ADD COLUMN website VARCHAR(500) DEFAULT NULL AFTER location`);
    } catch (e) { console.log('website column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE profile ADD COLUMN website_title VARCHAR(200) DEFAULT NULL AFTER website`);
    } catch (e) { console.log('website_title column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE profile ADD COLUMN company VARCHAR(200) DEFAULT NULL AFTER website_title`);
    } catch (e) { console.log('company column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE profile ADD COLUMN background_image VARCHAR(500) DEFAULT NULL AFTER company`);
    } catch (e) { console.log('background_image column already exists'); }

    // 2. 修复 notes 表
    console.log('修复 notes 表...');
    try {
      await sequelize.query(`ALTER TABLE notes ADD COLUMN title VARCHAR(200) NOT NULL DEFAULT 'Untitled' AFTER id`);
    } catch (e) { console.log('title column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE notes ADD COLUMN category VARCHAR(100) DEFAULT NULL AFTER title`);
    } catch (e) { console.log('category column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE notes ADD COLUMN tags VARCHAR(500) DEFAULT NULL AFTER category`);
    } catch (e) { console.log('tags column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE notes ADD COLUMN is_published BOOLEAN DEFAULT TRUE AFTER tags`);
    } catch (e) { console.log('is_published column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE notes ADD COLUMN show_in_list TINYINT(1) DEFAULT 1 AFTER is_published`);
    } catch (e) { console.log('show_in_list column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE notes ADD COLUMN sort_order INT DEFAULT 0 AFTER show_in_list`);
    } catch (e) { console.log('sort_order column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE notes ADD COLUMN is_pinned TINYINT(1) DEFAULT 0 AFTER sort_order`);
    } catch (e) { console.log('is_pinned column already exists'); }

    // 3. 修复 users 表
    console.log('修复 users 表...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE,
        role VARCHAR(50) DEFAULT 'admin',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    try {
      await sequelize.query(`ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'admin' AFTER email`);
    } catch (e) { console.log('role column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active' AFTER role`);
    } catch (e) { console.log('status column already exists'); }

    // 4. 修复 settings 表
    console.log('修复 settings 表...');
    try {
      await sequelize.query(`ALTER TABLE settings ADD COLUMN type VARCHAR(50) DEFAULT 'string' AFTER setting_value`);
    } catch (e) { console.log('type column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE settings ADD COLUMN description TEXT DEFAULT NULL AFTER type`);
    } catch (e) { console.log('description column already exists'); }

    console.log('修复 services/订单相关表...');
    try {
      await sequelize.query(`ALTER TABLE services ADD COLUMN product_type ENUM('card','virtual','physical') DEFAULT 'virtual'`);
    } catch (e) { console.log('services.product_type column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE services ADD COLUMN stock_total INT DEFAULT 0`);
    } catch (e) { console.log('services.stock_total column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE services ADD COLUMN stock_sold INT DEFAULT 0`);
    } catch (e) { console.log('services.stock_sold column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE services ADD COLUMN show_stock TINYINT(1) DEFAULT 1`);
    } catch (e) { console.log('services.show_stock column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE services ADD COLUMN show_sales TINYINT(1) DEFAULT 1`);
    } catch (e) { console.log('services.show_sales column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE services ADD COLUMN payment_config_id INT UNSIGNED DEFAULT NULL`);
    } catch (e) { console.log('services.payment_config_id column already exists'); }

    try {
      await sequelize.query(`ALTER TABLE services ADD COLUMN order_page_slug VARCHAR(200) DEFAULT NULL`);
    } catch (e) { console.log('services.order_page_slug column already exists'); }

    try {
      await sequelize.query(`CREATE INDEX idx_payment_config_id ON services(payment_config_id)`);
    } catch (e) { console.log('idx_payment_config_id index already exists'); }

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS payment_configs (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        provider_key VARCHAR(100) NOT NULL,
        is_enabled TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        remark VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_is_enabled (is_enabled),
        INDEX idx_sort_order (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        service_id INT UNSIGNED NOT NULL,
        amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'pending',
        buyer_name VARCHAR(100) DEFAULT NULL,
        buyer_contact VARCHAR(200) DEFAULT NULL,
        payment_config_id INT UNSIGNED DEFAULT NULL,
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        ip_address VARCHAR(45) DEFAULT NULL,
        user_agent TEXT DEFAULT NULL,
        cancel_reason TEXT DEFAULT NULL,
        expired_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (payment_config_id) REFERENCES payment_configs(id) ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX idx_service_id (service_id),
        INDEX idx_payment_config_id (payment_config_id),
        INDEX idx_status (status),
        INDEX idx_payment_status (payment_status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        service_id INT UNSIGNED NOT NULL,
        card_code VARCHAR(500) NOT NULL,
        card_status VARCHAR(50) DEFAULT 'unused',
        bind_order_id INT UNSIGNED DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (bind_order_id) REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX idx_service_id (service_id),
        INDEX idx_bind_order_id (bind_order_id),
        INDEX idx_card_status (card_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5. 更新现有的笔记数据
    console.log('更新现有笔记数据...');
    await sequelize.query(`
      UPDATE notes SET title = 'Untitled' WHERE title IS NULL OR title = ''
    `);

    console.log('✅ 数据库修复完成！');

    // 显示表结构
    console.log('\n当前表结构：');

    const [profileDesc] = await sequelize.query('DESCRIBE profile');
    console.log('\nProfile 表结构：');
    console.table(profileDesc);

    const [notesDesc] = await sequelize.query('DESCRIBE notes');
    console.log('\nNotes 表结构：');
    console.table(notesDesc);

    const [usersDesc] = await sequelize.query('DESCRIBE users');
    console.log('\nUsers 表结构：');
    console.table(usersDesc);

    const [settingsDesc] = await sequelize.query('DESCRIBE settings');
    console.log('\nSettings 表结构：');
    console.table(settingsDesc);

  } catch (error) {
    console.error('修复数据库时出错：', error);
  } finally {
    await sequelize.close();
  }
}

fixDatabase();

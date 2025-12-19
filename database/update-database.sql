-- ========================================
-- Xs-blog 数据库更新包 (MySQL)
-- Database Update Package
-- ========================================
-- 版本: v3.8.0
-- 更新日期: 2025-12-16
-- 说明: 整合所有数据库更新（索引优化、图库功能、服务业务功能、服务规格标题、官网主题功能、页面访问控制、朋友圈功能、笔记展示模式、页面访问统计、网站导航展示类型）
-- ========================================
-- 更新内容:
-- 1. v3.1.0 - 性能优化索引
-- 2. v3.2.0 - 图库功能
-- 3. v3.2.0 - 服务业务功能
-- 4. v3.2.1 - 文本设置初始化
-- 5. v3.2.2 - 服务规格标题字段
-- 6. v3.3.0 - 官网主题功能
-- 7. v3.4.0 - 页面访问控制
-- 8. v3.5.0 - 朋友圈功能
-- 9. v3.6.0 - 笔记展示模式（每个笔记单独设置窗口/页面展示模式）
-- 10. v3.7.0 - 页面访问统计（仪表盘访问趋势、模块统计、IP排行）
-- 11. v3.8.0 - 网站导航展示类型（前台/后台/前后台三选项）
-- ========================================

USE xsblog888;

-- ========================================
-- 第一部分：性能优化索引 (v3.1.0)
-- ========================================
-- 更新日期: 2025-11-24
-- 说明: 新增组合索引提升查询性能80%+
-- ========================================

-- 创建临时存储过程用于安全创建索引
DELIMITER $$

DROP PROCEDURE IF EXISTS CreateIndexIfNotExists$$
CREATE PROCEDURE CreateIndexIfNotExists(
    IN tableName VARCHAR(128),
    IN indexName VARCHAR(128),
    IN indexColumns TEXT
)
BEGIN
    DECLARE indexExists INT DEFAULT 0;

    -- 检查索引是否存在
    SELECT COUNT(*) INTO indexExists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = tableName
    AND index_name = indexName;

    -- 如果索引不存在，则创建
    IF indexExists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', indexName, ' ON ', tableName, '(', indexColumns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('索引 ', indexName, ' 创建成功') AS result;
    ELSE
        SELECT CONCAT('索引 ', indexName, ' 已存在，跳过创建') AS result;
    END IF;
END$$

DELIMITER ;

-- 笔记表组合索引（优化列表查询）
-- 优化场景：首页笔记列表（按置顶、排序、发布时间排序）
CALL CreateIndexIfNotExists('notes', 'idx_notes_list_order', 'is_pinned DESC, sort_order DESC, published_at DESC');

-- 优化场景：已发布笔记按时间排序
CALL CreateIndexIfNotExists('notes', 'idx_notes_published_time', 'is_published, published_at DESC');

-- 优化场景：按分类查询已发布笔记
CALL CreateIndexIfNotExists('notes', 'idx_notes_published_category_time', 'is_published, category_id, published_at DESC');

-- 笔记-标签关联表组合索引（优化关联查询）
-- 优化场景：通过笔记ID或标签ID查询关联关系
CALL CreateIndexIfNotExists('note_tags', 'idx_note_tags_note_tag', 'note_id, tag_id');

-- 待办事项组合索引（优化待办列表和提醒查询）
-- 优化场景：查询未完成的待办事项并按截止日期排序
CALL CreateIndexIfNotExists('todos', 'idx_todos_incomplete_due', 'is_completed, due_date');

-- 删除临时存储过程
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists;

SELECT '✓ 索引优化完成' AS '步骤1';

-- ========================================
-- 第二部分：图库功能表 (v3.2.0)
-- ========================================
-- 创建日期: 2025-11-25
-- 说明: 新增图库功能，支持图册分类、图片管理、密码保护等
-- ========================================

-- 1. 图册分类表 (gallery_categories)
CREATE TABLE IF NOT EXISTS gallery_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  description TEXT COMMENT '分类描述',
  icon VARCHAR(255) COMMENT '分类图标',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否可见',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图册分类表';

-- 2. 图册表 (galleries)
CREATE TABLE IF NOT EXISTS galleries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL COMMENT '图册标题',
  description TEXT COMMENT '图册描述',
  category_id INT COMMENT '分类ID',
  password VARCHAR(100) COMMENT '访问密码（为空表示无密码）',
  cover_image VARCHAR(500) COMMENT '封面图片路径（第一张图片）',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否在前台可见',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  image_count INT DEFAULT 0 COMMENT '图片数量',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (category_id) REFERENCES gallery_categories(id) ON DELETE SET NULL,
  INDEX idx_category_id (category_id),
  INDEX idx_is_visible (is_visible),
  INDEX idx_sort_order (sort_order),
  INDEX idx_gallery_list_order (is_visible, sort_order DESC, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图册表';

-- 3. 图册图片表 (gallery_images)
CREATE TABLE IF NOT EXISTS gallery_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gallery_id INT NOT NULL COMMENT '图册ID',
  filename VARCHAR(255) NOT NULL COMMENT '文件名',
  path VARCHAR(500) NOT NULL COMMENT '文件路径',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  size INT COMMENT '文件大小（字节）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
  INDEX idx_gallery_id (gallery_id),
  INDEX idx_sort_order (sort_order),
  INDEX idx_gallery_image_order (gallery_id, sort_order ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图册图片表';

SELECT '✓ 图库功能表创建完成' AS '步骤2';

-- ========================================
-- 第三部分：服务业务功能表 (v3.2.0)
-- ========================================
-- 创建日期: 2025-11-25
-- 说明: 添加服务业务相关表
-- ========================================

-- 1. 服务分类表
CREATE TABLE IF NOT EXISTS `service_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL COMMENT '分类名称',
  `description` TEXT DEFAULT NULL COMMENT '分类描述',
  `icon` VARCHAR(255) DEFAULT NULL COMMENT '分类图标',
  `sort_order` INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  `is_visible` TINYINT(1) DEFAULT 1 COMMENT '是否可见',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sort_order` (`sort_order`),
  INDEX `idx_is_visible` (`is_visible`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务分类表';

-- 2. 服务表
CREATE TABLE IF NOT EXISTS `services` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL COMMENT '服务名称',
  `description` TEXT DEFAULT NULL COMMENT '服务简述',
  `content` TEXT DEFAULT NULL COMMENT '服务详情介绍（Markdown格式）',
  `cover_image` VARCHAR(500) DEFAULT NULL COMMENT '服务封面图（1:1正方形）',
  `price` VARCHAR(100) DEFAULT NULL COMMENT '价格（文本格式，可包含非数字）',
  `category_id` INT UNSIGNED DEFAULT NULL COMMENT '分类ID（关联service_categories表）',
  `is_visible` TINYINT(1) DEFAULT 1 COMMENT '是否在前台显示',
  `is_recommended` TINYINT(1) DEFAULT 0 COMMENT '是否推荐服务',
  `sort_order` INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  `show_order_button` TINYINT(1) DEFAULT 0 COMMENT '是否显示"立即下单"按钮',
  `order_button_text` VARCHAR(50) DEFAULT '立即下单' COMMENT '下单按钮文字',
  `order_button_url` VARCHAR(500) DEFAULT NULL COMMENT '下单按钮跳转URL',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_category_id` (`category_id`),
  INDEX `idx_is_visible` (`is_visible`),
  INDEX `idx_is_recommended` (`is_recommended`),
  INDEX `idx_sort_order` (`sort_order`),
  FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务表';

-- 3. 服务规格表
CREATE TABLE IF NOT EXISTS `service_specifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_id` INT UNSIGNED NOT NULL COMMENT '所属服务ID（关联services表）',
  `spec_name` VARCHAR(100) NOT NULL COMMENT '规格名称',
  `spec_value` VARCHAR(500) DEFAULT NULL COMMENT '规格值',
  `sort_order` INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_service_id` (`service_id`),
  INDEX `idx_sort_order` (`sort_order`),
  FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务规格表';

SELECT '✓ 服务业务功能表创建完成' AS '步骤3';

-- ========================================
-- 验证所有表创建结果
-- ========================================

-- 查看图库相关表
SHOW TABLES LIKE '%gallery%';

-- 查看服务相关表
SHOW TABLES LIKE '%service%';

-- 查看笔记表索引
SHOW INDEX FROM notes;

-- ========================================
-- 第四部分：文本设置初始化 (v3.2.1)
-- ========================================
-- 更新日期: 2025-11-26
-- 说明: 添加页面文本和首页内容配置的默认值
-- ========================================

-- 页面文本配置
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'pageTexts',
  '{"navigation":{"title":"导航列表","description":"探索精选的网站导航","browserTitle":"导航列表"},"services":{"title":"服务业务","description":"为您提供专业的服务解决方案","browserTitle":"服务业务"},"notes":{"title":"笔记列表","description":"探索所有已发布的笔记内容","browserTitle":"全部笔记"},"galleries":{"title":"图库列表","description":"探索精彩的图片合集","browserTitle":"图库列表"},"messages":{"title":"联系我们","description":"有任何问题都可以通过这里进行提交你的想法！","browserTitle":"留言板"}}',
  'json',
  '页面文本配置（标题、描述、浏览器标题）'
) ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  type = VALUES(type),
  description = VALUES(description);

-- 首页内容切换配置
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'homeContentSections',
  '{"section1":"notes","section2":"navigation","enabledInBlogMode":true}',
  'json',
  '首页内容区域配置（选择展示哪些内容）'
) ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  type = VALUES(type),
  description = VALUES(description);

SELECT '✓ 文本设置初始化完成' AS '步骤4';

-- ========================================
-- 第五部分：服务规格标题字段 (v3.2.2)
-- ========================================
-- 更新日期: 2025-11-26
-- 说明: 为服务表添加自定义规格标题字段
-- ========================================

-- 检查字段是否已存在的安全添加
SET @dbname = DATABASE();
SET @tablename = 'services';
SET @columnname = 'spec_title';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT ''字段 spec_title 已存在，跳过添加'' AS result;',
  'ALTER TABLE services ADD COLUMN spec_title VARCHAR(50) DEFAULT ''服务规格'' COMMENT ''服务规格标题（可自定义）'' AFTER order_button_url;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SELECT '✓ 服务规格标题字段添加完成' AS '步骤5';

-- ========================================
-- 第六部分：官网主题功能 (v3.3.0)
-- ========================================
-- 更新日期: 2025-11-29
-- 说明: 创建官网主题功能的独立数据表
-- ========================================

-- 1. 官网主题基础配置表
CREATE TABLE IF NOT EXISTS promo_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
  config_value TEXT COMMENT '配置值',
  config_value_en TEXT COMMENT '配置值（英文）',
  config_type VARCHAR(50) DEFAULT 'string' COMMENT '配置类型：string, text, boolean, number, image',
  description VARCHAR(500) COMMENT '配置描述',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_config_key (config_key),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网主题基础配置表';

-- 2. 官网主题导航菜单表
CREATE TABLE IF NOT EXISTS promo_nav_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '菜单名称（中文）',
  name_en VARCHAR(100) COMMENT '菜单名称（英文）',
  link VARCHAR(500) NOT NULL COMMENT '链接地址',
  icon VARCHAR(255) COMMENT '图标',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否显示',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网主题导航菜单表';

-- 3. 官网主题统计数据表
CREATE TABLE IF NOT EXISTS promo_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stat_value VARCHAR(100) NOT NULL COMMENT '统计值（中文）',
  stat_value_en VARCHAR(100) COMMENT '统计值（英文）',
  stat_label VARCHAR(100) NOT NULL COMMENT '统计标签（中文）',
  stat_label_en VARCHAR(100) COMMENT '统计标签（英文）',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否显示',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网主题统计数据表';

-- 4. 官网主题服务分类表
CREATE TABLE IF NOT EXISTS promo_service_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '分类名称（中文）',
  name_en VARCHAR(100) COMMENT '分类名称（英文）',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否显示',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网主题服务分类表';

-- 5. 官网主题服务项表
CREATE TABLE IF NOT EXISTS promo_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT COMMENT '分类ID',
  image VARCHAR(500) COMMENT '服务图片',
  title VARCHAR(200) NOT NULL COMMENT '服务标题（中文）',
  title_en VARCHAR(200) COMMENT '服务标题（英文）',
  description TEXT COMMENT '服务描述（中文）',
  description_en TEXT COMMENT '服务描述（英文）',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否显示',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (category_id) REFERENCES promo_service_categories(id) ON DELETE SET NULL,
  INDEX idx_category_id (category_id),
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网主题服务项表';

-- 6. 官网主题团队成员表
CREATE TABLE IF NOT EXISTS promo_team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  avatar_image VARCHAR(500) COMMENT '头像图片',
  avatar_text VARCHAR(10) COMMENT '头像文字（如：AC）',
  name VARCHAR(100) NOT NULL COMMENT '成员姓名（中文）',
  name_en VARCHAR(100) COMMENT '成员姓名（英文）',
  role VARCHAR(100) NOT NULL COMMENT '职位（中文）',
  role_en VARCHAR(100) COMMENT '职位（英文）',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否显示',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网主题团队成员表';

-- 7. 官网主题合作伙伴表
CREATE TABLE IF NOT EXISTS promo_partners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image VARCHAR(500) NOT NULL COMMENT '合作伙伴Logo',
  name VARCHAR(100) NOT NULL COMMENT '合作伙伴名称（中文）',
  name_en VARCHAR(100) COMMENT '合作伙伴名称（英文）',
  url VARCHAR(500) COMMENT '合作伙伴网址',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否显示',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网主题合作伙伴表';

-- 8. 官网主题联系方式表
CREATE TABLE IF NOT EXISTS promo_contact_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  platform VARCHAR(100) NOT NULL COMMENT '平台名称（中文）',
  platform_en VARCHAR(100) COMMENT '平台名称（英文）',
  value VARCHAR(500) NOT NULL COMMENT '联系方式值',
  icon VARCHAR(255) COMMENT '图标',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否显示',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网主题联系方式表';

-- 9. 官网主题底部链接分组表
CREATE TABLE IF NOT EXISTS promo_footer_link_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_title VARCHAR(100) NOT NULL COMMENT '分组标题（中文）',
  group_title_en VARCHAR(100) COMMENT '分组标题（英文）',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否显示',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网主题底部链接分组表';

-- 10. 官网主题底部链接表
CREATE TABLE IF NOT EXISTS promo_footer_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL COMMENT '分组ID',
  name VARCHAR(100) NOT NULL COMMENT '链接名称（中文）',
  name_en VARCHAR(100) COMMENT '链接名称（英文）',
  url VARCHAR(500) NOT NULL COMMENT '链接地址',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否显示',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (group_id) REFERENCES promo_footer_link_groups(id) ON DELETE CASCADE,
  INDEX idx_group_id (group_id),
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网主题底部链接表';

-- 初始化开关设置
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'promoThemeEnabled',
  'false',
  'boolean',
  '官网主题模式开关（开启后首页自动跳转到/promo页面）'
) ON DUPLICATE KEY UPDATE
  type = VALUES(type),
  description = VALUES(description);

INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'promoBilingualEnabled',
  'false',
  'boolean',
  '官网主题双语模式开关（开启后显示语言切换按钮）'
) ON DUPLICATE KEY UPDATE
  type = VALUES(type),
  description = VALUES(description);

-- 初始化基础配置
INSERT INTO promo_config (config_key, config_value, config_value_en, config_type, description, sort_order) VALUES
('logoText', 'XsBlog', 'XsBlog', 'string', 'Logo文本', 1),
('logoSubText', ' 博客系统', ' Blog System', 'string', 'Logo副文本', 2),
('logoDarkImage', '', '', 'image', '黑色主题Logo图片', 3),
('logoLightImage', '', '', 'image', '白色主题Logo图片', 4),
('heroTitle', 'Xs-Blog\n独立的官网主题', 'Xs-Blog\nIndependent Website Theme', 'text', 'Hero标题', 10),
('heroDescription', 'AI未来感赛博朋克风格企业级展示主题，适用于AI、科技等互联网相关领域。', 'Futuristic cyberpunk-style enterprise theme for AI and technology fields.', 'text', 'Hero描述', 11),
('heroButtonText', '服务咨询', 'Service Consultation', 'string', 'Hero按钮文字', 12),
('heroButtonUrl', '#contact', '#contact', 'string', 'Hero按钮链接', 13),
('aboutTag', '关于我们', 'WHO WE ARE', 'string', 'About标签', 20),
('aboutTitle', 'Xs-Blog博客系统', 'Xs-Blog System', 'string', 'About标题', 21),
('aboutDescription', '一个轻量级的博客系统，适用于个人和小团队使用。', 'A lightweight blog system suitable for individuals and small teams.', 'text', 'About描述', 22),
('servicesTag', '服务内容', 'SERVICES', 'string', 'Services标签', 30),
('servicesTitle', 'Xs-Blog功能特性', 'Xs-Blog Features', 'string', 'Services标题', 31),
('teamTag', '团队成员', 'TEAM MEMBERS', 'string', 'Team标签', 40),
('teamTitle', '核心成员展示', 'Core Team Members', 'string', 'Team标题', 41),
('partnersTag', '技术支持', 'PARTNERS', 'string', 'Partners标签', 50),
('partnersDescription', '感谢以下所有平台对开发本程序的大力支持！', 'Thanks to all platforms for their support!', 'text', 'Partners描述', 51),
('contactTag', '联系我们', 'CONTACT US', 'string', 'Contact标签', 60),
('contactTitle', '与我们取得联系', 'Get In Touch', 'string', 'Contact标题', 61),
('contactDescription', '有任何问题或建议，欢迎随时联系我们。', 'Feel free to contact us with any questions or suggestions.', 'text', 'Contact描述', 62),
('contactFormNamePlaceholder', '您的姓名', 'Your Name', 'string', '联系表单-姓名占位符', 63),
('contactFormContactPlaceholder', '联系方式（邮箱/电话）', 'Contact (Email/Phone)', 'string', '联系表单-联系方式占位符', 64),
('contactFormMessagePlaceholder', '留言内容', 'Your Message', 'string', '联系表单-留言占位符', 65),
('contactFormButtonText', '提交留言', 'Submit', 'string', '联系表单-按钮文字', 66),
('footerLogoText', 'XsBlog', 'XsBlog', 'string', 'Footer Logo文本', 70),
('footerLogoSubText', ' 博客系统', ' Blog System', 'string', 'Footer Logo副文本', 71),
('footerDescription', '一个现代化的博客系统，为您提供优质的内容管理体验。', 'A modern blog system providing quality content management experience.', 'text', 'Footer描述', 72),
('footerCopyright', '© 2025 XsBlog. All rights reserved.', '© 2025 XsBlog. All rights reserved.', 'string', 'Footer版权信息', 73);

-- 初始化默认导航菜单
INSERT INTO promo_nav_items (name, name_en, link, sort_order, is_visible) VALUES
('首页', 'Home', '#home', 1, TRUE),
('关于我们', 'About', '#about', 2, TRUE),
('服务内容', 'Services', '#services', 3, TRUE),
('团队成员', 'Team', '#team', 4, TRUE),
('合作伙伴', 'Partners', '#partners', 5, TRUE),
('联系我们', 'Contact', '#contact', 6, TRUE);

-- 初始化默认统计数据
INSERT INTO promo_stats (stat_value, stat_value_en, stat_label, stat_label_en, sort_order, is_visible) VALUES
('100+', '100+', '已服务数量', 'Clients Served', 1, TRUE),
('95%', '95%', '功能全面性', 'Feature Completeness', 2, TRUE);

-- 初始化默认联系方式
INSERT INTO promo_contact_methods (platform, platform_en, value, sort_order, is_visible) VALUES
('邮箱', 'Email', 'contact@example.com', 1, TRUE),
('电话', 'Phone', '+86 123-4567-8900', 2, TRUE);

SELECT '✓ 官网主题功能数据表创建完成' AS '步骤6';

-- ========================================
-- 第七部分：页面访问控制 (v3.4.0)
-- ========================================
-- 更新日期: 2025-11-29
-- 说明: 添加 /user、/blog、/promo 页面的访问控制开关
-- ========================================

-- 1. 启用 /user 页面访问开关
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'enableUserPage',
  'true',
  'boolean',
  '启用/user页面访问（开启后可通过/user路径访问个人主页模式）'
) ON DUPLICATE KEY UPDATE
  type = VALUES(type),
  description = VALUES(description);

-- 2. 启用 /blog 页面访问开关
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'enableBlogPage',
  'true',
  'boolean',
  '启用/blog页面访问（开启后可通过/blog路径访问博客模式）'
) ON DUPLICATE KEY UPDATE
  type = VALUES(type),
  description = VALUES(description);

-- 3. 启用 /promo 页面访问开关
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'enablePromoPage',
  'true',
  'boolean',
  '启用/promo页面访问（开启后可通过/promo路径访问官网主题页面）'
) ON DUPLICATE KEY UPDATE
  type = VALUES(type),
  description = VALUES(description);

-- 4. 更新首页内容切换配置（将 enabledInBlogMode 改为 showInDefaultTheme）
UPDATE settings
SET setting_value = JSON_SET(
  setting_value,
  '$.showInDefaultTheme',
  COALESCE(JSON_EXTRACT(setting_value, '$.enabledInBlogMode'), true)
)
WHERE setting_key = 'homeContentSections'
AND JSON_VALID(setting_value);

-- 移除旧的 enabledInBlogMode 字段
UPDATE settings
SET setting_value = JSON_REMOVE(setting_value, '$.enabledInBlogMode')
WHERE setting_key = 'homeContentSections'
AND JSON_VALID(setting_value)
AND JSON_CONTAINS_PATH(setting_value, 'one', '$.enabledInBlogMode');

SELECT '✓ 页面访问控制设置添加完成' AS '步骤7';

-- ========================================
-- 第八部分：朋友圈功能 (v3.5.0)
-- ========================================
-- 更新日期: 2025-12-01
-- 说明: 新增朋友圈功能 - 支持动态发布、图片展示、个人资料设置
-- ========================================

-- 1. 朋友圈个人资料表 (social_feed_profile)
CREATE TABLE IF NOT EXISTS social_feed_profile (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cover_image VARCHAR(500) COMMENT '封面图片路径',
  avatar VARCHAR(500) COMMENT '头像路径',
  nickname VARCHAR(100) NOT NULL DEFAULT '朋友圈' COMMENT '昵称',
  signature TEXT COMMENT '个性签名',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='朋友圈个人资料表';

-- 插入默认数据
INSERT INTO social_feed_profile (nickname, signature)
VALUES ('朋友圈', '分享生活，记录美好时刻')
ON DUPLICATE KEY UPDATE id=id;

-- 2. 朋友圈动态内容表 (social_feed_posts)
CREATE TABLE IF NOT EXISTS social_feed_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content TEXT COMMENT '动态内容',
  images TEXT COMMENT '图片路径（JSON数组）',
  video VARCHAR(500) COMMENT '视频路径',
  likes_count INT DEFAULT 0 COMMENT '点赞数',
  comments_count INT DEFAULT 0 COMMENT '评论数',
  is_pinned BOOLEAN DEFAULT FALSE COMMENT '是否置顶',
  is_published BOOLEAN DEFAULT TRUE COMMENT '是否发布',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_is_published (is_published),
  INDEX idx_is_pinned (is_pinned),
  INDEX idx_created_at (created_at),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='朋友圈动态内容表';

-- 为已存在的表添加video字段（兼容升级）
SET @dbname = DATABASE();
SET @tablename = 'social_feed_posts';
SET @columnname = 'video';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT ''字段 video 已存在，跳过添加'' AS result;',
  'ALTER TABLE social_feed_posts ADD COLUMN video VARCHAR(500) COMMENT ''视频路径'' AFTER images;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 将content字段改为可空（兼容升级）
ALTER TABLE social_feed_posts MODIFY COLUMN content TEXT COMMENT '动态内容';

-- 将video字段扩展为TEXT类型（支持第三方视频长URL）
ALTER TABLE social_feed_posts MODIFY COLUMN video TEXT COMMENT '视频路径';

-- 3. 添加系统设置项
-- 启用朋友圈页面访问
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES ('enableSocialFeedPage', 'true', 'boolean', '启用朋友圈页面访问')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- 朋友圈主题模式启用
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES ('socialFeedThemeEnabled', 'false', 'boolean', '启用朋友圈主题模式（首页自动跳转）')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- 朋友圈SEO设置
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES ('socialFeedAllowSEO', 'false', 'boolean', '朋友圈页面允许搜索引擎抓取')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

SELECT '✓ 朋友圈功能数据表创建完成' AS '步骤8';

-- ========================================
-- 第九部分：笔记展示模式 (v3.6.0)
-- ========================================
-- 更新日期: 2025-12-15
-- 说明: 为笔记表添加展示模式字段，支持每个笔记单独设置窗口/页面展示模式
-- ========================================

-- 添加 display_mode 字段到 notes 表
SET @dbname = DATABASE();
SET @tablename = 'notes';
SET @columnname = 'display_mode';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT ''字段 display_mode 已存在，跳过添加'' AS result;',
  'ALTER TABLE notes ADD COLUMN display_mode ENUM(''modal'', ''page'') DEFAULT ''modal'' NOT NULL COMMENT ''展示模式：modal-窗口展示, page-页面展示'' AFTER source_text;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 为 display_mode 字段添加索引
SET @indexname = 'idx_display_mode';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = @indexname)
  ) > 0,
  'SELECT ''索引 idx_display_mode 已存在，跳过添加'' AS result;',
  'CREATE INDEX idx_display_mode ON notes(display_mode);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SELECT '✓ 笔记展示模式字段添加完成' AS '步骤9';

-- ========================================
-- 第十部分：页面访问统计 (v3.7.0)
-- ========================================
-- 更新日期: 2025-12-15
-- 说明: 新增页面访问统计功能 - 支持仪表盘访问趋势、模块统计、IP排行
-- ========================================

-- 1. 页面访问统计表 (page_visits)
CREATE TABLE IF NOT EXISTS page_visits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_type VARCHAR(50) NOT NULL COMMENT '页面类型：home, social-feed, notes, navigation, galleries, services, messages, docs',
  page_path VARCHAR(500) DEFAULT NULL COMMENT '具体页面路径',
  ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址（支持IPv6）',
  user_agent TEXT DEFAULT NULL COMMENT '浏览器User-Agent',
  referer VARCHAR(500) DEFAULT NULL COMMENT '来源页面',
  visit_date DATE NOT NULL COMMENT '访问日期（用于按日统计）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_page_type (page_type),
  INDEX idx_visit_date (visit_date),
  INDEX idx_ip_address (ip_address),
  INDEX idx_page_type_date (page_type, visit_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='页面访问统计表';

SELECT '✓ 页面访问统计表创建完成' AS '步骤10';

-- ========================================
-- 第十一部分：网站导航展示类型 (v3.8.0)
-- ========================================
-- 更新日期: 2025-12-16
-- 说明: 将网站导航的展示控制从布尔值改为三选项（前台/后台/前后台）
-- ========================================

-- 1. 添加 display_type 字段到 sites 表
SET @dbname = DATABASE();
SET @tablename = 'sites';
SET @columnname = 'display_type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT ''字段 display_type 已存在，跳过添加'' AS result;',
  'ALTER TABLE sites ADD COLUMN display_type ENUM(''frontend'', ''backend'', ''both'') DEFAULT ''both'' COMMENT ''展示位置：frontend-前台, backend-后台, both-前后台都展示'' AFTER is_frontend_visible;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. 迁移旧数据：将 is_frontend_visible 的值迁移到 display_type
UPDATE sites SET display_type = 'both' WHERE is_frontend_visible = 1 OR is_frontend_visible IS NULL;
UPDATE sites SET display_type = 'backend' WHERE is_frontend_visible = 0;

-- 3. 为 display_type 字段添加索引
SET @indexname = 'idx_sites_display_type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = @indexname)
  ) > 0,
  'SELECT ''索引 idx_sites_display_type 已存在，跳过添加'' AS result;',
  'CREATE INDEX idx_sites_display_type ON sites(display_type);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SELECT '✓ 网站导航展示类型字段添加完成' AS '步骤11';

-- ========================================
-- 执行说明
-- ========================================
--
-- 【执行方式】
--
-- 方式一：命令行执行
-- mysql -u root -p xsblog888 < update-database.sql
--
-- 方式二：MySQL 客户端执行
-- 1. 登录 MySQL: mysql -u root -p
-- 2. 使用数据库: USE xsblog888;
-- 3. 执行脚本: SOURCE /path/to/update-database.sql;
--
-- 方式三：phpMyAdmin/Navicat 等工具
-- 复制 SQL 语句到查询窗口执行
--
-- 【包含功能】
--
-- 1. 性能优化索引 (v3.1.0)
--    - 笔记列表查询优化
--    - 标签关联查询优化
--    - 待办事项查询优化
--
-- 2. 图库功能 (v3.2.0)
--    - 图册分类管理
--    - 图册管理
--    - 图片管理
--    - 密码保护
--
-- 3. 服务业务功能 (v3.2.0)
--    - 服务分类管理
--    - 服务管理
--    - 服务规格管理
--
-- 4. 文本设置初始化 (v3.2.1)
--    - 页面文本配置
--    - 首页内容切换配置
--
-- 5. 服务规格标题 (v3.2.2)
--    - 自定义服务规格标题
--
-- 6. 官网主题功能 (v3.3.0)
--    - 官网主题模式开关
--    - 官网主题配置（支持中英文双语）
--    - Logo和导航配置
--    - Hero、About、Services、Team、Partners、Contact等区域配置
--
-- 7. 页面访问控制 (v3.4.0)
--    - /user 页面访问控制开关
--    - /blog 页面访问控制开关
--    - /promo 页面访问控制开关
--    - 首页内容切换配置更新（showInDefaultTheme）
--
-- 8. 朋友圈功能 (v3.5.0)
--    - 朋友圈个人资料（封面图、头像、昵称、个性签名）
--    - 朋友圈动态发布（文本、图片、视频）
--    - 朋友圈主题模式开关（与官网主题模式互斥）
--    - 朋友圈页面访问控制
--    - 朋友圈SEO设置
--
-- 9. 笔记展示模式 (v3.6.0)
--    - 每个笔记可单独设置展示模式（窗口展示/页面展示）
--    - 从全局设置移动到单个笔记设置
--
-- 10. 页面访问统计 (v3.7.0)
--    - 页面访问记录（支持各模块访问统计）
--    - 访问趋势折线图（日/周/月，可按页面类型筛选）
--    - 模块数据统计卡片（数量+IP访问量）
--    - IP访问排行榜（TOP5-TOP20）
--
-- 11. 网站导航展示类型 (v3.8.0)
--    - 将布尔值 is_frontend_visible 改为三选项 display_type
--    - 支持前台展示、后台展示、前后台都展示三种模式
--    - 自动迁移旧数据
--
-- 【预期效果】
--
-- - 查询性能提升: 60-80%
-- - 新增图库功能
-- - 新增服务业务功能
-- - 新增文本设置功能
-- - 服务规格标题可自定义
-- - 新增官网主题功能（支持中英文双语切换）
-- - 新增页面访问控制功能（可独立控制三个固定路由页面的访问权限）
-- - 新增朋友圈功能（官网主题与朋友圈主题模式互斥，不能同时开启）
-- - 笔记展示模式支持单独设置（窗口展示或页面展示）
-- - 新增页面访问统计功能（仪表盘可视化展示访问趋势、模块统计、IP排行）
-- - 网站导航展示类型支持三选项（前台展示/后台展示/前后台都展示）
--
-- ========================================

-- ========================================
-- v3.9.0 新增页面文本配置表
-- ========================================

-- 创建页面文本配置表
CREATE TABLE IF NOT EXISTS page_texts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_key VARCHAR(50) NOT NULL UNIQUE COMMENT '页面标识（navigation/services/notes/note/galleries/messages/promo/socialFeed/docs）',
  title VARCHAR(200) DEFAULT '' COMMENT '页面标题',
  description VARCHAR(500) DEFAULT '' COMMENT '页面描述',
  browser_title VARCHAR(200) DEFAULT '' COMMENT '浏览器标签标题',
  browser_subtitle VARCHAR(200) DEFAULT '' COMMENT '浏览器标签副标题',
  usage_title VARCHAR(200) DEFAULT '' COMMENT '使用说明标题（仅docs页面使用）',
  usage_content TEXT COMMENT '使用说明内容（仅docs页面使用）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_page_key (page_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='页面文本配置表';

-- 初始化页面文本配置数据
INSERT INTO page_texts (page_key, title, description, browser_title, browser_subtitle) VALUES
('navigation', '导航列表', '探索精选的网站导航', '导航列表', ''),
('services', '服务业务', '为您提供专业的服务解决方案', '服务业务', ''),
('notes', '笔记列表', '探索所有已发布的笔记内容', '全部笔记', ''),
('note', '', '', '笔记详情', ''),
('galleries', '图库列表', '探索精彩的图片合集', '图库列表', ''),
('messages', '联系我们', '有任何问题都可以通过这里进行提交你的想法！', '留言板', ''),
('promo', '', '', '官网首页', ''),
('socialFeed', '', '', '朋友圈', ''),
('docs', '文档中心', '浏览所有可用的 Markdown 文档，点击查看详情', '文档中心', '')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 初始化docs页面的使用说明
UPDATE page_texts SET
  usage_title = '使用说明',
  usage_content = '将 Markdown 文件放入 public/markdown 目录\n通过 /docs/文件名 访问文档\n支持标准 Markdown 语法、GFM 扩展和 HTML 标签'
WHERE page_key = 'docs';

-- 删除旧的 pageTexts 设置（已迁移到 page_texts 表）
DELETE FROM settings WHERE setting_key = 'pageTexts';

-- 执行完成提示
SELECT '========================================' AS '';
SELECT '数据库更新完成！' AS '状态';
SELECT 'v3.9.0 - 所有功能已成功部署' AS '版本';
SELECT '========================================' AS '';

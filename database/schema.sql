-- ========================================
-- Xs-blog个人主页系统 - 完整数据库初始化脚本
-- Personal Homepage System - Database Schema
-- Developer: arran
-- ========================================
-- 版本: 1.0.3
-- 创建日期: 2025-10-31
-- 更新日期: 2025-11-19
-- 数据库: MySQL 5.7+
-- 字符集: UTF-8 (utf8mb4)
-- ========================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS xsblog888
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE xsblog888;

-- ========================================
-- 1. 用户表 (users)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
  password VARCHAR(255) NOT NULL COMMENT '密码（bcrypt加密）',
  role ENUM('admin', 'user') DEFAULT 'user' COMMENT '角色',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ========================================
-- 2. 个人资料表 (profile)
-- ========================================
CREATE TABLE IF NOT EXISTS profile (
  id INT AUTO_INCREMENT PRIMARY KEY,
  avatar VARCHAR(500) COMMENT '头像路径',
  name VARCHAR(100) COMMENT '显示名称',
  title VARCHAR(200) COMMENT '标题',
  bio TEXT COMMENT '个人简介',
  location VARCHAR(200) COMMENT '所在地',
  website VARCHAR(500) COMMENT '个人网站',
  website_title VARCHAR(200) COMMENT '网站标题',
  company VARCHAR(200) COMMENT '公司',
  background_image VARCHAR(500) COMMENT '背景图片',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='个人资料表';

-- ========================================
-- 3. 社交链接表 (social_links)
-- ========================================
CREATE TABLE IF NOT EXISTS social_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  platform VARCHAR(50) NOT NULL COMMENT '平台名称 (如: GitHub, Twitter, Email)',
  account VARCHAR(200) NOT NULL COMMENT '账号名称',
  link VARCHAR(500) COMMENT '链接地址',
  icon VARCHAR(500) COMMENT '图标名称',
  qrcode VARCHAR(500) COMMENT '二维码图片路径',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否可见',
  show_in_profile TINYINT(1) DEFAULT 0 COMMENT '是否在个人资料卡片中显示（最多3个）',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社交链接表';

-- ========================================
-- 4. 导航分类表 (navigation_categories) - v1.0.3更新
-- ========================================
CREATE TABLE IF NOT EXISTS navigation_categories (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='导航分类表';

-- ========================================
-- 5. 网站导航表 (sites)
-- ========================================
CREATE TABLE IF NOT EXISTS sites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '网站名称',
  link VARCHAR(255) NOT NULL COMMENT '网站地址',
  description TEXT COMMENT '网站描述',
  logo VARCHAR(255) COMMENT '网站Logo路径',
  category VARCHAR(50) COMMENT '分类（保留用于兼容）',
  category_id INT DEFAULT NULL COMMENT '分类ID（关联navigation_categories表）',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否在后台可见',
  is_frontend_visible BOOLEAN DEFAULT TRUE COMMENT '是否在前端展示',
  is_recommended BOOLEAN DEFAULT FALSE COMMENT '是否推荐',
  is_dashboard_visible BOOLEAN DEFAULT FALSE COMMENT '是否在后台首页显示',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_category (category),
  INDEX idx_category_id (category_id),
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible),
  INDEX idx_is_frontend_visible (is_frontend_visible),
  INDEX idx_is_recommended (is_recommended),
  INDEX idx_is_dashboard_visible (is_dashboard_visible),
  FOREIGN KEY (category_id) REFERENCES navigation_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网站导航表';

-- ========================================
-- 6. 分类表 (categories) - v1.0.3新增
-- ========================================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '分类名称',
  type ENUM('note', 'sticky_note', 'tag') NOT NULL DEFAULT 'note' COMMENT '分类类型',
  description TEXT COMMENT '分类描述',
  color VARCHAR(20) DEFAULT '#6366f1' COMMENT '分类颜色',
  icon VARCHAR(50) COMMENT '分类图标',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  parent_id INT DEFAULT NULL COMMENT '父分类ID（支持二级分类）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY unique_name_type (name, type),
  INDEX idx_type (type),
  INDEX idx_sort_order (sort_order),
  INDEX idx_parent_id (parent_id),
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='统一分类管理表';

-- ========================================
-- 7. 笔记表 (notes) - v1.0.3更新
-- ========================================
CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL COMMENT '标题',
  content TEXT NOT NULL COMMENT '内容（支持Markdown）',
  summary TEXT DEFAULT NULL COMMENT '笔记摘要（用于列表展示，为空则自动截取正文前150字）',
  category VARCHAR(100) COMMENT '分类（保留用于兼容）',
  category_id INT DEFAULT NULL COMMENT '分类ID（关联categories表）',
  tags VARCHAR(500) COMMENT '标签（逗号分隔，保留用于兼容）',
  is_published BOOLEAN DEFAULT TRUE COMMENT '是否发布到前端',
  show_in_list BOOLEAN DEFAULT TRUE COMMENT '是否在列表中展示（FALSE时只能通过URL直接访问）',
  is_pinned BOOLEAN DEFAULT FALSE COMMENT '是否置顶',
  password VARCHAR(255) DEFAULT NULL COMMENT '访问密码（为空表示无需密码）',
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  media_type ENUM('none', 'image', 'video', 'music') DEFAULT 'none' COMMENT '媒体类型',
  media_urls JSON COMMENT '媒体文件URLs（JSON数组）',
  external_link VARCHAR(500) COMMENT '外部链接',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  cover_image VARCHAR(500) DEFAULT NULL COMMENT '笔记封面图URL',
  -- v3.0.4 新增：笔记来源信息字段
  source_type ENUM('none', 'original', 'reprint') DEFAULT 'none' NOT NULL COMMENT '来源类型：none-不展示, original-原创, reprint-转载',
  source_url VARCHAR(500) DEFAULT NULL COMMENT '转载来源URL',
  source_text TEXT DEFAULT NULL COMMENT '文章来源文本（当source_url为空时使用）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_category (category),
  INDEX idx_category_id (category_id),
  INDEX idx_is_published (is_published),
  INDEX idx_show_in_list (show_in_list),
  INDEX idx_is_pinned (is_pinned),
  INDEX idx_published_at (published_at),
  INDEX idx_sort_order (sort_order),
  INDEX idx_source_type (source_type),
  FULLTEXT INDEX idx_title_content (title, content),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记表';

-- ========================================
-- 7.1 笔记网盘资源表 (note_disks) - v1.0.3新增
-- ========================================
CREATE TABLE IF NOT EXISTS note_disks (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记网盘资源表';

-- ========================================
-- 8. 便签表 (sticky_notes) - v1.0.0更新
-- ========================================
CREATE TABLE IF NOT EXISTS sticky_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL COMMENT '便签标题',
  content TEXT NOT NULL COMMENT '便签内容',
  category VARCHAR(100) COMMENT '便签分类（保留用于兼容）',
  category_id INT DEFAULT NULL COMMENT '分类ID（关联categories表）',
  color VARCHAR(20) DEFAULT '#fef68a' COMMENT '便签颜色（十六进制）',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  INDEX idx_category (category),
  INDEX idx_category_id (category_id),
  INDEX idx_sort_order (sort_order),
  INDEX idx_created_at (created_at),
  INDEX idx_updated_at (updated_at),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='便签表（仅后台可见）';

-- ========================================
-- 9. 标签表 (tags) - v0.7.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '标签名称',
  category VARCHAR(50) COMMENT '标签分类（保留用于兼容）',
  category_id INT DEFAULT NULL COMMENT '标签分类ID（关联categories表）',
  description TEXT COMMENT '标签描述',
  color VARCHAR(20) DEFAULT '#3b82f6' COMMENT '标签颜色',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_category (category),
  INDEX idx_category_id (category_id),
  INDEX idx_sort_order (sort_order),
  INDEX idx_name (name),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表（后台管理）';

-- ========================================
-- 10. 笔记-标签关联表 (note_tags) - v0.7.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS note_tags (
  note_id INT NOT NULL COMMENT '笔记ID',
  tag_id INT NOT NULL COMMENT '标签ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '关联创建时间',
  PRIMARY KEY (note_id, tag_id),
  INDEX idx_note_id (note_id),
  INDEX idx_tag_id (tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记标签多对多关联表';

-- ========================================
-- 11. 待办事项表 (todos) - v0.2.5
-- ========================================
CREATE TABLE IF NOT EXISTS todos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL COMMENT '待办事项标题',
  description TEXT COMMENT '详细描述',
  due_date DATETIME COMMENT '截止日期',
  reminder_enabled BOOLEAN DEFAULT FALSE COMMENT '是否启用提醒',
  reminder_time DATETIME COMMENT '提醒时间',
  reminder_dismissed BOOLEAN DEFAULT FALSE COMMENT '是否已忽略提醒',
  is_completed BOOLEAN DEFAULT FALSE COMMENT '是否已完成',
  -- v2.5 新增：进度管理字段
  progress INT DEFAULT 0 COMMENT '完成进度 (0-100)',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '优先级',
  status ENUM('todo', 'in_progress', 'completed', 'cancelled') DEFAULT 'todo' COMMENT '任务状态',
  category VARCHAR(50) DEFAULT NULL COMMENT '分类/标签',
  estimated_hours DECIMAL(5,2) DEFAULT NULL COMMENT '预计工时（小时）',
  actual_hours DECIMAL(5,2) DEFAULT NULL COMMENT '实际工时（小时）',
  parent_id INT DEFAULT NULL COMMENT '父任务ID（用于子任务）',
  order_index INT DEFAULT 0 COMMENT '排序索引',
  start_date DATETIME DEFAULT NULL COMMENT '开始日期',
  completed_at DATETIME DEFAULT NULL COMMENT '完成时间',
  -- v2.6 新增：时间点记录字段
  time_logs JSON DEFAULT NULL COMMENT '时间点记录（JSON数组，存储历史时间记录）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_due_date (due_date),
  INDEX idx_reminder_time (reminder_time),
  INDEX idx_reminder_enabled (reminder_enabled),
  INDEX idx_is_completed (is_completed),
  INDEX idx_priority (priority),
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_parent_id (parent_id),
  INDEX idx_order_index (order_index),
  INDEX idx_start_date (start_date),
  CONSTRAINT fk_parent_todo FOREIGN KEY (parent_id) REFERENCES todos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='待办事项表（仅后台可见）- v2.5支持项目进度管理';

-- ========================================
-- 11.1 待办事项分类表 (todo_categories) - v0.2.5 新增
-- ========================================
CREATE TABLE IF NOT EXISTS todo_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  color VARCHAR(20) DEFAULT '#3B82F6' COMMENT '分类颜色',
  icon VARCHAR(50) DEFAULT NULL COMMENT '图标名称',
  description VARCHAR(200) DEFAULT NULL COMMENT '描述',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='待办事项分类表';

-- ========================================
-- 11.2 待办事项时间记录表 (todo_time_logs) - v0.2.0 新增
-- ========================================
CREATE TABLE IF NOT EXISTS todo_time_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  todo_id INT NOT NULL COMMENT '待办事项ID',
  log_date DATE NOT NULL COMMENT '记录日期',
  start_time TIME NOT NULL COMMENT '开始时间',
  end_time TIME COMMENT '结束时间',
  duration DECIMAL(5,2) COMMENT '持续时长（小时）',
  description TEXT NOT NULL COMMENT '工作内容描述',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  INDEX idx_todo_id (todo_id),
  INDEX idx_log_date (log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='待办事项时间记录表';

-- ========================================
-- 12. 设置表 (settings)
-- ========================================
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL COMMENT '设置键',
  setting_value TEXT COMMENT '设置值',
  type VARCHAR(50) DEFAULT 'string' COMMENT '值类型',
  description VARCHAR(500) COMMENT '描述',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY unique_setting_key (setting_key),
  INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统设置表';

-- ========================================
-- 13. 留言分类表 (message_categories)
-- ========================================
CREATE TABLE IF NOT EXISTS message_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言分类表';

-- ========================================
-- 14. 留言表 (messages)
-- ========================================
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '用户称呼',
  contact VARCHAR(200) NOT NULL COMMENT '用户联系方式',
  category_id INT DEFAULT NULL COMMENT '分类ID',
  content TEXT NOT NULL COMMENT '留言内容',
  attachments TEXT COMMENT '附件路径（JSON数组）',
  ip_address VARCHAR(45) DEFAULT NULL COMMENT '提交者IP地址',
  user_agent TEXT COMMENT '用户代理信息',
  status ENUM('pending', 'read', 'replied') DEFAULT 'pending' COMMENT '状态：待处理、已读、已回复',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_category_id (category_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (category_id) REFERENCES message_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言表';

-- ========================================
-- 15. 留言IP记录表 (message_ip_records)
-- ========================================
CREATE TABLE IF NOT EXISTS message_ip_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址',
  last_submit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最后提交时间',
  UNIQUE KEY unique_ip (ip_address),
  INDEX idx_last_submit_at (last_submit_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言IP记录表（用于频率限制）';

-- ========================================
-- 初始化默认管理员账户
-- ========================================
-- 用户名: admin
-- 密码: admin123
-- 注意：首次部署后请立即修改密码！
INSERT INTO users (username, email, password, role, status)
VALUES (
  'admin',
  'admin@example.com',
  '$2a$10$uLAV0rVVTxgVcaaMCENJUuVxffrdLDFQe44EQS14Lx9sYWrHwZ3tC',
  'admin',
  'active'
) ON DUPLICATE KEY UPDATE username = username;

-- ========================================
-- 初始化默认设置
-- ========================================
-- 留言IP提交频率限制设置
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'messageIpLimitDays',
  '1',
  'number',
  '留言IP提交频率限制（天），0表示不限制'
) ON DUPLICATE KEY UPDATE description = '留言IP提交频率限制（天），0表示不限制';

-- 导航推荐功能开关设置
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'showNavigationRecommended',
  'true',
  'boolean',
  '是否显示导航推荐功能'
) ON DUPLICATE KEY UPDATE description = '是否显示导航推荐功能';

-- 笔记列表布局列数设置
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'noteLayoutColumns',
  '1',
  'string',
  '笔记列表每排显示的卡片数量（1-4），移动端最多2个'
) ON DUPLICATE KEY UPDATE description = '笔记列表每排显示的卡片数量（1-4），移动端最多2个';

-- ========================================
-- 数据库结构说明
-- ========================================
--
-- 【表关系说明】
-- 1. users: 独立表，存储用户信息（仅用于后台管理）
-- 2. profile: 独立表，存储个人资料信息
-- 3. social_links: 独立表，存储社交链接信息
-- 4. sites: 独立表，存储网站导航信息
-- 5. categories: 独立表，统一管理分类（笔记、便签、标签分类）
-- 6. notes: 独立表，存储笔记信息（支持Markdown，可发布到前端）
--    - 关联 categories (多对一)
--    - 关联 tags (多对多，通过note_tags表)
-- 7. sticky_notes: 独立表，存储便签信息（仅后台可见，支持分类）
--    - 关联 categories (多对一)
-- 8. tags: 独立表，存储标签信息（后台管理，支持分类）
--    - 关联 categories (多对一)
--    - 关联 notes (多对多，通过note_tags表)
-- 9. note_tags: 关联表，实现笔记和标签的多对多关系
-- 10. todos: 独立表，存储待办事项信息（仅后台可见，支持提醒）
--    - 关联 todo_categories (多对一)
--    - 关联 todo_time_logs (一对多)
-- 10.1 todo_categories: 独立表，存储待办事项分类信息
-- 10.2 todo_time_logs: 独立表，存储待办事项时间记录信息
--    - 关联 todos (多对一)
-- 11. settings: 独立表，存储系统设置信息
-- 12. message_categories: 独立表，存储留言分类信息
-- 13. messages: 独立表，存储留言信息（前端提交，后台管理）
--    - 关联 message_categories (多对一)
-- 14. message_ip_records: 独立表，记录IP提交历史（用于频率限制）
--
-- 【v2.0核心改进】
-- - 新增 categories 表：统一管理所有分类，支持颜色、图标、层级
-- - 新增 note_tags 表：笔记和标签的多对多关系，性能大幅提升
-- - 优化查询：使用索引和JOIN替代LIKE查询，查询效率提升10倍以上
-- - 数据一致性：通过外键约束保证数据完整性
-- - 向后兼容：保留原有category和tags字段，支持渐进式迁移
--
-- 【功能特点】
-- - 便签功能：支持分类、颜色标记、排序、关键词搜索
-- - 待办事项：支持截止日期、提醒功能、完成状态追踪、项目进度管理、时间点记录
-- - 标签系统：支持分类、颜色管理、使用统计、智能选择器
-- - 笔记系统：支持Markdown、分类、标签、媒体附件、发布控制、密码保护
-- - 分类系统：支持层级分类、颜色标记、类型区分
-- - 留言系统：支持分类、验证码、IP频率限制、邮件通知
-- - 时间记录：支持工作日志管理、工时统计、时间段记录
-- - 社交链接：支持二维码展示、账号弹窗复制、智能交互模式
--
-- 【常用设置键 (settings.setting_key)】
-- - themeColor: 主题颜色 (white/gray/black)
-- - showSiteNav: 是否显示网站导航 (true/false)
-- - footerCopyright: 页脚版权信息
-- - backgroundImage: 背景图片路径
-- - backgroundOpacity: 背景透明度 (0-1)
-- - customFont: 自定义字体文件路径
-- - customFontName: 自定义字体名称
-- - favicon: 网站图标路径
-- - showAdminLink: 是否显示管理后台链接 (true/false)
-- - defaultDisplaySection: 默认显示区域 (notes/sites)
-- - showNotes: 是否显示笔记区域 (true/false)
-- - showSocialLinks: 是否显示社交链接 (true/false)
-- - loaderDuration: 加载动画时长（毫秒）
-- - siteTitle: 网站标题
-- - siteDescription: 网站描述
-- - siteKeywords: 网站关键词
-- - messageIpLimitDays: 留言IP提交频率限制（天），0表示不限制
-- - noteDisplayMode: 笔记展示模式 (modal/page) - modal:弹窗展示, page:独立页面展示
--
-- 【版本历史】
-- v0.9.0 (2025-11-17): 社交链接功能增强
--   - 社交链接支持二维码图片上传和展示
--   - 新增二维码弹窗功能（点击显示二维码图片）
--   - 新增账号弹窗功能（无链接时显示账号并提供复制按钮）
--   - 智能交互模式：有二维码显示二维码，无二维码无链接显示账号，有链接正常跳转
--   - 适配所有显示位置：首页、侧边栏、移动端菜单
--   - Markdown编辑器功能增强：新增H1-H3标题、删除线、代码块、表格、任务列表、分隔线等
--   - 修复后台笔记创建时偶现显示其他笔记内容的问题
--   - 后台笔记管理中密码链接直接显示完整URL而非超链接文字
-- v0.8.0 (2025-11-16): 新增笔记摘要和密码保护功能
--   - 新增 summary 字段：笔记摘要，用于列表展示
--   - 新增 password 字段：笔记访问密码保护
--   - 新增密码验证API：POST /api/notes/:id/verify
--   - 后台管理支持设置和编辑笔记摘要
--   - 前台列表优先显示摘要，无摘要则自动截取正文
--   - 支持密码保护的笔记需要验证后才能查看完整内容
-- v0.7.0 (2025-11-15): 新增笔记独立页面功能
--   - 新增笔记独立页面路由 /note/[id]
--   - 新增 noteDisplayMode 设置：支持窗口/页面展示模式切换
--   - 优化笔记阅读体验，支持博客风格独立页面
--   - 完美适配黑/白/灰三种主题
-- v0.6.0 (2024-11-07): 新增时间点记录功能
--   - 新增 todo_time_logs 表：存储待办事项时间记录
--   - 支持工作日志管理、工时统计
--   - 支持时间段记录和时长计算
-- v0.5.0 (2024-11-07): 新增项目进度管理功能
--   - 新增进度、优先级、状态、工时等字段
--   - 新增 todo_categories 表：待办事项分类管理
--   - 支持子任务、开始日期、完成时间
-- v0.1.0 (2024-11-05): 新增留言系统
--   - 新增 message_categories、messages、message_ip_records 表
--   - 支持留言分类管理
--   - 支持验证码验证
--   - 支持IP频率限制（可配置天数）
--   - 支持邮件通知
-- v0.0.1 (2025-11-04): 重构标签和分类系统
--   - 新增 categories 表和 note_tags 表
--   - 优化数据结构，提升查询性能
--   - 新增标签管理页面和智能选择器
-- v1.1.0 (2025-11-03): 新增便签分类功能、完善待办事项提醒功能
-- v1.0.0 (2025-10-31): 初始版本 - 基础功能
--
-- ========================================

-- ========================================
-- Xs-blog个人主页系统 - SQLite 数据库初始化脚本
-- Personal Homepage System - SQLite Database Schema
-- Developer: arran
-- ========================================
-- 版本: 3.9.0
-- 创建日期: 2025-11-24
-- 更新日期: 2025-12-16
-- 数据库: SQLite 3
-- 字符集: UTF-8
-- ========================================
-- 更新日志:
-- v3.9.0 (2025-12-16): 新增页面文本配置表 page_texts，将页面文本配置从 settings 表迁移到独立表
-- v3.8.0 (2025-12-16): 网站导航展示类型改为三选项（前台/后台/前后台），移除后台首页显示字段
-- v3.7.0 (2025-12-15): 新增页面访问统计功能 - 支持仪表盘访问趋势、模块统计、IP排行
-- v3.5.0 (2025-12-01): 新增朋友圈功能 - 支持动态发布、图片展示、个人资料设置
-- v3.4.0 (2025-11-29): 新增页面访问控制功能 - 支持/user、/blog、/promo页面访问权限控制
-- v3.1.0 (2025-11-24): SQLite 版本初始化，包含性能优化索引
-- ========================================

-- 启用外键约束
PRAGMA foreign_keys = ON;

-- ========================================
-- 1. 用户表 (users)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ========================================
-- 2. 个人资料表 (profile)
-- ========================================
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  avatar TEXT,
  name TEXT,
  title TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  website_title TEXT,
  company TEXT,
  background_image TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3. 社交链接表 (social_links)
-- ========================================
CREATE TABLE IF NOT EXISTS social_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  account TEXT NOT NULL,
  link TEXT,
  icon TEXT,
  qrcode TEXT,
  is_visible INTEGER DEFAULT 1,
  show_in_profile INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_links_sort_order ON social_links(sort_order);
CREATE INDEX IF NOT EXISTS idx_social_links_is_visible ON social_links(is_visible);

-- ========================================
-- 4. 导航分类表 (navigation_categories)
-- ========================================
CREATE TABLE IF NOT EXISTS navigation_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_navigation_categories_sort_order ON navigation_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_navigation_categories_is_visible ON navigation_categories(is_visible);

-- ========================================
-- 5. 网站导航表 (sites)
-- ========================================
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  link TEXT NOT NULL,
  description TEXT,
  logo TEXT,
  category TEXT,
  category_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  display_type TEXT DEFAULT 'both' CHECK(display_type IN ('frontend', 'backend', 'both')),
  is_recommended INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES navigation_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category);
CREATE INDEX IF NOT EXISTS idx_sites_category_id ON sites(category_id);
CREATE INDEX IF NOT EXISTS idx_sites_sort_order ON sites(sort_order);
CREATE INDEX IF NOT EXISTS idx_sites_is_visible ON sites(is_visible);
CREATE INDEX IF NOT EXISTS idx_sites_display_type ON sites(display_type);
CREATE INDEX IF NOT EXISTS idx_sites_is_recommended ON sites(is_recommended);

-- ========================================
-- 6. 分类表 (categories)
-- ========================================
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'note' CHECK(type IN ('note', 'sticky_note', 'tag')),
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  parent_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, type),
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- ========================================
-- 7. 笔记表 (notes)
-- ========================================
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  category TEXT,
  category_id INTEGER,
  tags TEXT,
  is_published INTEGER DEFAULT 1,
  show_in_list INTEGER DEFAULT 1,
  is_pinned INTEGER DEFAULT 0,
  password TEXT,
  published_at TEXT DEFAULT CURRENT_TIMESTAMP,
  media_type TEXT DEFAULT 'none' CHECK(media_type IN ('none', 'image', 'video', 'music')),
  media_urls TEXT,
  external_link TEXT,
  sort_order INTEGER DEFAULT 0,
  cover_image TEXT,
  source_type TEXT DEFAULT 'none' CHECK(source_type IN ('none', 'original', 'reprint')),
  source_url TEXT,
  source_text TEXT,
  display_mode TEXT DEFAULT 'modal' CHECK(display_mode IN ('modal', 'page')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes(category_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_published ON notes(is_published);
CREATE INDEX IF NOT EXISTS idx_notes_show_in_list ON notes(show_in_list);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_display_mode ON notes(display_mode);
CREATE INDEX IF NOT EXISTS idx_notes_published_at ON notes(published_at);
CREATE INDEX IF NOT EXISTS idx_notes_sort_order ON notes(sort_order);
CREATE INDEX IF NOT EXISTS idx_notes_source_type ON notes(source_type);

-- 性能优化：组合索引（v3.1.0）
CREATE INDEX IF NOT EXISTS idx_notes_list_order ON notes(is_pinned DESC, sort_order DESC, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_published_time ON notes(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_published_category_time ON notes(is_published, category_id, published_at DESC);

-- ========================================
-- 7.1 笔记网盘资源表 (note_disks)
-- ========================================
CREATE TABLE IF NOT EXISTS note_disks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL,
  disk_name TEXT NOT NULL,
  title TEXT NOT NULL,
  file_size TEXT,
  extract_code TEXT,
  download_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_note_disks_note_id ON note_disks(note_id);
CREATE INDEX IF NOT EXISTS idx_note_disks_sort_order ON note_disks(sort_order);

-- ========================================
-- 8. 便签表 (sticky_notes)
-- ========================================
CREATE TABLE IF NOT EXISTS sticky_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  category_id INTEGER,
  color TEXT DEFAULT '#fef68a',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sticky_notes_category ON sticky_notes(category);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_category_id ON sticky_notes(category_id);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_sort_order ON sticky_notes(sort_order);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_created_at ON sticky_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_updated_at ON sticky_notes(updated_at);

-- ========================================
-- 9. 标签表 (tags)
-- ========================================
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  category_id INTEGER,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_category_id ON tags(category_id);
CREATE INDEX IF NOT EXISTS idx_tags_sort_order ON tags(sort_order);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- ========================================
-- 10. 笔记-标签关联表 (note_tags)
-- ========================================
CREATE TABLE IF NOT EXISTS note_tags (
  note_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);

-- 性能优化：组合索引（v3.1.0）
CREATE INDEX IF NOT EXISTS idx_note_tags_note_tag ON note_tags(note_id, tag_id);

-- ========================================
-- 11. 待办事项表 (todos)
-- ========================================
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  reminder_enabled INTEGER DEFAULT 0,
  reminder_time TEXT,
  reminder_dismissed INTEGER DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'completed', 'cancelled')),
  category TEXT,
  estimated_hours REAL,
  actual_hours REAL,
  parent_id INTEGER,
  order_index INTEGER DEFAULT 0,
  start_date TEXT,
  completed_at TEXT,
  time_logs TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES todos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_reminder_time ON todos(reminder_time);
CREATE INDEX IF NOT EXISTS idx_todos_reminder_enabled ON todos(reminder_enabled);
CREATE INDEX IF NOT EXISTS idx_todos_is_completed ON todos(is_completed);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category);
CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id);
CREATE INDEX IF NOT EXISTS idx_todos_order_index ON todos(order_index);
CREATE INDEX IF NOT EXISTS idx_todos_start_date ON todos(start_date);

-- 性能优化：组合索引（v3.1.0）
CREATE INDEX IF NOT EXISTS idx_todos_incomplete_due ON todos(is_completed, due_date);

-- ========================================
-- 11.1 待办事项分类表 (todo_categories)
-- ========================================
CREATE TABLE IF NOT EXISTS todo_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 11.2 待办事项时间记录表 (todo_time_logs)
-- ========================================
CREATE TABLE IF NOT EXISTS todo_time_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id INTEGER NOT NULL,
  log_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration REAL,
  description TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_todo_time_logs_todo_id ON todo_time_logs(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_time_logs_log_date ON todo_time_logs(log_date);

-- ========================================
-- 12. 设置表 (settings)
-- ========================================
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  type TEXT DEFAULT 'string',
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settings_setting_key ON settings(setting_key);

-- ========================================
-- 13. 留言分类表 (message_categories)
-- ========================================
CREATE TABLE IF NOT EXISTS message_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_categories_sort_order ON message_categories(sort_order);

-- ========================================
-- 14. 留言表 (messages)
-- ========================================
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  category_id INTEGER,
  content TEXT NOT NULL,
  attachments TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'read', 'replied')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES message_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_category_id ON messages(category_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ========================================
-- 15. 留言IP记录表 (message_ip_records)
-- ========================================
CREATE TABLE IF NOT EXISTS message_ip_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL UNIQUE,
  last_submit_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_ip_records_last_submit_at ON message_ip_records(last_submit_at);

-- ========================================
-- 初始化默认管理员账户
-- ========================================
-- 用户名: admin
-- 密码: admin123
-- 注意：首次部署后请立即修改密码！
INSERT OR IGNORE INTO users (username, email, password, role, status)
VALUES (
  'admin',
  'admin@example.com',
  '$2a$10$uLAV0rVVTxgVcaaMCENJUuVxffrdLDFQe44EQS14Lx9sYWrHwZ3tC',
  'admin',
  'active'
);

-- ========================================
-- 初始化默认设置
-- ========================================
INSERT OR IGNORE INTO settings (setting_key, setting_value, type, description)
VALUES
  ('messageIpLimitDays', '1', 'number', '留言IP提交频率限制（天），0表示不限制'),
  ('showNavigationRecommended', 'true', 'boolean', '是否显示导航推荐功能'),
  ('noteLayoutColumns', '1', 'string', '笔记列表每排显示的卡片数量（1-4），移动端最多2个'),
  ('homeContentSections', '{"section1":"notes","section2":"navigation","showInDefaultTheme":true}', 'json', '首页内容区域配置（选择展示哪些内容）');

-- 页面文本配置已迁移到 page_texts 表（v3.9.0）

-- ========================================
-- 16. 图册分类表 (gallery_categories)
-- ========================================
-- 版本: v3.2.0
-- 创建日期: 2025-11-25
-- ========================================
CREATE TABLE IF NOT EXISTS gallery_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) NOT NULL, -- 分类名称
  description TEXT, -- 分类描述
  icon VARCHAR(255), -- 分类图标
  sort_order INTEGER DEFAULT 0, -- 排序（数字越小越靠前）
  is_visible INTEGER DEFAULT 1, -- 是否可见 (0=false, 1=true)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 更新时间
);

CREATE INDEX IF NOT EXISTS idx_gallery_categories_sort_order ON gallery_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_categories_is_visible ON gallery_categories(is_visible);

-- ========================================
-- 17. 图册表 (galleries)
-- ========================================
CREATE TABLE IF NOT EXISTS galleries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title VARCHAR(200) NOT NULL, -- 图册标题
  description TEXT, -- 图册描述
  category_id INTEGER, -- 分类ID
  password VARCHAR(100), -- 访问密码（为空表示无密码）
  cover_image VARCHAR(500), -- 封面图片路径（第一张图片）
  is_visible INTEGER DEFAULT 1, -- 是否在前台可见 (0=false, 1=true)
  sort_order INTEGER DEFAULT 0, -- 排序（数字越小越靠前）
  image_count INTEGER DEFAULT 0, -- 图片数量
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 更新时间
  FOREIGN KEY (category_id) REFERENCES gallery_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_galleries_category_id ON galleries(category_id);
CREATE INDEX IF NOT EXISTS idx_galleries_is_visible ON galleries(is_visible);
CREATE INDEX IF NOT EXISTS idx_galleries_sort_order ON galleries(sort_order);
CREATE INDEX IF NOT EXISTS idx_galleries_list_order ON galleries(is_visible, sort_order DESC, created_at DESC);

-- ========================================
-- 18. 图册图片表 (gallery_images)
-- ========================================
CREATE TABLE IF NOT EXISTS gallery_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gallery_id INTEGER NOT NULL, -- 图册ID
  filename VARCHAR(255) NOT NULL, -- 文件名
  path VARCHAR(500) NOT NULL, -- 文件路径
  sort_order INTEGER DEFAULT 0, -- 排序（数字越小越靠前）
  size INTEGER, -- 文件大小（字节）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 更新时间
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery_id ON gallery_images(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_sort_order ON gallery_images(sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery_order ON gallery_images(gallery_id, sort_order ASC);

-- 图库表更新触发器（SQLite 需要手动维护 updated_at）
CREATE TRIGGER IF NOT EXISTS update_gallery_categories_timestamp
AFTER UPDATE ON gallery_categories
FOR EACH ROW
BEGIN
  UPDATE gallery_categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_galleries_timestamp
AFTER UPDATE ON galleries
FOR EACH ROW
BEGIN
  UPDATE galleries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_gallery_images_timestamp
AFTER UPDATE ON gallery_images
FOR EACH ROW
BEGIN
  UPDATE gallery_images SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ========================================
-- 19. 服务分类表 (service_categories)
-- ========================================
-- 版本: v3.2.0
-- 创建日期: 2025-11-25
-- ========================================
CREATE TABLE IF NOT EXISTS service_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) NOT NULL, -- 分类名称
  description TEXT DEFAULT NULL, -- 分类描述
  icon VARCHAR(255) DEFAULT NULL, -- 分类图标
  sort_order INTEGER DEFAULT 0, -- 排序（数字越小越靠前）
  is_visible INTEGER DEFAULT 1, -- 是否可见
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_categories_sort_order ON service_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_service_categories_is_visible ON service_categories(is_visible);

-- ========================================
-- 20. 服务表 (services)
-- ========================================
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(200) NOT NULL, -- 服务名称
  description TEXT DEFAULT NULL, -- 服务简述
  content TEXT DEFAULT NULL, -- 服务详情介绍（Markdown格式）
  cover_image VARCHAR(500) DEFAULT NULL, -- 服务封面图（1:1正方形）
  price VARCHAR(100) DEFAULT NULL, -- 价格（文本格式，可包含非数字）
  category_id INTEGER DEFAULT NULL, -- 分类ID（关联service_categories表）
  is_visible INTEGER DEFAULT 1, -- 是否在前台显示
  is_recommended INTEGER DEFAULT 0, -- 是否推荐服务
  sort_order INTEGER DEFAULT 0, -- 排序（数字越小越靠前）
  show_order_button INTEGER DEFAULT 0, -- 是否显示"立即下单"按钮
  order_button_text VARCHAR(50) DEFAULT '立即下单', -- 下单按钮文字
  order_button_url VARCHAR(500) DEFAULT NULL, -- 下单按钮跳转URL
  spec_title VARCHAR(50) DEFAULT '服务规格', -- 服务规格标题（可自定义）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_is_visible ON services(is_visible);
CREATE INDEX IF NOT EXISTS idx_services_is_recommended ON services(is_recommended);
CREATE INDEX IF NOT EXISTS idx_services_sort_order ON services(sort_order);

-- ========================================
-- 21. 服务规格表 (service_specifications)
-- ========================================
CREATE TABLE IF NOT EXISTS service_specifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL, -- 所属服务ID（关联services表）
  spec_name VARCHAR(100) NOT NULL, -- 规格名称
  spec_value VARCHAR(500) DEFAULT NULL, -- 规格值
  sort_order INTEGER DEFAULT 0, -- 排序（数字越小越靠前）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_service_specifications_service_id ON service_specifications(service_id);
CREATE INDEX IF NOT EXISTS idx_service_specifications_sort_order ON service_specifications(sort_order);

-- 服务表更新触发器（用于自动更新updated_at字段）
CREATE TRIGGER IF NOT EXISTS update_service_categories_timestamp
AFTER UPDATE ON service_categories
BEGIN
  UPDATE service_categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_services_timestamp
AFTER UPDATE ON services
BEGIN
  UPDATE services SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_service_specifications_timestamp
AFTER UPDATE ON service_specifications
BEGIN
  UPDATE service_specifications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ========================================
-- 初始化服务分类示例数据（可选）
-- ========================================
INSERT OR IGNORE INTO service_categories (name, description, icon, sort_order, is_visible) VALUES
('网站开发', '提供各类网站开发服务', '🌐', 1, 1),
('移动应用', '移动端应用开发服务', '📱', 2, 1),
('UI设计', '用户界面和体验设计', '🎨', 3, 1);

-- ========================================
-- 22. 官网主题基础配置表 (promo_config) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT,
  config_value_en TEXT,
  config_type TEXT DEFAULT 'string',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_config_key ON promo_config(config_key);
CREATE INDEX IF NOT EXISTS idx_promo_config_sort_order ON promo_config(sort_order);

-- ========================================
-- 23. 官网主题导航菜单表 (promo_nav_items) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_nav_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_en TEXT,
  link TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_nav_items_sort_order ON promo_nav_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_nav_items_is_visible ON promo_nav_items(is_visible);

-- ========================================
-- 24. 官网主题统计数据表 (promo_stats) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stat_value TEXT NOT NULL,
  stat_value_en TEXT,
  stat_label TEXT NOT NULL,
  stat_label_en TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_stats_sort_order ON promo_stats(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_stats_is_visible ON promo_stats(is_visible);

-- ========================================
-- 25. 官网主题服务分类表 (promo_service_categories) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_service_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_en TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_service_categories_sort_order ON promo_service_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_service_categories_is_visible ON promo_service_categories(is_visible);

-- ========================================
-- 26. 官网主题服务项表 (promo_services) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  image TEXT,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  description_en TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES promo_service_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_promo_services_category_id ON promo_services(category_id);
CREATE INDEX IF NOT EXISTS idx_promo_services_sort_order ON promo_services(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_services_is_visible ON promo_services(is_visible);

-- ========================================
-- 27. 官网主题团队成员表 (promo_team_members) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  avatar_image TEXT,
  avatar_text TEXT,
  name TEXT NOT NULL,
  name_en TEXT,
  role TEXT NOT NULL,
  role_en TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_team_members_sort_order ON promo_team_members(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_team_members_is_visible ON promo_team_members(is_visible);

-- ========================================
-- 28. 官网主题合作伙伴表 (promo_partners) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image TEXT NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_partners_sort_order ON promo_partners(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_partners_is_visible ON promo_partners(is_visible);

-- ========================================
-- 29. 官网主题联系方式表 (promo_contact_methods) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_contact_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  platform_en TEXT,
  value TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_contact_methods_sort_order ON promo_contact_methods(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_contact_methods_is_visible ON promo_contact_methods(is_visible);

-- ========================================
-- 30. 官网主题底部链接分组表 (promo_footer_link_groups) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_footer_link_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_title TEXT NOT NULL,
  group_title_en TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_footer_link_groups_sort_order ON promo_footer_link_groups(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_footer_link_groups_is_visible ON promo_footer_link_groups(is_visible);

-- ========================================
-- 31. 官网主题底部链接表 (promo_footer_links) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_footer_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES promo_footer_link_groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_promo_footer_links_group_id ON promo_footer_links(group_id);
CREATE INDEX IF NOT EXISTS idx_promo_footer_links_sort_order ON promo_footer_links(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_footer_links_is_visible ON promo_footer_links(is_visible);

-- 官网主题表更新触发器（SQLite 需要手动维护 updated_at）
CREATE TRIGGER IF NOT EXISTS update_promo_config_timestamp
AFTER UPDATE ON promo_config
FOR EACH ROW
BEGIN
  UPDATE promo_config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_promo_nav_items_timestamp
AFTER UPDATE ON promo_nav_items
FOR EACH ROW
BEGIN
  UPDATE promo_nav_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_promo_stats_timestamp
AFTER UPDATE ON promo_stats
FOR EACH ROW
BEGIN
  UPDATE promo_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_promo_service_categories_timestamp
AFTER UPDATE ON promo_service_categories
FOR EACH ROW
BEGIN
  UPDATE promo_service_categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_promo_services_timestamp
AFTER UPDATE ON promo_services
FOR EACH ROW
BEGIN
  UPDATE promo_services SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_promo_team_members_timestamp
AFTER UPDATE ON promo_team_members
FOR EACH ROW
BEGIN
  UPDATE promo_team_members SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_promo_partners_timestamp
AFTER UPDATE ON promo_partners
FOR EACH ROW
BEGIN
  UPDATE promo_partners SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_promo_contact_methods_timestamp
AFTER UPDATE ON promo_contact_methods
FOR EACH ROW
BEGIN
  UPDATE promo_contact_methods SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_promo_footer_link_groups_timestamp
AFTER UPDATE ON promo_footer_link_groups
FOR EACH ROW
BEGIN
  UPDATE promo_footer_link_groups SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_promo_footer_links_timestamp
AFTER UPDATE ON promo_footer_links
FOR EACH ROW
BEGIN
  UPDATE promo_footer_links SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ========================================
-- 初始化官网主题设置
-- ========================================
INSERT OR IGNORE INTO settings (setting_key, setting_value, type, description)
VALUES
  ('promoThemeEnabled', 'false', 'boolean', '官网主题模式开关（开启后首页自动跳转到/promo页面）'),
  ('promoBilingualEnabled', 'false', 'boolean', '官网主题双语模式开关（开启后显示语言切换按钮）');

-- ========================================
-- 初始化页面访问控制设置 (v3.4.0)
-- ========================================
INSERT OR IGNORE INTO settings (setting_key, setting_value, type, description)
VALUES
  ('enableUserPage', 'true', 'boolean', '启用/user页面访问（开启后可通过/user路径访问个人主页模式）'),
  ('enableBlogPage', 'true', 'boolean', '启用/blog页面访问（开启后可通过/blog路径访问博客模式）'),
  ('enablePromoPage', 'true', 'boolean', '启用/promo页面访问（开启后可通过/promo路径访问官网主题页面）');

-- ========================================
-- 初始化官网主题配置数据
-- ========================================
INSERT OR IGNORE INTO promo_config (config_key, config_value, config_value_en, config_type, description, sort_order) VALUES
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
INSERT OR IGNORE INTO promo_nav_items (name, name_en, link, sort_order, is_visible) VALUES
('首页', 'Home', '#home', 1, 1),
('关于我们', 'About', '#about', 2, 1),
('服务内容', 'Services', '#services', 3, 1),
('团队成员', 'Team', '#team', 4, 1),
('合作伙伴', 'Partners', '#partners', 5, 1),
('联系我们', 'Contact', '#contact', 6, 1);

-- 初始化默认统计数据
INSERT OR IGNORE INTO promo_stats (stat_value, stat_value_en, stat_label, stat_label_en, sort_order, is_visible) VALUES
('100+', '100+', '已服务数量', 'Clients Served', 1, 1),
('95%', '95%', '功能全面性', 'Feature Completeness', 2, 1);

-- 初始化默认联系方式
INSERT OR IGNORE INTO promo_contact_methods (platform, platform_en, value, sort_order, is_visible) VALUES
('邮箱', 'Email', 'contact@example.com', 1, 1),
('电话', 'Phone', '+86 123-4567-8900', 2, 1);

-- ========================================
-- SQLite 特别说明
-- ========================================
-- 1. 数据类型：SQLite 使用动态类型系统
--    - INTEGER: 整数
--    - TEXT: 文本
--    - REAL: 浮点数
--    - BLOB: 二进制数据
--
-- 2. 日期时间：使用 TEXT 类型存储 ISO8601 格式
--    - 格式：YYYY-MM-DD HH:MM:SS
--    - 默认值：CURRENT_TIMESTAMP
--
-- 3. 布尔值：使用 INTEGER (0=false, 1=true)
--
-- 4. JSON：使用 TEXT 类型存储 JSON 字符串
--
-- 5. ENUM：使用 CHECK 约束实现
--
-- 6. 外键：需要 PRAGMA foreign_keys = ON;
--
-- 7. 全文搜索：可以使用 FTS5 虚拟表（单独创建）
--
-- 8. 索引：支持普通索引，不支持 FULLTEXT
--
-- 9. 性能：
--    - 单用户/低并发场景性能优秀
--    - 不适合高并发写入
--    - 数据库文件建议 < 1GB
--
-- 10. 维护：
--    - VACUUM; -- 清理碎片
--    - ANALYZE; -- 更新统计信息
--    - PRAGMA optimize; -- 自动优化
--
-- ========================================
-- 朋友圈功能表 (v3.5.0)
-- ========================================

-- 朋友圈个人资料表
CREATE TABLE IF NOT EXISTS social_feed_profile (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cover_image TEXT,
  avatar TEXT,
  nickname TEXT NOT NULL DEFAULT '朋友圈',
  signature TEXT,
  custom_copyright TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认数据
INSERT OR IGNORE INTO social_feed_profile (id, nickname, signature)
VALUES (1, '朋友圈', '分享生活，记录美好时刻');

-- 朋友圈动态内容表
CREATE TABLE IF NOT EXISTS social_feed_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT,
  images TEXT,
  video TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_pinned INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_feed_posts_is_published ON social_feed_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_social_feed_posts_is_pinned ON social_feed_posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_social_feed_posts_created_at ON social_feed_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_social_feed_posts_sort_order ON social_feed_posts(sort_order);

-- ========================================
-- 页面访问统计表 (page_visits) - v3.7.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS page_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_type VARCHAR(50) NOT NULL, -- 页面类型：home, social-feed, notes, navigation, galleries, services, messages, docs
  page_path VARCHAR(500) DEFAULT NULL, -- 具体页面路径
  ip_address VARCHAR(45) NOT NULL, -- IP地址（支持IPv6）
  user_agent TEXT DEFAULT NULL, -- 浏览器User-Agent
  referer VARCHAR(500) DEFAULT NULL, -- 来源页面
  visit_date DATE NOT NULL, -- 访问日期（用于按日统计）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 创建时间
);

CREATE INDEX IF NOT EXISTS idx_page_visits_page_type ON page_visits(page_type);
CREATE INDEX IF NOT EXISTS idx_page_visits_visit_date ON page_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_page_visits_ip_address ON page_visits(ip_address);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_type_date ON page_visits(page_type, visit_date);

-- 添加朋友圈相关设置
INSERT OR IGNORE INTO settings (setting_key, setting_value, type, description)
VALUES
('enableSocialFeedPage', 'true', 'boolean', '启用朋友圈页面访问'),
('socialFeedThemeEnabled', 'false', 'boolean', '启用朋友圈主题模式（首页自动跳转）'),
('socialFeedAllowSEO', 'false', 'boolean', '朋友圈页面允许搜索引擎抓取');

-- ========================================
-- 页面文本配置表 (page_texts) - v3.9.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS page_texts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_key TEXT NOT NULL UNIQUE, -- 页面标识（navigation/services/notes/note/galleries/messages/promo/socialFeed/docs）
  title TEXT DEFAULT '', -- 页面标题
  description TEXT DEFAULT '', -- 页面描述
  browser_title TEXT DEFAULT '', -- 浏览器标签标题
  browser_subtitle TEXT DEFAULT '', -- 浏览器标签副标题
  usage_title TEXT DEFAULT '', -- 使用说明标题（仅docs页面使用）
  usage_content TEXT, -- 使用说明内容（仅docs页面使用）
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_texts_page_key ON page_texts(page_key);

-- 初始化页面文本配置数据
INSERT OR IGNORE INTO page_texts (page_key, title, description, browser_title, browser_subtitle) VALUES
('navigation', '导航列表', '探索精选的网站导航', '导航列表', ''),
('services', '服务业务', '为您提供专业的服务解决方案', '服务业务', ''),
('notes', '笔记列表', '探索所有已发布的笔记内容', '全部笔记', ''),
('note', '', '', '笔记详情', ''),
('galleries', '图库列表', '探索精彩的图片合集', '图库列表', ''),
('messages', '联系我们', '有任何问题都可以通过这里进行提交你的想法！', '留言板', ''),
('promo', '', '', '官网首页', ''),
('socialFeed', '', '', '朋友圈', ''),
('docs', '文档中心', '浏览所有可用的 Markdown 文档，点击查看详情', '文档中心', '');

-- 初始化docs页面的使用说明
UPDATE page_texts SET
  usage_title = '使用说明',
  usage_content = '将 Markdown 文件放入 public/markdown 目录
通过 /docs/文件名 访问文档
支持标准 Markdown 语法、GFM 扩展和 HTML 标签'
WHERE page_key = 'docs';

-- page_texts 表更新触发器
CREATE TRIGGER IF NOT EXISTS update_page_texts_timestamp
AFTER UPDATE ON page_texts
FOR EACH ROW
BEGIN
  UPDATE page_texts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ========================================
-- 版本更新历史
-- ========================================
-- v3.9.0 (2025-12-16): 新增页面文本配置表
--   - 新增 page_texts 表：独立存储页面文本配置
--   - 支持页面标题、描述、浏览器标签标题/副标题
--   - 支持文档中心使用说明配置
--   - 从 settings 表的 pageTexts JSON 迁移到独立表
-- v3.8.0 (2025-12-16): 网站导航展示类型改为三选项
--   - 将 is_frontend_visible 布尔值改为 display_type 三选项
--   - 支持前台展示(frontend)、后台展示(backend)、前后台都展示(both)
--   - 移除 is_dashboard_visible 字段（后台展示的导航自动显示在仪表盘）
-- v3.7.0 (2025-12-15): 新增页面访问统计功能
--   - 新增 page_visits 表：页面访问记录（IP、页面类型、访问时间等）
--   - 支持访问趋势统计（日/周/月，可按页面类型筛选）
--   - 支持模块数据统计卡片（数量+IP访问量）
--   - 支持IP访问排行榜（TOP5-TOP20）
--   - 仪表盘可视化展示访问数据
-- v3.5.0 (2025-12-01): 新增朋友圈功能
--   - 新增 social_feed_profile 表：朋友圈个人资料（封面图、头像、昵称、个性签名）
--   - 新增 social_feed_posts 表：朋友圈动态内容（文本、图片、点赞、评论）
--   - 新增 enableSocialFeedPage 设置：启用朋友圈页面访问
--   - 新增 socialFeedThemeEnabled 设置：启用朋友圈主题模式（首页自动跳转）
--   - 新增 socialFeedAllowSEO 设置：朋友圈页面SEO控制
--   - 官网主题模式与朋友圈主题模式互斥，不能同时开启
--   - 文件上传路径：uploads/social-feed/
-- v3.3.0 (2025-11-29): 新增官网主题功能
--   - 新增 promoThemeEnabled 设置：官网主题模式开关
--   - 新增 promoSettings 设置：官网主题完整配置（JSON格式）
--   - 支持中英文双语模式切换
--   - 支持Logo、导航、Hero、About、Services、Team、Partners、Contact、Footer等区域配置
--   - 开启官网主题模式后，首页自动跳转到 /promo 页面
--   - 双语模式开启时，显示语言切换悬浮球（CN/EN）
--   - 文件上传路径：uploads/official/
-- v3.2.0 (2025-11-26): 新增图库功能和服务业务功能
-- v3.1.0 (2025-11-24): SQLite 版本初始化，包含性能优化索引
-- ========================================

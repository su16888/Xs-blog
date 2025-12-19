-- ========================================
-- Xs-blog个人主页系统 - PostgreSQL 数据库初始化脚本
-- Personal Homepage System - PostgreSQL Database Schema
-- Developer: arran
-- ========================================
-- 版本: 3.9.0
-- 创建日期: 2025-10-31
-- 更新日期: 2025-12-19
-- 数据库: PostgreSQL 12+
-- 字符集: UTF-8
-- ========================================
-- 更新日志:
-- v3.8.0 (2025-12-16): 网站导航展示类型改为三选项（前台/后台/前后台），移除后台首页显示字段
-- v3.7.0 (2025-12-15): 新增页面访问统计功能 - 支持仪表盘访问趋势、模块统计、IP排行
-- v3.5.0 (2025-12-01): 新增朋友圈功能 - 支持动态发布、图片展示、个人资料设置，官网主题与朋友圈主题模式互斥
-- v3.4.0 (2025-11-29): 新增页面访问控制功能 - 支持/user、/blog、/promo页面访问权限控制
-- v3.3.0 (2025-11-25): 新增服务业务功能 - 支持服务展示、分类管理、规格配置
-- v3.2.0 (2025-11-25): 新增图库功能 - 支持图册分类、图片管理、密码保护、拖拽排序
-- v3.1.0 (2025-11-24): 性能优化 - 新增组合索引提升查询性能80%+
-- v3.0.5 (2025-11-19): 新增网站导航后台首页显示功能，支持在后台首页展示常用导航（最多6个）
-- v3.0.4 (2025-11-19): 新增笔记来源类型功能，支持原创/转载标识和文章来源信息
-- v1.0.3 (2024-11-10): 新增笔记网盘资源功能，支持多网盘管理和轮播展示
-- v1.0.2 (2024-11-10): 新增笔记列表展示控制功能（show_in_list字段）
-- v1.0.0 (2024-11-10): 新增导航分类管理系统，支持分类展示和推荐功能
-- v0.9.0 (2025-11-17): 社交链接功能增强
-- v0.8.0 (2025-11-16): 新增笔记摘要和密码保护功能
-- v0.7.0 (2025-11-15): 新增笔记独立页面功能，支持页面/窗口展示模式切换
-- v0.6.0 (2024-11-07): 待办事项新增时间点记录功能，支持工作日志管理
-- v0.5.0 (2024-11-07): 待办事项新增项目进度管理功能（进度、优先级、状态、工时等）
-- v2.4.0 (2024-11-07): 前端配置改为通过后端API动态获取，移除config.js
-- v2.3.0 (2024-11-07): 后台路径配置移至后端，提升安全性
-- v0.1.0 (2024-11-05): 新增留言系统，支持分类、验证码、IP频率限制
-- v0.0.1 (2025-11-04): 重构标签和分类系统，优化数据结构
-- v1.1.0 (2025-11-03): 新增便签分类功能、完善待办事项提醒功能
-- v1.0.0 (2025-10-31): 初始版本 - 基础功能
-- ========================================

-- 创建数据库（在 psql 中执行，或通过管理工具创建）
-- CREATE DATABASE xsblog WITH ENCODING 'UTF8' LC_COLLATE='zh_CN.UTF-8' LC_CTYPE='zh_CN.UTF-8';

-- 连接到数据库后执行以下脚本
-- \c xsblog

-- 创建自定义类型
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- 1. 用户表 (users)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'user',
  status user_status DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.username IS '用户名';
COMMENT ON COLUMN users.email IS '邮箱';
COMMENT ON COLUMN users.password IS '密码（bcrypt加密）';
COMMENT ON COLUMN users.role IS '角色';
COMMENT ON COLUMN users.status IS '状态';

-- ========================================
-- 2. 个人资料表 (profile)
-- ========================================
CREATE TABLE IF NOT EXISTS profile (
  id SERIAL PRIMARY KEY,
  avatar VARCHAR(500),
  name VARCHAR(100),
  title VARCHAR(200),
  bio TEXT,
  location VARCHAR(200),
  website VARCHAR(500),
  website_title VARCHAR(200),
  company VARCHAR(200),
  background_image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_profile_updated_at ON profile;
CREATE TRIGGER update_profile_updated_at BEFORE UPDATE ON profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE profile IS '个人资料表';
COMMENT ON COLUMN profile.avatar IS '头像路径';
COMMENT ON COLUMN profile.name IS '显示名称';
COMMENT ON COLUMN profile.title IS '标题';
COMMENT ON COLUMN profile.bio IS '个人简介';
COMMENT ON COLUMN profile.location IS '所在地';
COMMENT ON COLUMN profile.website IS '个人网站';
COMMENT ON COLUMN profile.website_title IS '网站标题';
COMMENT ON COLUMN profile.company IS '公司';
COMMENT ON COLUMN profile.background_image IS '背景图片';

-- ========================================
-- 3. 社交链接表 (social_links)
-- ========================================
CREATE TABLE IF NOT EXISTS social_links (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  account VARCHAR(200) NOT NULL,
  link VARCHAR(500),
  icon VARCHAR(500),
  qrcode VARCHAR(500),
  is_visible BOOLEAN DEFAULT TRUE,
  show_in_profile SMALLINT DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_links_sort_order ON social_links(sort_order);
CREATE INDEX IF NOT EXISTS idx_social_links_is_visible ON social_links(is_visible);

DROP TRIGGER IF EXISTS update_social_links_updated_at ON social_links;
CREATE TRIGGER update_social_links_updated_at BEFORE UPDATE ON social_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE social_links IS '社交链接表';
COMMENT ON COLUMN social_links.platform IS '平台名称 (如: GitHub, Twitter, Email)';
COMMENT ON COLUMN social_links.account IS '账号名称';
COMMENT ON COLUMN social_links.link IS '链接地址';
COMMENT ON COLUMN social_links.icon IS '图标名称';
COMMENT ON COLUMN social_links.qrcode IS '二维码图片路径';
COMMENT ON COLUMN social_links.is_visible IS '是否可见';
COMMENT ON COLUMN social_links.show_in_profile IS '是否在个人资料卡片中显示（最多3个）';
COMMENT ON COLUMN social_links.sort_order IS '排序（数字越小越靠前）';

-- ========================================
-- 4. 导航分类表 (navigation_categories) - v3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS navigation_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nav_categories_sort_order ON navigation_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_nav_categories_is_visible ON navigation_categories(is_visible);

DROP TRIGGER IF EXISTS update_navigation_categories_updated_at ON navigation_categories;
CREATE TRIGGER update_navigation_categories_updated_at BEFORE UPDATE ON navigation_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE navigation_categories IS '导航分类表';
COMMENT ON COLUMN navigation_categories.name IS '分类名称';
COMMENT ON COLUMN navigation_categories.description IS '分类描述';
COMMENT ON COLUMN navigation_categories.icon IS '分类图标';
COMMENT ON COLUMN navigation_categories.sort_order IS '排序（数字越小越靠前）';
COMMENT ON COLUMN navigation_categories.is_visible IS '是否可见';

-- ========================================
-- 5. 网站导航表 (sites)
-- ========================================
DO $$ BEGIN
  CREATE TYPE display_type_enum AS ENUM ('frontend', 'backend', 'both');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  link VARCHAR(255) NOT NULL,
  description TEXT,
  logo VARCHAR(255),
  category VARCHAR(50),
  category_id INTEGER DEFAULT NULL REFERENCES navigation_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  display_type display_type_enum DEFAULT 'both',
  is_recommended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category);
CREATE INDEX IF NOT EXISTS idx_sites_category_id ON sites(category_id);
CREATE INDEX IF NOT EXISTS idx_sites_sort_order ON sites(sort_order);
CREATE INDEX IF NOT EXISTS idx_sites_is_visible ON sites(is_visible);
CREATE INDEX IF NOT EXISTS idx_sites_display_type ON sites(display_type);
CREATE INDEX IF NOT EXISTS idx_sites_is_recommended ON sites(is_recommended);

DROP TRIGGER IF EXISTS update_sites_updated_at ON sites;
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE sites IS '网站导航表';
COMMENT ON COLUMN sites.name IS '网站名称';
COMMENT ON COLUMN sites.link IS '网站地址';
COMMENT ON COLUMN sites.description IS '网站描述';
COMMENT ON COLUMN sites.logo IS '网站Logo路径';
COMMENT ON COLUMN sites.category IS '分类（保留用于兼容）';
COMMENT ON COLUMN sites.category_id IS '分类ID（关联navigation_categories表）';
COMMENT ON COLUMN sites.sort_order IS '排序（数字越小越靠前）';
COMMENT ON COLUMN sites.is_visible IS '是否在后台可见';
COMMENT ON COLUMN sites.display_type IS '展示位置：frontend-前台, backend-后台, both-前后台都展示';
COMMENT ON COLUMN sites.is_recommended IS '是否推荐';

-- ========================================
-- 6. 分类表 (categories) - v2.0新增
-- ========================================
DO $$ BEGIN
  CREATE TYPE category_type_enum AS ENUM ('note', 'sticky_note', 'tag');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type category_type_enum NOT NULL DEFAULT 'note',
  description TEXT,
  color VARCHAR(20) DEFAULT '#6366f1',
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  parent_id INTEGER DEFAULT NULL REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, type)
);

CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE categories IS '统一分类管理表';
COMMENT ON COLUMN categories.name IS '分类名称';
COMMENT ON COLUMN categories.type IS '分类类型';
COMMENT ON COLUMN categories.description IS '分类描述';
COMMENT ON COLUMN categories.color IS '分类颜色';
COMMENT ON COLUMN categories.icon IS '分类图标';
COMMENT ON COLUMN categories.sort_order IS '排序顺序';
COMMENT ON COLUMN categories.parent_id IS '父分类ID（支持二级分类）';

-- ========================================
-- 7. 笔记表 (notes) - v2.0更新
-- ========================================
DO $$ BEGIN
  CREATE TYPE media_type_enum AS ENUM ('none', 'image', 'video', 'music');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE source_type_enum AS ENUM ('none', 'original', 'reprint');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE display_mode_enum AS ENUM ('modal', 'page');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT DEFAULT NULL,
  category VARCHAR(100),
  category_id INTEGER DEFAULT NULL REFERENCES categories(id) ON DELETE SET NULL,
  tags VARCHAR(500),
  is_published BOOLEAN DEFAULT TRUE,
  show_in_list BOOLEAN DEFAULT TRUE,
  is_pinned BOOLEAN DEFAULT FALSE,
  password VARCHAR(255) DEFAULT NULL,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  media_type media_type_enum DEFAULT 'none',
  media_urls JSONB,
  external_link VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  cover_image VARCHAR(500) DEFAULT NULL,
  source_type source_type_enum DEFAULT 'none' NOT NULL,
  source_url VARCHAR(500) DEFAULT NULL,
  source_text TEXT DEFAULT NULL,
  display_mode display_mode_enum DEFAULT 'modal' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes(category_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_published ON notes(is_published);
CREATE INDEX IF NOT EXISTS idx_notes_show_in_list ON notes(show_in_list);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_published_at ON notes(published_at);
CREATE INDEX IF NOT EXISTS idx_notes_sort_order ON notes(sort_order);
CREATE INDEX IF NOT EXISTS idx_notes_source_type ON notes(source_type);
CREATE INDEX IF NOT EXISTS idx_notes_display_mode ON notes(display_mode);

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE notes IS '笔记表';
COMMENT ON COLUMN notes.title IS '标题';
COMMENT ON COLUMN notes.content IS '内容（支持Markdown）';
COMMENT ON COLUMN notes.summary IS '笔记摘要（用于列表展示，为空则自动截取正文前150字）';
COMMENT ON COLUMN notes.category IS '分类（保留用于兼容）';
COMMENT ON COLUMN notes.category_id IS '分类ID（关联categories表）';
COMMENT ON COLUMN notes.tags IS '标签（逗号分隔，保留用于兼容）';
COMMENT ON COLUMN notes.is_published IS '是否发布到前端';
COMMENT ON COLUMN notes.show_in_list IS '是否在列表中展示（FALSE时只能通过URL直接访问）';
COMMENT ON COLUMN notes.is_pinned IS '是否置顶';
COMMENT ON COLUMN notes.password IS '访问密码（为空表示无需密码）';
COMMENT ON COLUMN notes.published_at IS '发布时间';
COMMENT ON COLUMN notes.media_type IS '媒体类型';
COMMENT ON COLUMN notes.media_urls IS '媒体文件URLs（JSON数组）';
COMMENT ON COLUMN notes.external_link IS '外部链接';
COMMENT ON COLUMN notes.sort_order IS '排序（数字越小越靠前）';
COMMENT ON COLUMN notes.cover_image IS '笔记封面图URL';
COMMENT ON COLUMN notes.source_type IS '来源类型：none-不展示, original-原创, reprint-转载';
COMMENT ON COLUMN notes.source_url IS '转载来源URL';
COMMENT ON COLUMN notes.source_text IS '文章来源文本（当source_url为空时使用）';
COMMENT ON COLUMN notes.display_mode IS '展示模式：modal-窗口展示, page-页面展示';

-- ========================================
-- 7.1 笔记网盘资源表 (note_disks) - v1.0.3新增
-- ========================================
CREATE TABLE IF NOT EXISTS note_disks (
  id SERIAL PRIMARY KEY,
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  disk_name VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  file_size VARCHAR(50),
  extract_code VARCHAR(50),
  download_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_note_disks_note_id ON note_disks(note_id);
CREATE INDEX IF NOT EXISTS idx_note_disks_sort_order ON note_disks(sort_order);

DROP TRIGGER IF EXISTS update_note_disks_updated_at ON note_disks;
CREATE TRIGGER update_note_disks_updated_at BEFORE UPDATE ON note_disks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE note_disks IS '笔记网盘资源表';
COMMENT ON COLUMN note_disks.note_id IS '笔记ID';
COMMENT ON COLUMN note_disks.disk_name IS '网盘名称（百度网盘、阿里云盘等）';
COMMENT ON COLUMN note_disks.title IS '资源标题';
COMMENT ON COLUMN note_disks.file_size IS '文件大小';
COMMENT ON COLUMN note_disks.extract_code IS '提取码';
COMMENT ON COLUMN note_disks.download_url IS '下载链接';
COMMENT ON COLUMN note_disks.sort_order IS '排序';

-- ========================================
-- 8. 便签表 (sticky_notes) - v2.0更新
-- ========================================
CREATE TABLE IF NOT EXISTS sticky_notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  category_id INTEGER DEFAULT NULL REFERENCES categories(id) ON DELETE SET NULL,
  color VARCHAR(20) DEFAULT '#fef68a',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sticky_notes_category ON sticky_notes(category);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_category_id ON sticky_notes(category_id);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_sort_order ON sticky_notes(sort_order);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_created_at ON sticky_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_updated_at ON sticky_notes(updated_at);

DROP TRIGGER IF EXISTS update_sticky_notes_updated_at ON sticky_notes;
CREATE TRIGGER update_sticky_notes_updated_at BEFORE UPDATE ON sticky_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE sticky_notes IS '便签表（仅后台可见）';
COMMENT ON COLUMN sticky_notes.title IS '便签标题';
COMMENT ON COLUMN sticky_notes.content IS '便签内容';
COMMENT ON COLUMN sticky_notes.category IS '便签分类（保留用于兼容）';
COMMENT ON COLUMN sticky_notes.category_id IS '分类ID（关联categories表）';
COMMENT ON COLUMN sticky_notes.color IS '便签颜色（十六进制）';
COMMENT ON COLUMN sticky_notes.sort_order IS '排序（数字越小越靠前）';

-- ========================================
-- 9. 标签表 (tags) - v2.0更新
-- ========================================
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  category_id INTEGER DEFAULT NULL REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3b82f6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_category_id ON tags(category_id);
CREATE INDEX IF NOT EXISTS idx_tags_sort_order ON tags(sort_order);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tags IS '标签表（后台管理）';
COMMENT ON COLUMN tags.name IS '标签名称';
COMMENT ON COLUMN tags.category IS '标签分类（保留用于兼容）';
COMMENT ON COLUMN tags.category_id IS '标签分类ID（关联categories表）';
COMMENT ON COLUMN tags.description IS '标签描述';
COMMENT ON COLUMN tags.color IS '标签颜色';
COMMENT ON COLUMN tags.sort_order IS '排序顺序';

-- ========================================
-- 10. 笔记-标签关联表 (note_tags) - v2.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS note_tags (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);

COMMENT ON TABLE note_tags IS '笔记标签多对多关联表';
COMMENT ON COLUMN note_tags.note_id IS '笔记ID';
COMMENT ON COLUMN note_tags.tag_id IS '标签ID';
COMMENT ON COLUMN note_tags.created_at IS '关联创建时间';

-- ========================================
-- 11. 待办事项表 (todos) - v2.5 更新：新增进度管理功能
-- ========================================
DO $$ BEGIN
  CREATE TYPE priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE todo_status_enum AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_time TIMESTAMP,
  reminder_dismissed BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  progress INTEGER DEFAULT 0,
  priority priority_enum DEFAULT 'medium',
  status todo_status_enum DEFAULT 'todo',
  category VARCHAR(50) DEFAULT NULL,
  estimated_hours DECIMAL(5,2) DEFAULT NULL,
  actual_hours DECIMAL(5,2) DEFAULT NULL,
  parent_id INTEGER DEFAULT NULL REFERENCES todos(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  start_date TIMESTAMP DEFAULT NULL,
  completed_at TIMESTAMP DEFAULT NULL,
  time_logs JSONB DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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

DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE todos IS '待办事项表（仅后台可见）- v2.5支持项目进度管理';
COMMENT ON COLUMN todos.title IS '待办事项标题';
COMMENT ON COLUMN todos.description IS '详细描述';
COMMENT ON COLUMN todos.due_date IS '截止日期';
COMMENT ON COLUMN todos.reminder_enabled IS '是否启用提醒';
COMMENT ON COLUMN todos.reminder_time IS '提醒时间';
COMMENT ON COLUMN todos.reminder_dismissed IS '是否已忽略提醒';
COMMENT ON COLUMN todos.is_completed IS '是否已完成';
COMMENT ON COLUMN todos.progress IS '完成进度 (0-100)';
COMMENT ON COLUMN todos.priority IS '优先级';
COMMENT ON COLUMN todos.status IS '任务状态';
COMMENT ON COLUMN todos.category IS '分类/标签';
COMMENT ON COLUMN todos.estimated_hours IS '预计工时（小时）';
COMMENT ON COLUMN todos.actual_hours IS '实际工时（小时）';
COMMENT ON COLUMN todos.parent_id IS '父任务ID（用于子任务）';
COMMENT ON COLUMN todos.order_index IS '排序索引';
COMMENT ON COLUMN todos.start_date IS '开始日期';
COMMENT ON COLUMN todos.completed_at IS '完成时间';
COMMENT ON COLUMN todos.time_logs IS '时间点记录（JSON数组，存储历史时间记录）';

-- ========================================
-- 11.1 待办事项分类表 (todo_categories) - v2.5 新增
-- ========================================
CREATE TABLE IF NOT EXISTS todo_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT '#3B82F6',
  icon VARCHAR(50) DEFAULT NULL,
  description VARCHAR(200) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_todo_categories_updated_at ON todo_categories;
CREATE TRIGGER update_todo_categories_updated_at BEFORE UPDATE ON todo_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE todo_categories IS '待办事项分类表';
COMMENT ON COLUMN todo_categories.name IS '分类名称';
COMMENT ON COLUMN todo_categories.color IS '分类颜色';
COMMENT ON COLUMN todo_categories.icon IS '图标名称';
COMMENT ON COLUMN todo_categories.description IS '描述';

-- ========================================
-- 11.2 待办事项时间记录表 (todo_time_logs) - v2.6 新增
-- ========================================
CREATE TABLE IF NOT EXISTS todo_time_logs (
  id SERIAL PRIMARY KEY,
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  duration DECIMAL(5,2),
  description TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_todo_time_logs_todo_id ON todo_time_logs(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_time_logs_log_date ON todo_time_logs(log_date);

DROP TRIGGER IF EXISTS update_todo_time_logs_updated_at ON todo_time_logs;
CREATE TRIGGER update_todo_time_logs_updated_at BEFORE UPDATE ON todo_time_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE todo_time_logs IS '待办事项时间记录表';
COMMENT ON COLUMN todo_time_logs.todo_id IS '待办事项ID';
COMMENT ON COLUMN todo_time_logs.log_date IS '记录日期';
COMMENT ON COLUMN todo_time_logs.start_time IS '开始时间';
COMMENT ON COLUMN todo_time_logs.end_time IS '结束时间';
COMMENT ON COLUMN todo_time_logs.duration IS '持续时长（小时）';
COMMENT ON COLUMN todo_time_logs.description IS '工作内容描述';

-- ========================================
-- 12. 设置表 (settings)
-- ========================================
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  type VARCHAR(50) DEFAULT 'string',
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settings_setting_key ON settings(setting_key);

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE settings IS '系统设置表';
COMMENT ON COLUMN settings.setting_key IS '设置键';
COMMENT ON COLUMN settings.setting_value IS '设置值';
COMMENT ON COLUMN settings.type IS '值类型';
COMMENT ON COLUMN settings.description IS '描述';

-- ========================================
-- 13. 留言分类表 (message_categories)
-- ========================================
CREATE TABLE IF NOT EXISTS message_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_categories_sort_order ON message_categories(sort_order);

DROP TRIGGER IF EXISTS update_message_categories_updated_at ON message_categories;
CREATE TRIGGER update_message_categories_updated_at BEFORE UPDATE ON message_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE message_categories IS '留言分类表';
COMMENT ON COLUMN message_categories.name IS '分类名称';
COMMENT ON COLUMN message_categories.sort_order IS '排序顺序';

-- ========================================
-- 14. 留言表 (messages)
-- ========================================
DO $$ BEGIN
  CREATE TYPE message_status_enum AS ENUM ('pending', 'read', 'replied');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact VARCHAR(200) NOT NULL,
  category_id INTEGER DEFAULT NULL REFERENCES message_categories(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments TEXT,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT,
  status message_status_enum DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_category_id ON messages(category_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE messages IS '留言表';
COMMENT ON COLUMN messages.name IS '用户称呼';
COMMENT ON COLUMN messages.contact IS '用户联系方式';
COMMENT ON COLUMN messages.category_id IS '分类ID';
COMMENT ON COLUMN messages.content IS '留言内容';
COMMENT ON COLUMN messages.attachments IS '附件路径（JSON数组）';
COMMENT ON COLUMN messages.ip_address IS '提交者IP地址';
COMMENT ON COLUMN messages.user_agent IS '用户代理信息';
COMMENT ON COLUMN messages.status IS '状态：待处理、已读、已回复';

-- ========================================
-- 15. 留言IP记录表 (message_ip_records)
-- ========================================
CREATE TABLE IF NOT EXISTS message_ip_records (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  last_submit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_ip_records_last_submit_at ON message_ip_records(last_submit_at);

COMMENT ON TABLE message_ip_records IS '留言IP记录表（用于频率限制）';
COMMENT ON COLUMN message_ip_records.ip_address IS 'IP地址';
COMMENT ON COLUMN message_ip_records.last_submit_at IS '最后提交时间';

-- ========================================
-- 16. 图册分类表 (gallery_categories) - v3.2.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS gallery_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gallery_categories_sort_order ON gallery_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_categories_is_visible ON gallery_categories(is_visible);

DROP TRIGGER IF EXISTS update_gallery_categories_updated_at ON gallery_categories;
CREATE TRIGGER update_gallery_categories_updated_at BEFORE UPDATE ON gallery_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE gallery_categories IS '图册分类表';
COMMENT ON COLUMN gallery_categories.name IS '分类名称';
COMMENT ON COLUMN gallery_categories.description IS '分类描述';
COMMENT ON COLUMN gallery_categories.icon IS '分类图标';
COMMENT ON COLUMN gallery_categories.sort_order IS '排序（数字越小越靠前）';
COMMENT ON COLUMN gallery_categories.is_visible IS '是否可见';

-- ========================================
-- 17. 图册表 (galleries) - v3.2.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS galleries (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES gallery_categories(id) ON DELETE SET NULL,
  password VARCHAR(100),
  cover_image VARCHAR(500),
  is_visible BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  image_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_galleries_category_id ON galleries(category_id);
CREATE INDEX IF NOT EXISTS idx_galleries_is_visible ON galleries(is_visible);
CREATE INDEX IF NOT EXISTS idx_galleries_sort_order ON galleries(sort_order);
CREATE INDEX IF NOT EXISTS idx_galleries_list_order ON galleries(is_visible, sort_order DESC, created_at DESC);

DROP TRIGGER IF EXISTS update_galleries_updated_at ON galleries;
CREATE TRIGGER update_galleries_updated_at BEFORE UPDATE ON galleries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE galleries IS '图册表';
COMMENT ON COLUMN galleries.title IS '图册标题';
COMMENT ON COLUMN galleries.description IS '图册描述';
COMMENT ON COLUMN galleries.category_id IS '分类ID';
COMMENT ON COLUMN galleries.password IS '访问密码（bcrypt加密，为空表示无密码）';
COMMENT ON COLUMN galleries.cover_image IS '封面图片路径（第一张图片）';
COMMENT ON COLUMN galleries.is_visible IS '是否在前台可见';
COMMENT ON COLUMN galleries.sort_order IS '排序（数字越小越靠前）';
COMMENT ON COLUMN galleries.image_count IS '图片数量';

-- ========================================
-- 18. 图册图片表 (gallery_images) - v3.2.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS gallery_images (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  path VARCHAR(500) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  size INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery_id ON gallery_images(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_sort_order ON gallery_images(sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery_order ON gallery_images(gallery_id, sort_order ASC);

DROP TRIGGER IF EXISTS update_gallery_images_updated_at ON gallery_images;
CREATE TRIGGER update_gallery_images_updated_at BEFORE UPDATE ON gallery_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE gallery_images IS '图册图片表';
COMMENT ON COLUMN gallery_images.gallery_id IS '图册ID';
COMMENT ON COLUMN gallery_images.filename IS '文件名';
COMMENT ON COLUMN gallery_images.path IS '文件路径';
COMMENT ON COLUMN gallery_images.sort_order IS '排序（数字越小越靠前，第一张为封面）';
COMMENT ON COLUMN gallery_images.size IS '文件大小（字节）';

-- ========================================
-- 19. 服务分类表 (service_categories) - v2.1新增
-- ========================================
CREATE TABLE IF NOT EXISTS service_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT DEFAULT NULL,
  icon VARCHAR(255) DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_categories_sort_order ON service_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_service_categories_is_visible ON service_categories(is_visible);

DROP TRIGGER IF EXISTS update_service_categories_updated_at ON service_categories;
CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE service_categories IS '服务分类表';
COMMENT ON COLUMN service_categories.name IS '分类名称';
COMMENT ON COLUMN service_categories.description IS '分类描述';
COMMENT ON COLUMN service_categories.icon IS '分类图标';
COMMENT ON COLUMN service_categories.sort_order IS '排序（数字越小越靠前）';
COMMENT ON COLUMN service_categories.is_visible IS '是否可见';

-- ========================================
-- 20. 服务表 (services) - v2.1新增
-- ========================================
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  content TEXT DEFAULT NULL,
  cover_image VARCHAR(500) DEFAULT NULL,
  price VARCHAR(100) DEFAULT NULL,
  category_id INTEGER DEFAULT NULL REFERENCES service_categories(id) ON DELETE SET NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  is_recommended BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  show_order_button BOOLEAN DEFAULT FALSE,
  order_button_text VARCHAR(50) DEFAULT '立即下单',
  order_button_url VARCHAR(500) DEFAULT NULL,
  spec_title VARCHAR(50) DEFAULT '服务规格',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_is_visible ON services(is_visible);
CREATE INDEX IF NOT EXISTS idx_services_is_recommended ON services(is_recommended);
CREATE INDEX IF NOT EXISTS idx_services_sort_order ON services(sort_order);
CREATE INDEX IF NOT EXISTS idx_services_list_order ON services(is_recommended DESC, sort_order ASC);

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE services IS '服务表';
COMMENT ON COLUMN services.name IS '服务名称';
COMMENT ON COLUMN services.description IS '服务简述';
COMMENT ON COLUMN services.content IS '服务详情介绍（Markdown格式）';
COMMENT ON COLUMN services.cover_image IS '服务封面图（1:1正方形）';
COMMENT ON COLUMN services.price IS '价格（文本格式，可包含非数字）';
COMMENT ON COLUMN services.category_id IS '分类ID（关联service_categories表）';
COMMENT ON COLUMN services.is_visible IS '是否在前台显示';
COMMENT ON COLUMN services.is_recommended IS '是否推荐服务';
COMMENT ON COLUMN services.sort_order IS '排序（数字越小越靠前）';
COMMENT ON COLUMN services.show_order_button IS '是否显示立即下单按钮';
COMMENT ON COLUMN services.order_button_text IS '下单按钮文字';
COMMENT ON COLUMN services.order_button_url IS '下单按钮跳转URL';
COMMENT ON COLUMN services.spec_title IS '服务规格标题（可自定义）';

-- ========================================
-- 21. 服务规格表 (service_specifications) - v2.1新增
-- ========================================
CREATE TABLE IF NOT EXISTS service_specifications (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  spec_name VARCHAR(100) NOT NULL,
  spec_value VARCHAR(500) DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_specs_service_id ON service_specifications(service_id);
CREATE INDEX IF NOT EXISTS idx_service_specs_sort_order ON service_specifications(sort_order);

DROP TRIGGER IF EXISTS update_service_specifications_updated_at ON service_specifications;
CREATE TRIGGER update_service_specifications_updated_at BEFORE UPDATE ON service_specifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE service_specifications IS '服务规格表';
COMMENT ON COLUMN service_specifications.service_id IS '所属服务ID（关联services表）';
COMMENT ON COLUMN service_specifications.spec_name IS '规格名称';
COMMENT ON COLUMN service_specifications.spec_value IS '规格值';
COMMENT ON COLUMN service_specifications.sort_order IS '排序（数字越小越靠前）';

-- ========================================
-- 22. 官网主题基础配置表 (promo_config) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT,
  config_value_en TEXT,
  config_type VARCHAR(50) DEFAULT 'string',
  description VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_config_key ON promo_config(config_key);
CREATE INDEX IF NOT EXISTS idx_promo_config_sort_order ON promo_config(sort_order);

DROP TRIGGER IF EXISTS update_promo_config_updated_at ON promo_config;
CREATE TRIGGER update_promo_config_updated_at BEFORE UPDATE ON promo_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE promo_config IS '官网主题基础配置表';
COMMENT ON COLUMN promo_config.config_key IS '配置键';
COMMENT ON COLUMN promo_config.config_value IS '配置值';
COMMENT ON COLUMN promo_config.config_value_en IS '配置值（英文）';
COMMENT ON COLUMN promo_config.config_type IS '配置类型：string, text, boolean, number, image';
COMMENT ON COLUMN promo_config.description IS '配置描述';
COMMENT ON COLUMN promo_config.sort_order IS '排序';

-- ========================================
-- 23. 官网主题导航菜单表 (promo_nav_items) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_nav_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  link VARCHAR(500) NOT NULL,
  icon VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_nav_items_sort_order ON promo_nav_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_nav_items_is_visible ON promo_nav_items(is_visible);

DROP TRIGGER IF EXISTS update_promo_nav_items_updated_at ON promo_nav_items;
CREATE TRIGGER update_promo_nav_items_updated_at BEFORE UPDATE ON promo_nav_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE promo_nav_items IS '官网主题导航菜单表';
COMMENT ON COLUMN promo_nav_items.name IS '菜单名称（中文）';
COMMENT ON COLUMN promo_nav_items.name_en IS '菜单名称（英文）';
COMMENT ON COLUMN promo_nav_items.link IS '链接地址';
COMMENT ON COLUMN promo_nav_items.icon IS '图标';
COMMENT ON COLUMN promo_nav_items.sort_order IS '排序（数字越小越靠前）';
COMMENT ON COLUMN promo_nav_items.is_visible IS '是否显示';

-- ========================================
-- 24. 官网主题统计数据表 (promo_stats) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_stats (
  id SERIAL PRIMARY KEY,
  stat_value VARCHAR(100) NOT NULL,
  stat_value_en VARCHAR(100),
  stat_label VARCHAR(100) NOT NULL,
  stat_label_en VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_stats_sort_order ON promo_stats(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_stats_is_visible ON promo_stats(is_visible);

DROP TRIGGER IF EXISTS update_promo_stats_updated_at ON promo_stats;
CREATE TRIGGER update_promo_stats_updated_at BEFORE UPDATE ON promo_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE promo_stats IS '官网主题统计数据表';
COMMENT ON COLUMN promo_stats.stat_value IS '统计值（中文）';
COMMENT ON COLUMN promo_stats.stat_value_en IS '统计值（英文）';
COMMENT ON COLUMN promo_stats.stat_label IS '统计标签（中文）';
COMMENT ON COLUMN promo_stats.stat_label_en IS '统计标签（英文）';
COMMENT ON COLUMN promo_stats.sort_order IS '排序';
COMMENT ON COLUMN promo_stats.is_visible IS '是否显示';

-- ========================================
-- 25. 官网主题服务分类表 (promo_service_categories) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_service_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_service_categories_sort_order ON promo_service_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_service_categories_is_visible ON promo_service_categories(is_visible);

DROP TRIGGER IF EXISTS update_promo_service_categories_updated_at ON promo_service_categories;
CREATE TRIGGER update_promo_service_categories_updated_at BEFORE UPDATE ON promo_service_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE promo_service_categories IS '官网主题服务分类表';
COMMENT ON COLUMN promo_service_categories.name IS '分类名称（中文）';
COMMENT ON COLUMN promo_service_categories.name_en IS '分类名称（英文）';
COMMENT ON COLUMN promo_service_categories.sort_order IS '排序';
COMMENT ON COLUMN promo_service_categories.is_visible IS '是否显示';

-- ========================================
-- 26. 官网主题服务项表 (promo_services) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_services (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES promo_service_categories(id) ON DELETE SET NULL,
  image VARCHAR(500),
  title VARCHAR(200) NOT NULL,
  title_en VARCHAR(200),
  description TEXT,
  description_en TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_services_category_id ON promo_services(category_id);
CREATE INDEX IF NOT EXISTS idx_promo_services_sort_order ON promo_services(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_services_is_visible ON promo_services(is_visible);

DROP TRIGGER IF EXISTS update_promo_services_updated_at ON promo_services;
CREATE TRIGGER update_promo_services_updated_at BEFORE UPDATE ON promo_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE promo_services IS '官网主题服务项表';
COMMENT ON COLUMN promo_services.category_id IS '分类ID';
COMMENT ON COLUMN promo_services.image IS '服务图片';
COMMENT ON COLUMN promo_services.title IS '服务标题（中文）';
COMMENT ON COLUMN promo_services.title_en IS '服务标题（英文）';
COMMENT ON COLUMN promo_services.description IS '服务描述（中文）';
COMMENT ON COLUMN promo_services.description_en IS '服务描述（英文）';
COMMENT ON COLUMN promo_services.sort_order IS '排序';
COMMENT ON COLUMN promo_services.is_visible IS '是否显示';

-- ========================================
-- 27. 官网主题团队成员表 (promo_team_members) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_team_members (
  id SERIAL PRIMARY KEY,
  avatar_image VARCHAR(500),
  avatar_text VARCHAR(10),
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  role VARCHAR(100) NOT NULL,
  role_en VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_team_members_sort_order ON promo_team_members(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_team_members_is_visible ON promo_team_members(is_visible);

DROP TRIGGER IF EXISTS update_promo_team_members_updated_at ON promo_team_members;
CREATE TRIGGER update_promo_team_members_updated_at BEFORE UPDATE ON promo_team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE promo_team_members IS '官网主题团队成员表';
COMMENT ON COLUMN promo_team_members.avatar_image IS '头像图片';
COMMENT ON COLUMN promo_team_members.avatar_text IS '头像文字（如：AC）';
COMMENT ON COLUMN promo_team_members.name IS '成员姓名（中文）';
COMMENT ON COLUMN promo_team_members.name_en IS '成员姓名（英文）';
COMMENT ON COLUMN promo_team_members.role IS '职位（中文）';
COMMENT ON COLUMN promo_team_members.role_en IS '职位（英文）';
COMMENT ON COLUMN promo_team_members.sort_order IS '排序';
COMMENT ON COLUMN promo_team_members.is_visible IS '是否显示';

-- ========================================
-- 28. 官网主题合作伙伴表 (promo_partners) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_partners (
  id SERIAL PRIMARY KEY,
  image VARCHAR(500) NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  url VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_partners_sort_order ON promo_partners(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_partners_is_visible ON promo_partners(is_visible);

DROP TRIGGER IF EXISTS update_promo_partners_updated_at ON promo_partners;
CREATE TRIGGER update_promo_partners_updated_at BEFORE UPDATE ON promo_partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE promo_partners IS '官网主题合作伙伴表';
COMMENT ON COLUMN promo_partners.image IS '合作伙伴Logo';
COMMENT ON COLUMN promo_partners.name IS '合作伙伴名称（中文）';
COMMENT ON COLUMN promo_partners.name_en IS '合作伙伴名称（英文）';
COMMENT ON COLUMN promo_partners.url IS '合作伙伴网址';
COMMENT ON COLUMN promo_partners.sort_order IS '排序';
COMMENT ON COLUMN promo_partners.is_visible IS '是否显示';

-- ========================================
-- 29. 官网主题联系方式表 (promo_contact_methods) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_contact_methods (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(100) NOT NULL,
  platform_en VARCHAR(100),
  value VARCHAR(500) NOT NULL,
  icon VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_contact_methods_sort_order ON promo_contact_methods(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_contact_methods_is_visible ON promo_contact_methods(is_visible);

DROP TRIGGER IF EXISTS update_promo_contact_methods_updated_at ON promo_contact_methods;
CREATE TRIGGER update_promo_contact_methods_updated_at BEFORE UPDATE ON promo_contact_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE promo_contact_methods IS '官网主题联系方式表';
COMMENT ON COLUMN promo_contact_methods.platform IS '平台名称（中文）';
COMMENT ON COLUMN promo_contact_methods.platform_en IS '平台名称（英文）';
COMMENT ON COLUMN promo_contact_methods.value IS '联系方式值';
COMMENT ON COLUMN promo_contact_methods.icon IS '图标';
COMMENT ON COLUMN promo_contact_methods.sort_order IS '排序';
COMMENT ON COLUMN promo_contact_methods.is_visible IS '是否显示';

-- ========================================
-- 30. 官网主题底部链接分组表 (promo_footer_link_groups) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_footer_link_groups (
  id SERIAL PRIMARY KEY,
  group_title VARCHAR(100) NOT NULL,
  group_title_en VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_footer_link_groups_sort_order ON promo_footer_link_groups(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_footer_link_groups_is_visible ON promo_footer_link_groups(is_visible);

DROP TRIGGER IF EXISTS update_promo_footer_link_groups_updated_at ON promo_footer_link_groups;
CREATE TRIGGER update_promo_footer_link_groups_updated_at BEFORE UPDATE ON promo_footer_link_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE promo_footer_link_groups IS '官网主题底部链接分组表';
COMMENT ON COLUMN promo_footer_link_groups.group_title IS '分组标题（中文）';
COMMENT ON COLUMN promo_footer_link_groups.group_title_en IS '分组标题（英文）';
COMMENT ON COLUMN promo_footer_link_groups.sort_order IS '排序';
COMMENT ON COLUMN promo_footer_link_groups.is_visible IS '是否显示';

-- ========================================
-- 31. 官网主题底部链接表 (promo_footer_links) - v3.3.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS promo_footer_links (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES promo_footer_link_groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  url VARCHAR(500) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_footer_links_group_id ON promo_footer_links(group_id);
CREATE INDEX IF NOT EXISTS idx_promo_footer_links_sort_order ON promo_footer_links(sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_footer_links_is_visible ON promo_footer_links(is_visible);

DROP TRIGGER IF EXISTS update_promo_footer_links_updated_at ON promo_footer_links;
CREATE TRIGGER update_promo_footer_links_updated_at BEFORE UPDATE ON promo_footer_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE promo_footer_links IS '官网主题底部链接表';
COMMENT ON COLUMN promo_footer_links.group_id IS '分组ID';
COMMENT ON COLUMN promo_footer_links.name IS '链接名称（中文）';
COMMENT ON COLUMN promo_footer_links.name_en IS '链接名称（英文）';
COMMENT ON COLUMN promo_footer_links.url IS '链接地址';
COMMENT ON COLUMN promo_footer_links.sort_order IS '排序';
COMMENT ON COLUMN promo_footer_links.is_visible IS '是否显示';

-- ========================================
-- 32. 朋友圈个人资料表 (social_feed_profile) - v3.5.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS social_feed_profile (
  id SERIAL PRIMARY KEY,
  cover_image VARCHAR(500),
  avatar VARCHAR(500),
  nickname VARCHAR(100) NOT NULL DEFAULT '朋友圈',
  signature TEXT,
  custom_copyright VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_social_feed_profile_updated_at ON social_feed_profile;
CREATE TRIGGER update_social_feed_profile_updated_at BEFORE UPDATE ON social_feed_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE social_feed_profile IS '朋友圈个人资料表';
COMMENT ON COLUMN social_feed_profile.cover_image IS '封面图片路径';
COMMENT ON COLUMN social_feed_profile.avatar IS '头像路径';
COMMENT ON COLUMN social_feed_profile.nickname IS '昵称';
COMMENT ON COLUMN social_feed_profile.signature IS '个性签名';
COMMENT ON COLUMN social_feed_profile.custom_copyright IS '自定义版权信息';

-- ========================================
-- 33. 朋友圈动态内容表 (social_feed_posts) - v3.5.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS social_feed_posts (
  id SERIAL PRIMARY KEY,
  content TEXT,
  images TEXT,
  video TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_feed_posts_is_published ON social_feed_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_social_feed_posts_is_pinned ON social_feed_posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_social_feed_posts_created_at ON social_feed_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_social_feed_posts_sort_order ON social_feed_posts(sort_order);

DROP TRIGGER IF EXISTS update_social_feed_posts_updated_at ON social_feed_posts;
CREATE TRIGGER update_social_feed_posts_updated_at BEFORE UPDATE ON social_feed_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE social_feed_posts IS '朋友圈动态内容表';
COMMENT ON COLUMN social_feed_posts.content IS '动态内容';
COMMENT ON COLUMN social_feed_posts.images IS '图片路径（JSON数组）';
COMMENT ON COLUMN social_feed_posts.video IS '视频路径（支持第三方视频长URL）';
COMMENT ON COLUMN social_feed_posts.likes_count IS '点赞数';
COMMENT ON COLUMN social_feed_posts.comments_count IS '评论数';
COMMENT ON COLUMN social_feed_posts.is_pinned IS '是否置顶';
COMMENT ON COLUMN social_feed_posts.is_published IS '是否发布';
COMMENT ON COLUMN social_feed_posts.sort_order IS '排序顺序';

-- ========================================
-- 34. 页面访问统计表 (page_visits) - v3.7.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS page_visits (
  id SERIAL PRIMARY KEY,
  page_type VARCHAR(50) NOT NULL,
  page_path VARCHAR(500) DEFAULT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT DEFAULT NULL,
  referer VARCHAR(500) DEFAULT NULL,
  visit_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_visits_page_type ON page_visits(page_type);
CREATE INDEX IF NOT EXISTS idx_page_visits_visit_date ON page_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_page_visits_ip_address ON page_visits(ip_address);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_type_date ON page_visits(page_type, visit_date);

COMMENT ON TABLE page_visits IS '页面访问统计表';
COMMENT ON COLUMN page_visits.page_type IS '页面类型：home, social-feed, notes, navigation, galleries, services, messages, docs';
COMMENT ON COLUMN page_visits.page_path IS '具体页面路径';
COMMENT ON COLUMN page_visits.ip_address IS 'IP地址（支持IPv6）';
COMMENT ON COLUMN page_visits.user_agent IS '浏览器User-Agent';
COMMENT ON COLUMN page_visits.referer IS '来源页面';
COMMENT ON COLUMN page_visits.visit_date IS '访问日期（用于按日统计）';

-- ========================================
-- 35. 页面文本配置表 (page_texts) - v3.9.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS page_texts (
  id SERIAL PRIMARY KEY,
  page_key VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(200) DEFAULT '',
  description VARCHAR(500) DEFAULT '',
  browser_title VARCHAR(200) DEFAULT '',
  browser_subtitle VARCHAR(200) DEFAULT '',
  usage_title VARCHAR(200) DEFAULT '',
  usage_content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_texts_page_key ON page_texts(page_key);

DROP TRIGGER IF EXISTS update_page_texts_updated_at ON page_texts;
CREATE TRIGGER update_page_texts_updated_at BEFORE UPDATE ON page_texts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE page_texts IS '页面文本配置表';
COMMENT ON COLUMN page_texts.page_key IS '页面标识（navigation/services/notes/note/galleries/messages/promo/socialFeed/docs）';
COMMENT ON COLUMN page_texts.title IS '页面标题';
COMMENT ON COLUMN page_texts.description IS '页面描述';
COMMENT ON COLUMN page_texts.browser_title IS '浏览器标签标题';
COMMENT ON COLUMN page_texts.browser_subtitle IS '浏览器标签副标题';
COMMENT ON COLUMN page_texts.usage_title IS '使用说明标题（仅docs页面使用）';
COMMENT ON COLUMN page_texts.usage_content IS '使用说明内容（仅docs页面使用）';

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
) ON CONFLICT (username) DO NOTHING;

-- ========================================
-- 初始化默认设置
-- ========================================
INSERT INTO settings (setting_key, setting_value, type, description) VALUES
  ('messageIpLimitDays', '1', 'number', '留言IP提交频率限制（天），0表示不限制'),
  ('showNavigationRecommended', 'true', 'boolean', '是否显示导航推荐功能'),
  ('noteLayoutColumns', '1', 'string', '笔记列表每排显示的卡片数量（1-4），移动端最多2个'),
  ('homeContentSections', '{"section1":"notes","section2":"navigation","showInDefaultTheme":true}', 'json', '首页内容区域配置（选择展示哪些内容）'),
  ('enableUserPage', 'true', 'boolean', '启用/user页面访问（开启后可通过/user路径访问个人主页模式）'),
  ('enableBlogPage', 'true', 'boolean', '启用/blog页面访问（开启后可通过/blog路径访问博客模式）'),
  ('enablePromoPage', 'true', 'boolean', '启用/promo页面访问（开启后可通过/promo路径访问官网主题页面）'),
  ('promoThemeEnabled', 'false', 'boolean', '官网主题模式开关（开启后首页自动跳转到/promo页面）'),
  ('promoBilingualEnabled', 'false', 'boolean', '官网主题双语模式开关（开启后显示语言切换按钮）'),
  ('enableSocialFeedPage', 'true', 'boolean', '启用朋友圈页面访问'),
  ('socialFeedThemeEnabled', 'false', 'boolean', '启用朋友圈主题模式（首页自动跳转）'),
  ('socialFeedAllowSEO', 'false', 'boolean', '朋友圈页面允许搜索引擎抓取')
ON CONFLICT (setting_key) DO NOTHING;

-- ========================================
-- 初始化官网主题配置数据（v3.3.0新增 - 2025-11-29）
-- ========================================
INSERT INTO promo_config (config_key, config_value, config_value_en, config_type, description, sort_order) VALUES
('logoText', 'XsBlog', 'XsBlog', 'string', 'Logo文本', 1),
('logoSubText', ' 博客系统', ' Blog System', 'string', 'Logo副文本', 2),
('logoDarkImage', '', '', 'image', '黑色主题Logo图片', 3),
('logoLightImage', '', '', 'image', '白色主题Logo图片', 4),
('heroTitle', E'Xs-Blog\n独立的官网主题', E'Xs-Blog\nIndependent Website Theme', 'text', 'Hero标题', 10),
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
('footerCopyright', '© 2025 XsBlog. All rights reserved.', '© 2025 XsBlog. All rights reserved.', 'string', 'Footer版权信息', 73)
ON CONFLICT (config_key) DO NOTHING;

-- 初始化默认导航菜单
INSERT INTO promo_nav_items (name, name_en, link, sort_order, is_visible) VALUES
('首页', 'Home', '#home', 1, TRUE),
('关于我们', 'About', '#about', 2, TRUE),
('服务内容', 'Services', '#services', 3, TRUE),
('团队成员', 'Team', '#team', 4, TRUE),
('合作伙伴', 'Partners', '#partners', 5, TRUE),
('联系我们', 'Contact', '#contact', 6, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 初始化默认统计数据
INSERT INTO promo_stats (stat_value, stat_value_en, stat_label, stat_label_en, sort_order, is_visible) VALUES
('100+', '100+', '已服务数量', 'Clients Served', 1, TRUE),
('95%', '95%', '功能全面性', 'Feature Completeness', 2, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 初始化默认联系方式
INSERT INTO promo_contact_methods (platform, platform_en, value, sort_order, is_visible) VALUES
('邮箱', 'Email', 'contact@example.com', 1, TRUE),
('电话', 'Phone', '+86 123-4567-8900', 2, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 初始化朋友圈数据（v3.5.0新增 - 2025-12-01）
-- ========================================
INSERT INTO social_feed_profile (nickname, signature)
VALUES ('朋友圈', '分享生活，记录美好时刻')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 性能优化索引（v3.1.0新增 - 2025-11-24）
-- ========================================
-- 注意：以下为组合索引，用于优化常用查询场景
-- 单列索引已在表创建时定义，这里只添加组合索引

-- 笔记表组合索引（优化列表查询）
CREATE INDEX IF NOT EXISTS idx_notes_list_order ON notes(is_pinned DESC, sort_order DESC, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_published_time ON notes(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_published_category_time ON notes(is_published, category_id, published_at DESC);

-- 笔记-标签关联表组合索引（优化关联查询）
CREATE INDEX IF NOT EXISTS idx_note_tags_note_tag ON note_tags(note_id, tag_id);

-- 待办事项组合索引（优化待办列表和提醒查询）
CREATE INDEX IF NOT EXISTS idx_todos_incomplete_due ON todos(is_completed, due_date);

-- ========================================
-- 初始化页面文本配置数据
-- ========================================
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
ON CONFLICT (page_key) DO NOTHING;

-- 初始化docs页面的使用说明
UPDATE page_texts SET
  usage_title = '使用说明',
  usage_content = E'将 Markdown 文件放入 public/markdown 目录\n通过 /docs/文件名 访问文档\n支持标准 Markdown 语法、GFM 扩展和 HTML 标签'
WHERE page_key = 'docs';

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
-- 15. gallery_categories: 独立表，存储图册分类信息（v3.2.0新增）
-- 16. galleries: 独立表，存储图册信息（v3.2.0新增）
--    - 关联 gallery_categories (多对一)
--    - 关联 gallery_images (一对多)
--    - 支持密码保护（bcrypt加密）
-- 17. gallery_images: 独立表，存储图册图片信息（v3.2.0新增）
--    - 关联 galleries (多对一)
--    - 级联删除（删除图册时自动删除图片记录）
-- 18. service_categories: 独立表，存储服务分类信息（v3.3.0新增）
-- 19. services: 独立表，存储服务业务信息（v3.3.0新增）
--    - 关联 service_categories (多对一)
--    - 关联 service_specifications (一对多)
--    - 支持Markdown格式服务详情、封面图、规格配置
-- 20. service_specifications: 独立表，存储服务规格信息（v3.3.0新增）
--    - 关联 services (多对一)
--    - 级联删除（删除服务时自动删除规格记录）
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
-- - 图库系统：支持图册分类、图片管理、密码保护、拖拽排序、封面自动设置（v3.2.0新增）
-- - 服务业务：支持服务展示、分类管理、规格配置、下单按钮自定义、推荐标记（v3.3.0新增）
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
-- v3.3.0 (2025-11-25): 新增服务业务功能
--   - 新增 service_categories、services、service_specifications 三个表
--   - 支持服务分类管理（分类名称、描述、图标、排序、可见性）
--   - 支持服务管理（标题、简述、详情、封面、价格、分类、排序）
--   - 支持服务规格配置（规格名称、规格值、排序）
--   - 支持Markdown格式服务详情介绍
--   - 支持自定义下单按钮（按钮文字、跳转URL可配置）
--   - 支持推荐服务标记（醒目展示）
--   - 前台服务列表页面 /services（支持搜索、分类筛选、推荐标记）
--   - 后台服务管理页面（双Tab设计：服务管理+分类管理）
--   - 服务详情弹窗（参考电商设计，支持规格展示、下单跳转）
--   - 文件上传路径：uploads/shop/
--   - 优化查询索引：idx_services_list_order (is_recommended DESC, sort_order ASC)
-- v3.3.0 (2025-11-29): 新增官网主题功能
--   - 新增 promoThemeEnabled 设置：官网主题模式开关
--   - 新增 promoSettings 设置：官网主题完整配置（JSON格式）
--   - 支持中英文双语模式切换
--   - 支持Logo和导航菜单配置（文本或图片）
--   - 支持Hero区域配置（标题、描述、按钮）
--   - 支持About区域配置（标签、标题、描述、统计数据）
--   - 支持Services区域配置（服务分类和服务项）
--   - 支持Team区域配置（团队成员信息）
--   - 支持Partners区域配置（合作伙伴Logo）
--   - 支持Contact区域配置（联系方式、表单配置）
--   - 支持Footer区域配置（Logo、描述、版权、链接）
--   - 开启官网主题模式后，首页自动跳转到 /promo 页面
--   - 双语模式开启时，显示语言切换悬浮球（CN/EN）
--   - 文件上传路径：uploads/official/
-- v3.2.0 (2025-11-25): 新增图库功能
--   - 新增 gallery_categories、galleries、gallery_images 三个表
--   - 支持图册分类管理（分类名称、描述、图标、排序、可见性）
--   - 支持图册管理（标题、描述、分类、密码保护、封面、排序）
--   - 支持图片管理（文件名、路径、排序、大小、级联删除）
--   - 支持密码保护（bcrypt加密存储）
--   - 支持拖拽排序（第一张图片自动设为封面）
--   - 前台图库列表页面 /galleries（支持搜索、分类筛选、密码验证）
--   - 后台图库管理页面（双Tab设计：图册管理+分类管理）
--   - 图片管理器（拖拽排序、删除图片、封面标识）
--   - 图片预览组件（放大缩小、左右切换、保存图片/图册）
--   - 文件上传路径：uploads/imagesall/{gallery_id}/
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
-- PostgreSQL 特别说明
-- ========================================
-- 1. 数据类型：PostgreSQL 使用标准 SQL 类型
--    - SERIAL: 自增整数
--    - INTEGER: 整数
--    - TEXT: 文本
--    - VARCHAR(n): 变长字符串
--    - BOOLEAN: 布尔值
--    - TIMESTAMP: 时间戳
--    - DATE: 日期
--    - TIME: 时间
--    - DECIMAL(p,s): 精确数值
--    - JSONB: JSON 二进制格式（推荐）
--
-- 2. ENUM 类型：PostgreSQL 支持自定义 ENUM 类型
--    - 使用 CREATE TYPE ... AS ENUM 创建
--    - 比 CHECK 约束更高效
--
-- 3. 自动更新时间：使用触发器实现
--    - 创建 update_updated_at_column() 函数
--    - 为每个表创建 BEFORE UPDATE 触发器
--
-- 4. 索引：支持多种索引类型
--    - B-tree（默认）
--    - GIN（用于 JSONB 和全文搜索）
--    - GiST（用于几何数据）
--
-- 5. 全文搜索：使用 tsvector 和 tsquery
--    - 比 MySQL FULLTEXT 更强大
--    - 支持中文需要安装 zhparser 扩展
--
-- 6. 冲突处理：使用 ON CONFLICT 子句
--    - ON CONFLICT (column) DO NOTHING
--    - ON CONFLICT (column) DO UPDATE SET ...
--
-- 7. 性能优化：
--    - VACUUM ANALYZE; -- 清理和更新统计信息
--    - REINDEX DATABASE dbname; -- 重建索引
--
-- ========================================

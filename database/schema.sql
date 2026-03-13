-- ========================================
-- Xs-blog个人主页系统 - 完整数据库初始化脚本
-- Personal Homepage System - Database Schema
-- Developer: arran
-- ========================================
-- 版本: 4.0.0
-- 创建日期: 2025-10-31
-- 更新日期: 2026-01-29
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
-- 4. 导航分类表 (navigation_categories) - v3.0新增
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
  display_type ENUM('frontend', 'backend', 'both') DEFAULT 'both' COMMENT '展示位置：frontend-前台, backend-后台, both-前后台都展示',
  is_recommended BOOLEAN DEFAULT FALSE COMMENT '是否推荐',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_category (category),
  INDEX idx_category_id (category_id),
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible),
  INDEX idx_display_type (display_type),
  INDEX idx_is_recommended (is_recommended),
  FOREIGN KEY (category_id) REFERENCES navigation_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网站导航表';

-- ========================================
-- 6. 分类表 (categories) - v2.0新增
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
-- 7. 笔记表 (notes) - v2.0更新
-- ========================================
CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  custom_slug VARCHAR(200) DEFAULT NULL COMMENT '自定义URL路径',
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
  -- v3.6.0 新增：笔记展示模式字段
  display_mode ENUM('modal', 'page') DEFAULT 'modal' NOT NULL COMMENT '展示模式：modal-窗口展示, page-页面展示',
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
  INDEX idx_display_mode (display_mode),
  UNIQUE KEY uniq_notes_custom_slug (custom_slug),
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
-- 7.2 笔记投票表及相关表 (note_polls, note_poll_options, note_poll_votes)
-- 来源：database/migrations/update_note_features_mysql.sql
-- ========================================
CREATE TABLE IF NOT EXISTS note_polls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  note_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  poll_type VARCHAR(20) NOT NULL DEFAULT 'single',
  max_choices INT DEFAULT 1,
  start_time DATETIME,
  end_time DATETIME,
  result_visibility VARCHAR(20) NOT NULL DEFAULT 'before',
  show_participants TINYINT(1) DEFAULT 1 COMMENT '是否在前台展示参与人数',
  allow_revote TINYINT(1) DEFAULT 0,
  ip_limit INT DEFAULT 1,
  redirect_url VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  total_votes INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  CHECK (poll_type IN ('single', 'multiple')),
  CHECK (result_visibility IN ('none', 'before', 'after', 'admin')),
  CHECK (max_choices > 0),
  CHECK (ip_limit > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记投票主表';

CREATE INDEX idx_note_polls_note_id ON note_polls(note_id);
CREATE INDEX idx_note_polls_is_active ON note_polls(is_active);
CREATE INDEX idx_note_polls_end_time ON note_polls(end_time);

CREATE TABLE IF NOT EXISTS note_poll_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poll_id INT NOT NULL,
  option_text VARCHAR(500) NOT NULL,
  option_image VARCHAR(500),
  sort_order INT DEFAULT 0,
  vote_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (poll_id) REFERENCES note_polls(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记投票选项表';

CREATE INDEX idx_note_poll_options_poll_id ON note_poll_options(poll_id);
CREATE INDEX idx_note_poll_options_sort_order ON note_poll_options(sort_order);

CREATE TABLE IF NOT EXISTS note_poll_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poll_id INT NOT NULL,
  option_id INT NOT NULL,
  voter_ip VARCHAR(100) NOT NULL,
  voter_fingerprint VARCHAR(255),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poll_id) REFERENCES note_polls(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES note_poll_options(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记投票记录表';

CREATE INDEX idx_note_poll_votes_poll_id ON note_poll_votes(poll_id);
CREATE INDEX idx_note_poll_votes_option_id ON note_poll_votes(option_id);
CREATE INDEX idx_note_poll_votes_voter_ip ON note_poll_votes(voter_ip);
CREATE INDEX idx_note_poll_votes_poll_ip ON note_poll_votes(poll_id, voter_ip);

-- ========================================
-- 7.3 笔记问卷表及相关表 (note_surveys, note_survey_*) 
-- 来源：database/migrations/update_note_features_mysql.sql
-- ========================================
CREATE TABLE IF NOT EXISTS note_surveys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  note_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time DATETIME,
  end_time DATETIME,
  ip_limit INT DEFAULT 1,
  allow_resubmit TINYINT(1) DEFAULT 0,
  result_visibility VARCHAR(20) NOT NULL DEFAULT 'before',
  show_participants TINYINT(1) DEFAULT 1 COMMENT '是否在前台展示参与人数',
  redirect_url VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  total_submissions INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  CHECK (ip_limit > 0),
  CHECK (result_visibility IN ('none', 'before', 'after', 'admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记问卷主表';

CREATE INDEX idx_note_surveys_note_id ON note_surveys(note_id);
CREATE INDEX idx_note_surveys_is_active ON note_surveys(is_active);
CREATE INDEX idx_note_surveys_end_time ON note_surveys(end_time);

CREATE TABLE IF NOT EXISTS note_survey_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  survey_id INT NOT NULL,
  question_type VARCHAR(20) NOT NULL,
  question_title VARCHAR(500) NOT NULL,
  question_description TEXT,
  question_image VARCHAR(500),
  is_required TINYINT(1) DEFAULT 0,
  sort_order INT DEFAULT 0,
  config JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (survey_id) REFERENCES note_surveys(id) ON DELETE CASCADE,
  CHECK (question_type IN ('text', 'textarea', 'radio', 'checkbox', 'file', 'rating', 'date', 'time'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记问卷题目表';

CREATE INDEX idx_note_survey_questions_survey_id ON note_survey_questions(survey_id);
CREATE INDEX idx_note_survey_questions_sort_order ON note_survey_questions(sort_order);

CREATE TABLE IF NOT EXISTS note_survey_question_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  option_text VARCHAR(500) NOT NULL,
  option_image VARCHAR(500),
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES note_survey_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记问卷题目选项表';

CREATE INDEX idx_note_survey_question_options_question_id ON note_survey_question_options(question_id);
CREATE INDEX idx_note_survey_question_options_sort_order ON note_survey_question_options(sort_order);

CREATE TABLE IF NOT EXISTS note_survey_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  survey_id INT NOT NULL,
  submitter_ip VARCHAR(100) NOT NULL,
  user_agent TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (survey_id) REFERENCES note_surveys(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记问卷提交记录表';

CREATE INDEX idx_note_survey_submissions_survey_id ON note_survey_submissions(survey_id);
CREATE INDEX idx_note_survey_submissions_submitter_ip ON note_survey_submissions(submitter_ip);
CREATE INDEX idx_note_survey_submissions_survey_ip ON note_survey_submissions(survey_id, submitter_ip);

CREATE TABLE IF NOT EXISTS note_survey_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  question_id INT NOT NULL,
  answer_text TEXT,
  answer_file VARCHAR(500),
  selected_options JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES note_survey_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES note_survey_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记问卷答案表';

CREATE INDEX idx_note_survey_answers_submission_id ON note_survey_answers(submission_id);
CREATE INDEX idx_note_survey_answers_question_id ON note_survey_answers(question_id);

-- ========================================
-- 7.4 笔记抽奖表及相关表 (note_lotteries, note_lottery_*)
-- 来源：database/migrations/update_note_features_mysql.sql
-- ========================================
CREATE TABLE IF NOT EXISTS note_lotteries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  note_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  draw_time DATETIME NOT NULL,
  ip_limit INT DEFAULT 1,
  enable_email_notification TINYINT(1) DEFAULT 1,
  custom_fields JSON,
  show_prizes TINYINT(1) DEFAULT 1 COMMENT '是否在前台展示具体奖项',
  show_probability TINYINT(1) DEFAULT 1 COMMENT '是否在前台展示奖项概率',
  show_quantity TINYINT(1) DEFAULT 1 COMMENT '是否在前台展示奖项数量',
  result_visibility VARCHAR(20) NOT NULL DEFAULT 'before' COMMENT '结果可见性：before-前台可见, after-参与后可见, admin-仅后台可见',
  show_participants TINYINT(1) DEFAULT 1 COMMENT '是否在前台展示参与人数',
  draw_type ENUM('manual', 'auto') DEFAULT 'manual' COMMENT '开奖方式：manual-手动, auto-自动',
  redirect_url VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  is_drawn TINYINT(1) DEFAULT 0,
  total_participants INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  CONSTRAINT check_lottery_ip_limit CHECK (ip_limit > 0),
  CHECK (result_visibility IN ('before', 'after', 'admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记抽奖主表';

CREATE INDEX idx_note_lotteries_note_id ON note_lotteries(note_id);
CREATE INDEX idx_note_lotteries_is_active ON note_lotteries(is_active);
CREATE INDEX idx_note_lotteries_draw_time ON note_lotteries(draw_time);

CREATE TABLE IF NOT EXISTS note_lottery_prizes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lottery_id INT NOT NULL,
  prize_name VARCHAR(255) NOT NULL,
  prize_image VARCHAR(500),
  prize_description TEXT,
  probability DECIMAL(5,2) NOT NULL,
  quantity INT DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lottery_id) REFERENCES note_lotteries(id) ON DELETE CASCADE,
  CONSTRAINT check_probability_range CHECK (probability >= 0 AND probability <= 100),
  CONSTRAINT check_quantity_positive CHECK (quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记抽奖奖项表';

CREATE INDEX idx_note_lottery_prizes_lottery_id ON note_lottery_prizes(lottery_id);
CREATE INDEX idx_note_lottery_prizes_sort_order ON note_lottery_prizes(sort_order);

CREATE TABLE IF NOT EXISTS note_lottery_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lottery_id INT NOT NULL,
  participant_ip VARCHAR(100) NOT NULL,
  participant_email VARCHAR(255),
  custom_data JSON,
  prize_id INT,
  is_winner TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lottery_id) REFERENCES note_lotteries(id) ON DELETE CASCADE,
  FOREIGN KEY (prize_id) REFERENCES note_lottery_prizes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记抽奖参与记录表';

CREATE INDEX idx_note_lottery_entries_lottery_id ON note_lottery_entries(lottery_id);
CREATE INDEX idx_note_lottery_entries_participant_ip ON note_lottery_entries(participant_ip);
CREATE INDEX idx_note_lottery_entries_lottery_ip ON note_lottery_entries(lottery_id, participant_ip);
CREATE INDEX idx_note_lottery_entries_is_winner ON note_lottery_entries(is_winner);

-- ========================================
-- 8. 便签表 (sticky_notes) - v2.0更新
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
-- 9. 标签表 (tags) - v2.0更新
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
-- 10. 笔记-标签关联表 (note_tags) - v2.0新增
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
-- 11. 待办事项表 (todos) - v2.5 更新：新增进度管理功能
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
-- 11.1 待办事项分类表 (todo_categories) - v2.5 新增
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
-- 11.2 待办事项时间记录表 (todo_time_logs) - v2.6 新增
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
-- 16. 图册分类表 (gallery_categories) - v3.2.0新增
-- ========================================
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

-- ========================================
-- 17. 图册表 (galleries) - v3.2.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS galleries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL COMMENT '图册标题',
  description TEXT COMMENT '图册描述',
  category_id INT COMMENT '分类ID',
  password VARCHAR(100) COMMENT '访问密码（bcrypt加密，为空表示无密码）',
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

-- ========================================
-- 18. 图册图片表 (gallery_images) - v3.2.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS gallery_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gallery_id INT NOT NULL COMMENT '图册ID',
  filename VARCHAR(255) NOT NULL COMMENT '文件名',
  path VARCHAR(500) NOT NULL COMMENT '文件路径',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前，第一张为封面）',
  size INT COMMENT '文件大小（字节）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
  INDEX idx_gallery_id (gallery_id),
  INDEX idx_sort_order (sort_order),
  INDEX idx_gallery_image_order (gallery_id, sort_order ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图册图片表';

-- ========================================
-- 18. 服务分类表 (service_categories) - v2.1新增
-- ========================================
CREATE TABLE IF NOT EXISTS service_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  description TEXT DEFAULT NULL COMMENT '分类描述',
  icon VARCHAR(255) DEFAULT NULL COMMENT '分类图标',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  is_visible TINYINT(1) DEFAULT 1 COMMENT '是否可见',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务分类表';

-- ========================================
-- 19. 服务表 (services) - v2.1新增
-- ========================================
CREATE TABLE IF NOT EXISTS services (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL COMMENT '服务名称',
  description TEXT DEFAULT NULL COMMENT '服务简述',
  content TEXT DEFAULT NULL COMMENT '服务详情介绍（Markdown格式）',
  content_format VARCHAR(20) DEFAULT 'markdown' COMMENT '服务详情格式（text/markdown/html）',
  cover_image VARCHAR(500) DEFAULT NULL COMMENT '服务封面图（1:1正方形）',
  price VARCHAR(100) DEFAULT NULL COMMENT '价格（文本格式，可包含非数字）',
  category_id INT UNSIGNED DEFAULT NULL COMMENT '分类ID（关联service_categories表）',
  is_visible TINYINT(1) DEFAULT 1 COMMENT '是否在前台显示',
  is_recommended TINYINT(1) DEFAULT 0 COMMENT '是否推荐服务',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  show_order_button TINYINT(1) DEFAULT 0 COMMENT '是否显示"立即下单"按钮',
  order_button_text VARCHAR(50) DEFAULT '立即下单' COMMENT '下单按钮文字',
  order_button_url VARCHAR(500) DEFAULT NULL COMMENT '下单按钮跳转URL',
  spec_title VARCHAR(50) DEFAULT '服务规格' COMMENT '服务规格标题（可自定义）',
  product_type ENUM('card', 'virtual', 'physical') DEFAULT 'virtual' COMMENT '商品类型',
  stock_total INT DEFAULT 0 COMMENT '库存总量',
  stock_sold INT DEFAULT 0 COMMENT '已售数量',
  show_stock TINYINT(1) DEFAULT 1 COMMENT '是否展示库存',
  show_sales TINYINT(1) DEFAULT 1 COMMENT '是否展示销量',
  payment_config_id INT UNSIGNED DEFAULT NULL COMMENT '绑定支付配置ID',
  order_page_slug VARCHAR(200) DEFAULT NULL COMMENT '下单页路径',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_category_id (category_id),
  INDEX idx_is_visible (is_visible),
  INDEX idx_is_recommended (is_recommended),
  INDEX idx_sort_order (sort_order),
  INDEX idx_payment_config_id (payment_config_id),
  INDEX idx_services_list_order (is_recommended DESC, sort_order ASC),
  FOREIGN KEY (category_id) REFERENCES service_categories (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务表';

-- ========================================
-- 20. 服务规格表 (service_specifications) - v2.1新增
-- ========================================
CREATE TABLE IF NOT EXISTS service_specifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_id INT UNSIGNED NOT NULL COMMENT '所属服务ID（关联services表）',
  spec_name VARCHAR(100) NOT NULL COMMENT '规格名称',
  spec_value VARCHAR(500) DEFAULT NULL COMMENT '规格值',
  sort_order INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_service_id (service_id),
  INDEX idx_sort_order (sort_order),
  FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务规格表';

-- ========================================
-- 21. 支付配置表 (payment_configs)
-- ========================================
CREATE TABLE IF NOT EXISTS payment_configs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '支付配置名称',
  provider_key VARCHAR(100) NOT NULL COMMENT '支付渠道标识',
  provider_type VARCHAR(50) DEFAULT NULL COMMENT '支付渠道类型（yipay/paypal等）',
  is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  sort_order INT DEFAULT 0 COMMENT '排序',
  remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
  config_json JSON DEFAULT NULL COMMENT '渠道配置（敏感字段建议使用DB_ENCRYPTION_KEY加密后存储）',
  display_logo VARCHAR(255) DEFAULT NULL COMMENT '展示Logo（可选）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_is_enabled (is_enabled),
  INDEX idx_sort_order (sort_order),
  INDEX idx_provider_type (provider_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付配置表';

-- ========================================
-- 22. 订单表 (orders)
-- ========================================
CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_id INT UNSIGNED NOT NULL COMMENT '关联服务ID',
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '订单金额',
  status VARCHAR(50) DEFAULT 'pending' COMMENT '订单状态',
  buyer_name VARCHAR(100) DEFAULT NULL COMMENT '购买人姓名',
  buyer_contact VARCHAR(200) DEFAULT NULL COMMENT '购买人联系方式',
  buyer_email VARCHAR(255) DEFAULT NULL COMMENT '购买人邮箱',
  buyer_phone VARCHAR(50) DEFAULT NULL COMMENT '购买人手机号',
  buyer_address TEXT DEFAULT NULL COMMENT '购买人地址',
  payment_config_id INT UNSIGNED DEFAULT NULL COMMENT '支付配置ID',
  payment_gateway VARCHAR(50) DEFAULT NULL COMMENT '实际支付渠道（yipay/paypal等）',
  payment_trade_no VARCHAR(64) DEFAULT NULL COMMENT '商户交易号（用于回调关联）',
  payment_provider_order_id VARCHAR(128) DEFAULT NULL COMMENT '第三方订单号（如PayPal order id）',
  payment_url TEXT DEFAULT NULL COMMENT '支付跳转链接',
  payment_status VARCHAR(50) DEFAULT 'unpaid' COMMENT '支付状态',
  paid_at TIMESTAMP NULL COMMENT '支付完成时间',
  payment_meta JSON DEFAULT NULL COMMENT '支付回调原始数据（排查用）',
  ip_address VARCHAR(45) DEFAULT NULL COMMENT '下单IP',
  user_agent TEXT DEFAULT NULL COMMENT '浏览器信息',
  cancel_reason TEXT DEFAULT NULL COMMENT '取消原因',
  shipping_status VARCHAR(50) DEFAULT NULL COMMENT '发货状态（仅实物）',
  tracking_no VARCHAR(100) DEFAULT NULL COMMENT '快递单号（仅实物）',
  shipped_at TIMESTAMP NULL COMMENT '发货时间（仅实物）',
  expired_at TIMESTAMP NULL COMMENT '过期时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (payment_config_id) REFERENCES payment_configs(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_service_id (service_id),
  INDEX idx_payment_config_id (payment_config_id),
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_shipping_status (shipping_status),
  INDEX idx_payment_trade_no (payment_trade_no),
  INDEX idx_payment_gateway (payment_gateway),
  INDEX idx_paid_at (paid_at),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- ========================================
-- 23. 卡密表 (cards)
-- ========================================
CREATE TABLE IF NOT EXISTS cards (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_id INT UNSIGNED NOT NULL COMMENT '关联服务ID',
  card_code VARCHAR(500) NOT NULL COMMENT '卡密内容',
  card_status VARCHAR(50) DEFAULT 'unused' COMMENT '卡密状态',
  bind_order_id INT UNSIGNED DEFAULT NULL COMMENT '绑定订单ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (bind_order_id) REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_service_id (service_id),
  INDEX idx_bind_order_id (bind_order_id),
  INDEX idx_card_status (card_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='卡密表';

-- ========================================
-- 21. 官网主题基础配置表 (promo_config) - v3.3.0新增
-- ========================================
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

-- ========================================
-- 22. 官网主题导航菜单表 (promo_nav_items) - v3.3.0新增
-- ========================================
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

-- ========================================
-- 23. 官网主题统计数据表 (promo_stats) - v3.3.0新增
-- ========================================
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

-- ========================================
-- 24. 官网主题服务分类表 (promo_service_categories) - v3.3.0新增
-- ========================================
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

-- ========================================
-- 25. 官网主题服务项表 (promo_services) - v3.3.0新增
-- ========================================
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

-- ========================================
-- 26. 官网主题团队成员表 (promo_team_members) - v3.3.0新增
-- ========================================
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

-- ========================================
-- 27. 官网主题合作伙伴表 (promo_partners) - v3.3.0新增
-- ========================================
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

-- ========================================
-- 28. 官网主题联系方式表 (promo_contact_methods) - v3.3.0新增
-- ========================================
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

-- ========================================
-- 29. 官网主题底部链接分组表 (promo_footer_link_groups) - v3.3.0新增
-- ========================================
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

-- ========================================
-- 30. 官网主题底部链接表 (promo_footer_links) - v3.3.0新增
-- ========================================
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

-- ========================================
-- 31. 朋友圈个人资料表 (social_feed_profile) - v3.5.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS social_feed_profile (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cover_image VARCHAR(500) COMMENT '封面图片路径',
  avatar VARCHAR(500) COMMENT '头像路径',
  nickname VARCHAR(100) NOT NULL DEFAULT '朋友圈' COMMENT '昵称',
  signature TEXT COMMENT '个性签名',
  custom_copyright VARCHAR(255) DEFAULT '' COMMENT '自定义版权信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='朋友圈个人资料表';

-- ========================================
-- 32. 朋友圈动态内容表 (social_feed_posts) - v3.5.0新增
-- ========================================
CREATE TABLE IF NOT EXISTS social_feed_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content TEXT COMMENT '动态内容',
  images TEXT COMMENT '图片路径（JSON数组）',
  video TEXT COMMENT '视频路径（支持第三方视频长URL）',
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

-- ========================================
-- 33. 页面访问统计表 (page_visits) - v3.7.0新增
-- ========================================
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

-- 页面文本配置已迁移到 page_texts 表（v3.9.0）
-- 旧的 pageTexts 设置项已废弃，请使用 page_texts 表

-- 首页内容切换配置（v3.2.0新增 - 2025-11-26，v3.4.0更新 - 2025-11-29）
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'homeContentSections',
  '{"section1":"notes","section2":"navigation","showInDefaultTheme":true}',
  'json',
  '首页内容区域配置（选择展示哪些内容）'
) ON DUPLICATE KEY UPDATE description = '首页内容区域配置（选择展示哪些内容）';

-- 页面访问控制设置（v3.4.0新增 - 2025-11-29）
-- 启用 /user 页面访问
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'enableUserPage',
  'true',
  'boolean',
  '启用/user页面访问（开启后可通过/user路径访问个人主页模式）'
) ON DUPLICATE KEY UPDATE description = '启用/user页面访问（开启后可通过/user路径访问个人主页模式）';

-- 启用 /blog 页面访问
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'enableBlogPage',
  'true',
  'boolean',
  '启用/blog页面访问（开启后可通过/blog路径访问博客模式）'
) ON DUPLICATE KEY UPDATE description = '启用/blog页面访问（开启后可通过/blog路径访问博客模式）';

-- 启用 /promo 页面访问
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'enablePromoPage',
  'true',
  'boolean',
  '启用/promo页面访问（开启后可通过/promo路径访问官网主题页面）'
) ON DUPLICATE KEY UPDATE description = '启用/promo页面访问（开启后可通过/promo路径访问官网主题页面）';

-- 官网主题模式开关（v3.3.0新增 - 2025-11-29）
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'promoThemeEnabled',
  'false',
  'boolean',
  '官网主题模式开关（开启后首页自动跳转到/promo页面）'
) ON DUPLICATE KEY UPDATE
  type = VALUES(type),
  description = VALUES(description);

-- 官网主题双语模式开关（v3.3.0新增 - 2025-11-29）
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'promoBilingualEnabled',
  'false',
  'boolean',
  '官网主题双语模式开关（开启后显示语言切换按钮）'
) ON DUPLICATE KEY UPDATE
  type = VALUES(type),
  description = VALUES(description);

-- ========================================
-- 初始化官网主题配置数据（v3.3.0新增 - 2025-11-29）
-- ========================================

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
('footerCopyright', '© 2025 XsBlog. All rights reserved.', '© 2025 XsBlog. All rights reserved.', 'string', 'Footer版权信息', 73)
ON DUPLICATE KEY UPDATE config_key = config_key;

-- 初始化默认导航菜单
INSERT INTO promo_nav_items (name, name_en, link, sort_order, is_visible) VALUES
('首页', 'Home', '#home', 1, TRUE),
('关于我们', 'About', '#about', 2, TRUE),
('服务内容', 'Services', '#services', 3, TRUE),
('团队成员', 'Team', '#team', 4, TRUE),
('合作伙伴', 'Partners', '#partners', 5, TRUE),
('联系我们', 'Contact', '#contact', 6, TRUE)
ON DUPLICATE KEY UPDATE name = name;

-- 初始化默认统计数据
INSERT INTO promo_stats (stat_value, stat_value_en, stat_label, stat_label_en, sort_order, is_visible) VALUES
('100+', '100+', '已服务数量', 'Clients Served', 1, TRUE),
('95%', '95%', '功能全面性', 'Feature Completeness', 2, TRUE)
ON DUPLICATE KEY UPDATE stat_value = stat_value;

-- 初始化默认联系方式
INSERT INTO promo_contact_methods (platform, platform_en, value, sort_order, is_visible) VALUES
('邮箱', 'Email', 'contact@example.com', 1, TRUE),
('电话', 'Phone', '+86 123-4567-8900', 2, TRUE)
ON DUPLICATE KEY UPDATE platform = platform;

-- ========================================
-- 初始化朋友圈数据（v3.5.0新增 - 2025-12-01）
-- ========================================

-- 插入朋友圈默认个人资料
INSERT INTO social_feed_profile (nickname, signature)
VALUES ('朋友圈', '分享生活，记录美好时刻')
ON DUPLICATE KEY UPDATE id=id;

-- 朋友圈页面访问开关
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'enableSocialFeedPage',
  'true',
  'boolean',
  '启用朋友圈页面访问'
) ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- 朋友圈主题模式开关
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'socialFeedThemeEnabled',
  'false',
  'boolean',
  '启用朋友圈主题模式（首页自动跳转）'
) ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- 朋友圈SEO设置
INSERT INTO settings (setting_key, setting_value, type, description)
VALUES (
  'socialFeedAllowSEO',
  'false',
  'boolean',
  '朋友圈页面允许搜索引擎抓取'
) ON DUPLICATE KEY UPDATE setting_key=setting_key;

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

-- ========================================
-- 页面文本配置表 (page_texts) - v3.9.0新增
-- ========================================
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

-- ========================================

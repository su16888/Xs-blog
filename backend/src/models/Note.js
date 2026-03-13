/**
 * @file Note.js
 * @description Xs-Blog 笔记数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Note = sequelize.define('Note', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    defaultValue: ''
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '分类名称（保留用于兼容）'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '分类ID（关联categories表）',
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  tags: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '标签（逗号分隔，保留用于兼容）'
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  show_in_list: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否在列表中展示'
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '访问密码'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '笔记摘要'
  },
  media_type: {
    type: DataTypes.ENUM('none', 'image', 'video', 'music'),
    defaultValue: 'none'
  },
  media_urls: {
    type: DataTypes.JSON,
    allowNull: true
  },
  external_link: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  published_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_pinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  cover_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '笔记封面图URL'
  },
  source_type: {
    type: DataTypes.ENUM('none', 'original', 'reprint'),
    defaultValue: 'none',
    comment: '来源类型：none-不展示, original-原创, reprint-转载'
  },
  source_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '转载来源URL'
  },
  source_text: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '文章来源文本（当source_url为空时使用）'
  },
  display_mode: {
    type: DataTypes.ENUM('modal', 'page'),
    defaultValue: 'modal',
    comment: '展示模式：modal-窗口展示, page-页面展示'
  },
  custom_slug: {
    type: DataTypes.STRING(200),
    allowNull: true,
    unique: true,
    comment: '自定义URL路径'
  }
}, {
  tableName: 'notes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Note;

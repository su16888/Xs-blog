/**
 * @file PageText.js
 * @description Xs-Blog 页面文本配置数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-12-16
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PageText = sequelize.define('PageText', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pageKey: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'page_key',
    comment: '页面标识（navigation/services/notes/galleries/messages/promo/socialFeed/docs）'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: true,
    defaultValue: '',
    comment: '页面标题'
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: '',
    comment: '页面描述'
  },
  browserTitle: {
    type: DataTypes.STRING(200),
    allowNull: true,
    defaultValue: '',
    field: 'browser_title',
    comment: '浏览器标签标题'
  },
  browserSubtitle: {
    type: DataTypes.STRING(200),
    allowNull: true,
    defaultValue: '',
    field: 'browser_subtitle',
    comment: '浏览器标签副标题'
  },
  usageTitle: {
    type: DataTypes.STRING(200),
    allowNull: true,
    defaultValue: '',
    field: 'usage_title',
    comment: '使用说明标题（仅docs页面使用）'
  },
  usageContent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'usage_content',
    comment: '使用说明内容（仅docs页面使用）'
  }
}, {
  tableName: 'page_texts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PageText;

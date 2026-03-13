/**
 * @file StickyNote.js
 * @description Xs-Blog 便签数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StickyNote = sequelize.define('StickyNote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
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
  color: {
    type: DataTypes.STRING(20),
    defaultValue: '#fef68a'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'sticky_notes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = StickyNote;

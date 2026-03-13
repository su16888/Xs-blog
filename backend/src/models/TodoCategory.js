/**
 * @file TodoCategory.js
 * @description Xs-Blog 待办事项分类数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-17
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TodoCategory = sequelize.define('TodoCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '分类名称'
  },
  color: {
    type: DataTypes.STRING(20),
    defaultValue: '#3B82F6',
    comment: '分类颜色'
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '图标名称'
  },
  description: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '描述'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'todo_categories',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: '待办事项分类表'
});

module.exports = TodoCategory;

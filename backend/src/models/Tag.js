/**
 * @file Tag.js
 * @description Xs-Blog 标签数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tag = sequelize.define('Tag', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '标签分类（保留用于兼容）'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '标签分类ID（关联categories表）',
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#3b82f6',
    comment: '标签颜色，用于前端显示'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序，数字越小越靠前'
  }
}, {
  tableName: 'tags',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['category']
    },
    {
      fields: ['sort_order']
    },
    {
      fields: ['name']
    }
  ]
});

module.exports = Tag;

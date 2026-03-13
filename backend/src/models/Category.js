/**
 * @file Category.js
 * @description Xs-Blog 分类数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * 分类模型
 * 统一管理笔记分类、便签分类、标签分类
 */
const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '分类名称'
  },
  type: {
    type: DataTypes.ENUM('note', 'sticky_note', 'tag'),
    allowNull: false,
    defaultValue: 'note',
    comment: '分类类型'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '分类描述'
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '分类图标'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: '排序顺序'
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '父分类ID（支持二级分类）',
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['type'] },
    { fields: ['sort_order'] },
    { fields: ['parent_id'] },
    {
      unique: true,
      fields: ['name', 'type'],
      name: 'unique_name_type'
    }
  ]
});

// 自关联：父分类
Category.hasMany(Category, {
  as: 'children',
  foreignKey: 'parent_id',
  onDelete: 'SET NULL'
});

Category.belongsTo(Category, {
  as: 'parent',
  foreignKey: 'parent_id',
  onDelete: 'SET NULL'
});

module.exports = Category;

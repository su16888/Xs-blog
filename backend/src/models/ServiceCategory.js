/**
 * @file ServiceCategory.js
 * @description Xs-Blog 服务分类数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-25
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServiceCategory = sequelize.define('ServiceCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '分类名称'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '分类描述'
  },
  icon: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '分类图标'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序（数字越小越靠前）'
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否可见'
  }
}, {
  tableName: 'service_categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ServiceCategory;

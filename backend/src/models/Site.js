/**
 * @file Site.js
 * @description Xs-Blog 网站导航数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Site = sequelize.define('Site', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  link: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '分类ID（关联navigation_categories表）'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  display_type: {
    type: DataTypes.ENUM('frontend', 'backend', 'both'),
    defaultValue: 'both',
    comment: '展示位置：frontend-前台, backend-后台, both-前后台都展示'
  },
  is_recommended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否推荐'
  }
}, {
  tableName: 'sites',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Site;

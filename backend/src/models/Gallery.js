/**
 * @file Gallery.js
 * @description Xs-Blog 图册数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-25
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Gallery = sequelize.define('Gallery', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '图册标题'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '图册描述'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '分类ID（关联gallery_categories表）',
    references: {
      model: 'gallery_categories',
      key: 'id'
    }
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '访问密码（为空表示无密码）'
  },
  cover_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '封面图片路径（第一张图片）'
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否在前台可见'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序（数字越小越靠前）'
  },
  image_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '图片数量'
  }
}, {
  tableName: 'galleries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Gallery;

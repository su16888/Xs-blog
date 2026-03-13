/**
 * @file GalleryImage.js
 * @description Xs-Blog 图册图片数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-25
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GalleryImage = sequelize.define('GalleryImage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  gallery_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '图册ID（关联galleries表）',
    references: {
      model: 'galleries',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '文件名'
  },
  path: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '文件路径'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序（数字越小越靠前）'
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '文件大小（字节）'
  }
}, {
  tableName: 'gallery_images',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = GalleryImage;

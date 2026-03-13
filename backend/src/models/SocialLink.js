/**
 * @file SocialLink.js
 * @description Xs-Blog 社交链接数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SocialLink = sequelize.define('SocialLink', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  platform: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  account: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  link: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  icon: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  qrcode: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  show_in_profile: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否在个人资料卡片中显示（最多4个）'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'social_links',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SocialLink;

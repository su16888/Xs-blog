/**
 * @file PromoFooterLink.js
 * @description 官网主题底部链接数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-29
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PromoFooterLink = sequelize.define('PromoFooterLink', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  group_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'group_id'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  name_en: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'name_en'
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_visible'
  }
}, {
  tableName: 'promo_footer_links',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PromoFooterLink;

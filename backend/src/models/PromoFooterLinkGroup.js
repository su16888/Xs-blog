/**
 * @file PromoFooterLinkGroup.js
 * @description 官网主题底部链接分组数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-29
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PromoFooterLinkGroup = sequelize.define('PromoFooterLinkGroup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  group_title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'group_title'
  },
  group_title_en: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'group_title_en'
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
  tableName: 'promo_footer_link_groups',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PromoFooterLinkGroup;

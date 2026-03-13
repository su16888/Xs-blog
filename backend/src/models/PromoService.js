/**
 * @file PromoService.js
 * @description 官网主题服务项数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-29
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PromoService = sequelize.define('PromoService', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'category_id'
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  title_en: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'title_en'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  description_en: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'description_en'
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
  tableName: 'promo_services',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PromoService;

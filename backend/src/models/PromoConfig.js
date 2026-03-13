/**
 * @file PromoConfig.js
 * @description 官网主题基础配置数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-29
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PromoConfig = sequelize.define('PromoConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  config_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'config_key'
  },
  config_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'config_value'
  },
  config_value_en: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'config_value_en'
  },
  config_type: {
    type: DataTypes.STRING(50),
    defaultValue: 'string',
    field: 'config_type'
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  }
}, {
  tableName: 'promo_config',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PromoConfig;

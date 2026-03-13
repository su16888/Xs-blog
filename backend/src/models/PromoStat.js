/**
 * @file PromoStat.js
 * @description 官网主题统计数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-29
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PromoStat = sequelize.define('PromoStat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stat_value: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'stat_value'
  },
  stat_value_en: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'stat_value_en'
  },
  stat_label: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'stat_label'
  },
  stat_label_en: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'stat_label_en'
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
  tableName: 'promo_stats',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PromoStat;

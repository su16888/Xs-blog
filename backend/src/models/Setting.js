/**
 * @file Setting.js
 * @description Xs-Blog 系统设置数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'setting_key'
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'setting_value'
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'string'
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Setting;

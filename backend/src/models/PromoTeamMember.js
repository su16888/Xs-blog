/**
 * @file PromoTeamMember.js
 * @description 官网主题团队成员数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-29
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PromoTeamMember = sequelize.define('PromoTeamMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  avatar_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'avatar_image'
  },
  avatar_text: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'avatar_text'
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
  role: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  role_en: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'role_en'
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
  tableName: 'promo_team_members',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PromoTeamMember;

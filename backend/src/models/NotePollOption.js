/**
 * @file NotePollOption.js
 * @description 投票选项数据模型
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-19
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NotePollOption = sequelize.define('NotePollOption', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  poll_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的投票ID',
    references: {
      model: 'note_polls',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  option_text: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '选项文本内容'
  },
  option_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '选项图片URL（可选）'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  },
  vote_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '得票数（冗余字段，提升查询性能）'
  }
}, {
  tableName: 'note_poll_options',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = NotePollOption;

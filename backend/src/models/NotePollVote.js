/**
 * @file NotePollVote.js
 * @description 投票记录数据模型
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-19
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NotePollVote = sequelize.define('NotePollVote', {
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
  option_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '选择的选项ID',
    references: {
      model: 'note_poll_options',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  voter_ip: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '投票者IP地址'
  },
  voter_fingerprint: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '浏览器指纹（可选，用于更精确的防刷）'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户代理信息'
  }
}, {
  tableName: 'note_poll_votes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = NotePollVote;

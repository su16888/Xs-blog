/**
 * @file NoteLotteryEntry.js
 * @description 笔记抽奖参与记录数据模型
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-22
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NoteLotteryEntry = sequelize.define('NoteLotteryEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lottery_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的抽奖ID',
    references: {
      model: 'note_lotteries',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  participant_ip: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '参与者IP地址'
  },
  participant_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '参与者邮箱'
  },
  custom_data: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: '自定义字段数据'
  },
  prize_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '中奖奖项ID',
    references: {
      model: 'note_lottery_prizes',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  is_winner: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否中奖'
  }
}, {
  tableName: 'note_lottery_entries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = NoteLotteryEntry;

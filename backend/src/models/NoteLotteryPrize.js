/**
 * @file NoteLotteryPrize.js
 * @description 笔记抽奖奖项数据模型
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-22
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NoteLotteryPrize = sequelize.define('NoteLotteryPrize', {
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
  prize_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '奖项名称'
  },
  prize_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '奖项图片URL'
  },
  prize_description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '奖项描述'
  },
  probability: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: '中奖概率（0-100）',
    validate: {
      min: 0,
      max: 100
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '奖品数量',
    validate: {
      min: 0
    }
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序'
  }
}, {
  tableName: 'note_lottery_prizes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = NoteLotteryPrize;

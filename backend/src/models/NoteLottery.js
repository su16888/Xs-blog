/**
 * @file NoteLottery.js
 * @description 笔记抽奖数据模型
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-22
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NoteLottery = sequelize.define('NoteLottery', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  note_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的笔记ID',
    references: {
      model: 'notes',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '抽奖主题'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '抽奖详情/说明'
  },
  draw_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '开奖时间'
  },
  draw_type: {
    type: DataTypes.ENUM('manual', 'auto'),
    defaultValue: 'manual',
    comment: '开奖方式：manual-手动, auto-自动'
  },
  ip_limit: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '每个IP最多抽奖次数',
    validate: {
      min: 1
    }
  },
  enable_email_notification: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用中奖邮箱通知'
  },
  custom_fields: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '自定义收集字段（如邮箱、地址等）'
  },
  show_prizes: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否在前台展示具体奖项'
  },
  show_probability: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否在前台展示奖项概率'
  },
  show_quantity: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否在前台展示奖项数量'
  },
  result_visibility: {
    type: DataTypes.ENUM('before', 'after', 'admin'),
    allowNull: false,
    defaultValue: 'before',
    comment: '结果可见性：before-前台可见, after-参与后可见, admin-仅后台可见'
  },
  show_participants: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否在前台展示参与人数'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  is_drawn: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已开奖'
  },
  redirect_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
    comment: '抽奖参与后自动跳转URL'
  },
  total_participants: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '总参与人数（冗余字段）'
  }
}, {
  tableName: 'note_lotteries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = NoteLottery;

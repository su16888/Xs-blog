/**
 * @file NoteTag.js
 * @description Xs-Blog 笔记标签关联数据模型
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * 笔记-标签关联模型
 * 实现笔记和标签的多对多关系
 */
const NoteTag = sequelize.define('NoteTag', {
  note_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'notes',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  tag_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'tags',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'note_tags',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['note_id'] },
    { fields: ['tag_id'] }
  ]
});

module.exports = NoteTag;

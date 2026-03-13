/**
 * @file NoteSurveyQuestionOption.js
 * @description 问卷题目选项数据模型
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-20
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NoteSurveyQuestionOption = sequelize.define('NoteSurveyQuestionOption', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  question_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的题目ID',
    references: {
      model: 'note_survey_questions',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  option_text: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '选项文本'
  },
  option_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '选项图片URL'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  }
}, {
  tableName: 'note_survey_question_options',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = NoteSurveyQuestionOption;

/**
 * @file NoteSurveyAnswer.js
 * @description 问卷答案数据模型
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-20
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NoteSurveyAnswer = sequelize.define('NoteSurveyAnswer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  submission_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的提交记录ID',
    references: {
      model: 'note_survey_submissions',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  answer_text: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '文本答案（用于text、textarea类型）'
  },
  answer_file: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '文件答案URL（用于file类型）'
  },
  selected_options: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '选中的选项ID数组（用于radio、checkbox类型）',
    defaultValue: []
  }
}, {
  tableName: 'note_survey_answers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = NoteSurveyAnswer;

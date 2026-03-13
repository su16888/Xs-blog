/**
 * @file syncSurveyTables.js
 * @description 同步问卷相关的数据库表
 * @author Arran
 * @created 2026-01-20
 */

const { sequelize } = require('../config/database');
const { NoteSurvey, NoteSurveyQuestion, NoteSurveyQuestionOption, NoteSurveySubmission, NoteSurveyAnswer } = require('../models/associations');

async function syncSurveyTables() {
  try {
    console.log('开始同步问卷相关数据库表...');

    // 按照依赖顺序同步表
    await NoteSurvey.sync({ alter: true });
    console.log('✅ NoteSurvey 表同步成功');

    await NoteSurveyQuestion.sync({ alter: true });
    console.log('✅ NoteSurveyQuestion 表同步成功');

    await NoteSurveyQuestionOption.sync({ alter: true });
    console.log('✅ NoteSurveyQuestionOption 表同步成功');

    await NoteSurveySubmission.sync({ alter: true });
    console.log('✅ NoteSurveySubmission 表同步成功');

    await NoteSurveyAnswer.sync({ alter: true });
    console.log('✅ NoteSurveyAnswer 表同步成功');

    console.log('\n🎉 所有问卷表同步完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 同步失败:', error);
    process.exit(1);
  }
}

syncSurveyTables();

/**
 * @file noteSurvey.js
 * @description 笔记问卷路由
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-20
 */

const express = require('express');
const router = express.Router();
const noteSurveyController = require('../controllers/noteSurveyController');
const authMiddleware = require('../middlewares/auth');

// ==================== 管理端接口（需要认证） ====================

// 创建问卷
router.post('/admin/notes/:noteId/surveys', authMiddleware, noteSurveyController.createSurvey);

// 更新问卷
router.put('/admin/notes/:noteId/surveys/:surveyId', authMiddleware, noteSurveyController.updateSurvey);

// 删除问卷
router.delete('/admin/notes/:noteId/surveys/:surveyId', authMiddleware, noteSurveyController.deleteSurvey);

// 获取笔记的所有问卷（管理端）
router.get('/admin/notes/:noteId/surveys', authMiddleware, noteSurveyController.getAdminNoteSurveys);

// 获取问卷提交记录
router.get('/admin/surveys/:surveyId/submissions', authMiddleware, noteSurveyController.getSurveySubmissions);

// 导出问卷数据
router.get('/admin/surveys/:surveyId/export', authMiddleware, noteSurveyController.exportSurveyData);

// ==================== 前台接口（无需认证） ====================

// 获取笔记的问卷列表
router.get('/notes/:noteId/surveys', noteSurveyController.getNoteSurveys);

// 提交问卷
router.post('/surveys/:surveyId/submit', noteSurveyController.submitSurvey);

// 获取我的提交记录
router.get('/surveys/:surveyId/my-submission', noteSurveyController.getMySubmission);

// 获取问卷统计结果（公开接口）
router.get('/surveys/:surveyId/statistics', noteSurveyController.getSurveyStatistics);

module.exports = router;

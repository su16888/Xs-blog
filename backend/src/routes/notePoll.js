/**
 * @file notePoll.js
 * @description 笔记投票路由
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-19
 */

const express = require('express');
const router = express.Router();
const notePollController = require('../controllers/notePollController');
const authMiddleware = require('../middlewares/auth');
const { createUpload } = require('../middlewares/upload');
const { s3PostUpload } = require('../middlewares/s3Upload');

// 创建投票图片上传实例（保存到 uploads/polls 目录）
const pollUpload = createUpload('polls');

// ==================== 管理端接口（需要认证） ====================

// 创建投票
router.post('/admin/notes/:noteId/polls', authMiddleware, notePollController.createPoll);

// 更新投票
router.put('/admin/notes/:noteId/polls/:pollId', authMiddleware, notePollController.updatePoll);

// 删除投票
router.delete('/admin/notes/:noteId/polls/:pollId', authMiddleware, notePollController.deletePoll);

// 获取笔记的所有投票（管理端）
router.get('/admin/notes/:noteId/polls', authMiddleware, notePollController.getAdminNotePolls);

// 获取投票统计数据
router.get('/admin/polls/:pollId/statistics', authMiddleware, notePollController.getPollStatistics);

// 获取投票详细记录
router.get('/admin/polls/:pollId/votes', authMiddleware, notePollController.getPollVotes);

// 导出投票数据
router.get('/admin/notes/:noteId/polls/:pollId/export', authMiddleware, notePollController.exportPollData);

// 上传投票选项图片
router.post('/admin/polls/upload', authMiddleware, pollUpload.single('image'), s3PostUpload('polls'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    const config = require('../config/config');
    const fileUrl = req.file.s3Url || config.getFileUrl(req.file);

    res.json({
      success: true,
      message: '图片上传成功',
      data: {
        url: fileUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 前台接口（公开） ====================

// 获取笔记的投票列表
router.get('/notes/:noteId/polls', notePollController.getNotePolls);

// 提交投票
router.post('/polls/:pollId/vote', notePollController.submitVote);

// 获取投票结果
router.get('/polls/:pollId/results', notePollController.getPollResults);

// 获取当前用户的投票记录
router.get('/polls/:pollId/my-vote', notePollController.getMyVote);

module.exports = router;

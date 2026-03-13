/**
 * @file noteLottery.js
 * @description 笔记抽奖路由
 * @author Arran
 * @copyright 2026 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2026-01-22
 */

const express = require('express');
const router = express.Router();
const noteLotteryController = require('../controllers/noteLotteryController');
const authMiddleware = require('../middlewares/auth');
const { createUpload } = require('../middlewares/upload');
const { s3PostUpload } = require('../middlewares/s3Upload');

// 创建抽奖图片上传实例（保存到 uploads/lotteries 目录）
const lotteryUpload = createUpload('lotteries');

// ==================== 管理端接口（需要认证） ====================

// 创建抽奖
router.post('/admin/notes/:noteId/lotteries', authMiddleware, noteLotteryController.createLottery);

// 更新抽奖
router.put('/admin/notes/:noteId/lotteries/:lotteryId', authMiddleware, noteLotteryController.updateLottery);

// 删除抽奖
router.delete('/admin/notes/:noteId/lotteries/:lotteryId', authMiddleware, noteLotteryController.deleteLottery);

// 获取笔记的所有抽奖（管理端）
router.get('/admin/notes/:noteId/lotteries', authMiddleware, noteLotteryController.getAdminNoteLotteries);

// 获取所有抽奖列表（管理端）
router.get('/admin/lotteries/all', authMiddleware, noteLotteryController.getAllLotteries);

// 获取抽奖统计数据
router.get('/admin/lotteries/:lotteryId/statistics', authMiddleware, noteLotteryController.getLotteryStatistics);

// 获取抽奖参与记录
router.get('/admin/lotteries/:lotteryId/entries', authMiddleware, noteLotteryController.getLotteryEntries);

// 执行开奖
router.post('/admin/lotteries/:lotteryId/draw', authMiddleware, noteLotteryController.drawLottery);

// 导出抽奖数据
router.get('/admin/notes/:noteId/lotteries/:lotteryId/export', authMiddleware, noteLotteryController.exportLotteryData);

// 上传奖项图片
router.post('/admin/lotteries/upload', authMiddleware, lotteryUpload.single('image'), s3PostUpload('lotteries'), (req, res, next) => {
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

// 获取笔记的抽奖列表
router.get('/notes/:noteId/lotteries', noteLotteryController.getNoteLotteries);

// 参与抽奖
router.post('/lotteries/:lotteryId/enter', noteLotteryController.enterLottery);

// 获取当前用户的参与记录
router.get('/lotteries/:lotteryId/my-entry', noteLotteryController.getMyEntry);

module.exports = router;

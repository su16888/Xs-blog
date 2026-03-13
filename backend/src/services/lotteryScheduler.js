/**
 * @file lotteryScheduler.js
 * @description 自动抽奖调度器
 */

const { NoteLottery } = require('../models/associations');
const { Op } = require('sequelize');
const lotteryService = require('./lotteryService');

// 检查间隔（毫秒），默认为 1 分钟
const CHECK_INTERVAL = 60 * 1000;

/**
 * 检查并执行自动抽奖
 */
const checkAndDrawLotteries = async () => {
  try {
    const now = new Date();
    
    // 查找所有符合条件的抽奖：
    // 1. 启用状态 (is_active = true)
    // 2. 未开奖 (is_drawn = false)
    // 3. 自动开奖类型 (draw_type = 'auto')
    // 4. 开奖时间已到 (draw_time <= now)
    const pendingLotteries = await NoteLottery.findAll({
      where: {
        is_active: true,
        is_drawn: false,
        draw_type: 'auto',
        draw_time: {
          [Op.lte]: now
        }
      }
    });

    if (pendingLotteries.length > 0) {
      console.log(`[自动抽奖] 发现 ${pendingLotteries.length} 个待开奖任务`);
      
      for (const lottery of pendingLotteries) {
        try {
          console.log(`[自动抽奖] 正在执行抽奖: ID ${lottery.id} - ${lottery.title}`);
          const result = await lotteryService.executeDraw(lottery.id);
          console.log(`[自动抽奖] ID ${lottery.id} 开奖成功: ${result.totalWinners} 人中奖`);
        } catch (error) {
          console.error(`[自动抽奖] ID ${lottery.id} 开奖失败:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('[自动抽奖] 检查任务出错:', error.message);
  }
};

/**
 * 启动调度器
 */
exports.startScheduler = () => {
  console.log('🕒 自动抽奖调度器已启动');
  
  // 立即执行一次检查
  checkAndDrawLotteries();
  
  // 设置定时任务
  setInterval(checkAndDrawLotteries, CHECK_INTERVAL);
};

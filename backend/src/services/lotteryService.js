/**
 * @file lotteryService.js
 * @description 抽奖业务逻辑服务
 */

const { NoteLottery, NoteLotteryPrize, NoteLotteryEntry } = require('../models/associations');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { sendLotteryWinnerNotification, validateEmailConfig } = require('../utils/email');

/**
 * 执行抽奖核心逻辑
 * @param {number} lotteryId 抽奖ID
 * @returns {Promise<Object>} 抽奖结果
 */
exports.executeDraw = async (lotteryId) => {
  const transaction = await sequelize.transaction();

  try {
    // 获取抽奖信息
    const lottery = await NoteLottery.findByPk(lotteryId, {
      include: [{
        model: NoteLotteryPrize,
        as: 'prizes',
        where: {
          quantity: {
            [Op.gt]: 0
          }
        }
      }]
    });

    if (!lottery) {
      await transaction.rollback();
      throw new Error('抽奖不存在');
    }

    if (lottery.is_drawn) {
      await transaction.rollback();
      throw new Error('抽奖已开奖');
    }

    // 获取所有参与记录
    const entries = await NoteLotteryEntry.findAll({
      where: {
        lottery_id: lotteryId,
        is_winner: false
      },
      order: [['created_at', 'ASC']]
    });

    if (entries.length === 0) {
      // 即使没有参与者，也要标记为已开奖
      await lottery.update({ is_drawn: true }, { transaction });
      await transaction.commit();
      return {
        totalParticipants: 0,
        totalWinners: 0,
        winners: [],
        emailSent: 0,
        emailFailed: 0
      };
    }

    // 执行抽奖算法
    const results = [];
    const prizes = lottery.prizes;

    for (const entry of entries) {
      // 生成随机数
      const random = Math.random() * 100;
      let cumulative = 0;
      let wonPrize = null;

      // 判断是否中奖
      for (const prize of prizes) {
        cumulative += parseFloat(prize.probability);
        if (random <= cumulative && prize.quantity > 0) {
          wonPrize = prize;
          // 减少奖品数量
          await prize.decrement('quantity', { transaction });
          break;
        }
      }

      // 更新参与记录
      if (wonPrize) {
        await entry.update({
          prize_id: wonPrize.id,
          is_winner: true
        }, { transaction });

        results.push({
          entry_id: entry.id,
          participant_email: entry.participant_email,
          prize_name: wonPrize.prize_name
        });
      }
    }

    // 更新抽奖状态
    await lottery.update({
      is_drawn: true
    }, { transaction });

    await transaction.commit();

    // 发送中奖邮件通知（如果启用且配置了邮件）
    let emailSentCount = 0;
    const emailFailedCount = [];

    if (lottery.enable_email_notification && validateEmailConfig()) {
      console.log(`[抽奖] 开始发送中奖邮件通知 (LotteryID: ${lotteryId})...`);

      for (const winner of results) {
        if (winner.participant_email) {
          try {
            // 查找完整的参与记录
            const entry = await NoteLotteryEntry.findOne({
              where: { id: winner.entry_id },
              include: [{
                model: NoteLotteryPrize,
                as: 'prize',
                attributes: ['id', 'prize_name', 'prize_description', 'prize_image']
              }]
            });

            if (entry && entry.prize) {
              const emailResult = await sendLotteryWinnerNotification(entry, lottery, entry.prize);
              if (emailResult) {
                emailSentCount++;
              } else {
                emailFailedCount.push(winner.participant_email);
              }
            }
          } catch (error) {
            console.error(`[抽奖] 发送邮件失败 (${winner.participant_email}):`, error.message);
            emailFailedCount.push(winner.participant_email);
          }
        }
      }

      console.log(`[抽奖] 邮件发送完成: 成功 ${emailSentCount} 封, 失败 ${emailFailedCount.length} 封`);
      if (emailFailedCount.length > 0) {
        console.error('[抽奖] 失败的邮箱列表:', emailFailedCount.join(', '));
      }
    } else {
      console.log('[抽奖] 跳过邮件发送 (未启用或邮件配置无效)');
    }

    return {
      totalParticipants: entries.length,
      totalWinners: results.length,
      winners: results,
      emailSent: emailSentCount,
      emailFailed: emailFailedCount.length
    };

  } catch (error) {
    // 如果事务还没结束，尝试回滚（虽然 sequelize 的 transaction 对象在 commit/rollback 后会失效，但这里为了保险）
    if (!transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
};

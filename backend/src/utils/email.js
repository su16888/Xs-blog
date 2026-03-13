/**
 * @file email.js
 * @description Xs-Blog 邮件发送工具
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const nodemailer = require('nodemailer');
const config = require('../config/config');

// 创建邮件传输器
let transporter;

function createTransporter() {
  if (transporter) {
    return transporter;
  }

  const emailConfig = config.email;

  if (!emailConfig || !emailConfig.host || !emailConfig.port || !emailConfig.auth) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
      user: emailConfig.auth.user,
      pass: emailConfig.auth.pass
    }
  });

  return transporter;
}

// 发送留言通知邮件
async function sendMessageNotification(message, categoryName = '未分类') {
  try {
    const emailTransporter = createTransporter();
    if (!emailTransporter) {
      console.error('[邮件] 邮件传输器创建失败，请检查邮件配置');
      return false;
    }

    const emailConfig = config.email;

    // 从数据库读取网站标题
    const Setting = require('../models/Setting');
    let siteName = config.site.name || '博客系统';
    try {
      const siteTitleSetting = await Setting.findOne({ where: { key: 'siteTitle' } });
      if (siteTitleSetting && siteTitleSetting.value) {
        siteName = siteTitleSetting.value;
      }
    } catch (error) {
      console.log('[邮件] 无法读取网站标题，使用默认值');
    }

    // 美化邮件内容
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 15px; }
          .field-label { font-weight: bold; color: #555; margin-bottom: 5px; }
          .field-value { background: white; padding: 10px; border-radius: 4px; border-left: 4px solid #667eea; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📬 新的留言通知</h1>
            <p>您收到了一条新的留言</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="field-label">留言用户</div>
              <div class="field-value">${message.name}</div>
            </div>
            <div class="field">
              <div class="field-label">联系方式</div>
              <div class="field-value">${message.contact}</div>
            </div>
            <div class="field">
              <div class="field-label">留言分类</div>
              <div class="field-value">${categoryName}</div>
            </div>
            <div class="field">
              <div class="field-label">留言内容</div>
              <div class="field-value">${message.content.replace(/\n/g, '<br>')}</div>
            </div>
            <div class="field">
              <div class="field-label">提交时间</div>
              <div class="field-value">${new Date(message.created_at).toLocaleString('zh-CN')}</div>
            </div>
            <div class="field">
              <div class="field-label">用户IP</div>
              <div class="field-value">${message.ip_address || '未知'}</div>
            </div>
          </div>
          <div class="footer">
            <p>此邮件由 ${siteName} 系统自动发送，请勿回复</p>
            <p>如需处理此留言，请登录后台管理系统</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${siteName}" <${emailConfig.auth.user}>`,
      to: emailConfig.notificationTo,
      subject: `【${siteName}】新的留言 - ${message.name}`,
      html: emailHtml
    };

    console.log('[邮件] 准备发送邮件到:', emailConfig.notificationTo);
    const result = await emailTransporter.sendMail(mailOptions);
    console.log('[邮件] 邮件发送成功:', result.messageId);
    return true;
  } catch (error) {
    console.error('[邮件] 邮件发送失败:', error.message);
    console.error('[邮件] 错误详情:', error);
    return false;
  }
}

// 验证邮件配置
function validateEmailConfig() {
  const emailConfig = config.email;
  if (!emailConfig) {
    return false;
  }

  const requiredFields = ['host', 'port', 'auth.user', 'auth.pass', 'notificationTo'];
  const missingFields = requiredFields.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj && obj[key], emailConfig);
    return !value;
  });

  if (missingFields.length > 0) {
    return false;
  }

  return true;
}

// 发送中奖通知邮件
async function sendLotteryWinnerNotification(entry, lottery, prize) {
  try {
    const emailTransporter = createTransporter();
    if (!emailTransporter) {
      console.error('[邮件] 邮件传输器创建失败，请检查邮件配置');
      return false;
    }

    const emailConfig = config.email;

    // 从数据库读取网站标题
    const Setting = require('../models/Setting');
    let siteName = config.site.name || '博客系统';
    try {
      const siteTitleSetting = await Setting.findOne({ where: { key: 'siteTitle' } });
      if (siteTitleSetting && siteTitleSetting.value) {
        siteName = siteTitleSetting.value;
      }
    } catch (error) {
      console.log('[邮件] 无法读取网站标题，使用默认值');
    }

    // 美化邮件内容 - 中奖通知
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .header .subtitle { margin-top: 10px; opacity: 0.9; }
          .content { background: #f9f9f9; padding: 30px 20px; }
          .congrats-box { background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%); padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 2px solid #f39c12; }
          .congrats-box .emoji { font-size: 48px; margin-bottom: 10px; }
          .congrats-box h2 { margin: 10px 0; color: #d35400; }
          .prize-box { background: white; padding: 20px; border-radius: 8px; border-left: 5px solid #f39c12; margin-bottom: 20px; }
          .prize-box .prize-name { font-size: 20px; font-weight: bold; color: #e74c3c; margin-bottom: 10px; }
          .prize-box .prize-desc { color: #666; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .info-row:last-child { border-bottom: none; }
          .info-label { font-weight: bold; color: #555; }
          .info-value { color: #333; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
          .footer a { color: #667eea; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="emoji">🎉🎊🎁</div>
            <h1>恭喜您中奖啦！</h1>
            <p class="subtitle">您在 ${siteName} 的抽奖活动幸运中奖</p>
          </div>
          <div class="content">
            <div class="congrats-box">
              <div class="emoji">🏆</div>
              <h2>恭喜中奖</h2>
              <p>运气爆棚，您已成功获得以下奖项</p>
            </div>

            <div class="prize-box">
              <div class="prize-name">${prize.prize_name}</div>
              ${prize.prize_description ? `<div class="prize-desc">${prize.prize_description}</div>` : ''}
            </div>

            <div class="field">
              <div class="info-row">
                <span class="info-label">抽奖活动</span>
                <span class="info-value">${lottery.title}</span>
              </div>
              <div class="info-row">
                <span class="info-label">中奖时间</span>
                <span class="info-value">${new Date().toLocaleString('zh-CN')}</span>
              </div>
              ${lottery.description ? `
              <div class="info-row">
                <span class="info-label">活动说明</span>
                <span class="info-value">${lottery.description}</span>
              </div>
              ` : ''}
            </div>

            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-top: 20px;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>📌 温馨提示：</strong><br>
                请妥善保管此邮件，并根据抽奖规则与我们进行对接！
              </p>
            </div>
          </div>
          <div class="footer">
            <p>此邮件由 ${siteName} 系统自动发送，请勿直接回复</p>
            <p>如有疑问，请联系管理员</p>
            <p style="margin-top: 10px;">© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${siteName}" <${emailConfig.auth.user}>`,
      to: entry.participant_email,
      subject: `🎉 恭喜中奖！-${lottery.title}`,
      html: emailHtml
    };

    console.log('[邮件] 准备发送中奖通知邮件到:', entry.participant_email);
    const result = await emailTransporter.sendMail(mailOptions);
    console.log('[邮件] 中奖通知邮件发送成功:', result.messageId);
    return true;
  } catch (error) {
    console.error('[邮件] 中奖通知邮件发送失败:', error.message);
    console.error('[邮件] 错误详情:', error);
    return false;
  }
}

function validateEmailTransportConfig() {
  const emailConfig = config.email;
  if (!emailConfig) return false;
  const requiredFields = ['host', 'port', 'auth.user', 'auth.pass'];
  const missingFields = requiredFields.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj && obj[key], emailConfig);
    return !value;
  });
  return missingFields.length === 0;
}

async function getSiteName() {
  const Setting = require('../models/Setting');
  let siteName = config.site.name || '博客系统';
  try {
    const siteTitleSetting = await Setting.findOne({ where: { key: 'siteTitle' } });
    if (siteTitleSetting && siteTitleSetting.value) {
      siteName = siteTitleSetting.value;
    }
  } catch (error) {}
  return siteName;
}

async function sendOrderPaidAdminNotification(order, service) {
  try {
    const emailTransporter = createTransporter();
    if (!emailTransporter) {
      return false;
    }

    const emailConfig = config.email;
    if (!emailConfig?.notificationTo) return false;

    const siteName = await getSiteName();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 640px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 18px; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 18px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none; }
          .row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .row:last-child { border-bottom: none; }
          .label { color: #6b7280; font-weight: 600; }
          .value { color: #111827; text-align: right; word-break: break-all; }
          .footer { margin-top: 16px; color: #6b7280; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 18px; font-weight: 700;">新订单已支付</div>
            <div style="opacity: .9; margin-top: 4px;">系统通知（管理员）</div>
          </div>
          <div class="content">
            <div class="row"><div class="label">订单号</div><div class="value">#${order.id}</div></div>
            <div class="row"><div class="label">商品</div><div class="value">${service?.name || order.service_id}</div></div>
            <div class="row"><div class="label">金额</div><div class="value">${order.amount}</div></div>
            <div class="row"><div class="label">购买人</div><div class="value">${order.buyer_name || '-'}</div></div>
            <div class="row"><div class="label">邮箱</div><div class="value">${order.buyer_email || '-'}</div></div>
            <div class="row"><div class="label">联系方式</div><div class="value">${order.buyer_contact || '-'}</div></div>
            <div class="row"><div class="label">支付时间</div><div class="value">${new Date().toLocaleString('zh-CN')}</div></div>
            <div class="footer">此邮件由 ${siteName} 系统自动发送，请勿回复</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${siteName}" <${emailConfig.auth.user}>`,
      to: emailConfig.notificationTo,
      subject: `【${siteName}】新订单已支付 #${order.id}`,
      html: emailHtml
    };

    await emailTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    return false;
  }
}

async function sendBuyerPaidNotification(order, service, cards = []) {
  try {
    if (!order?.buyer_email) return false;
    if (!validateEmailTransportConfig()) return false;
    const emailTransporter = createTransporter();
    if (!emailTransporter) return false;

    const emailConfig = config.email;
    const siteName = await getSiteName();

    const isCard = service?.product_type === 'card';
    const isPhysical = service?.product_type === 'physical';

    const cardBlock = isCard && cards.length > 0
      ? `<div style="margin-top: 14px; padding: 12px; background: #111827; color: #f9fafb; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; white-space: pre-wrap; word-break: break-all;">${cards.map(c => c.card_code).join('\\n')}</div>`
      : '';

    const physicalHint = isPhysical
      ? `<div style="margin-top: 14px; color: #374151; font-size: 14px;">您的订单已支付成功，当前状态：未发货。我们将尽快为您发货，发货后会通过邮件发送快递单号。</div>`
      : `<div style="margin-top: 14px; color: #374151; font-size: 14px;">您的订单已支付成功。</div>`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; }
          .container { max-width: 640px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 18px; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 18px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none; }
          .row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
          .row:last-child { border-bottom: none; }
          .label { color: #6b7280; font-weight: 600; }
          .value { color: #111827; text-align: right; word-break: break-all; }
          .footer { margin-top: 16px; color: #6b7280; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 18px; font-weight: 700;">订单已支付</div>
            <div style="opacity: .9; margin-top: 4px;">订单号 #${order.id}</div>
          </div>
          <div class="content">
            <div class="row"><div class="label">商品</div><div class="value">${service?.name || order.service_id}</div></div>
            <div class="row"><div class="label">金额</div><div class="value">${order.amount}</div></div>
            ${order.buyer_name ? `<div class="row"><div class="label">称呼</div><div class="value">${order.buyer_name}</div></div>` : ''}
            ${order.buyer_phone ? `<div class="row"><div class="label">手机号</div><div class="value">${order.buyer_phone}</div></div>` : ''}
            ${order.buyer_address ? `<div class="row"><div class="label">地址</div><div class="value">${order.buyer_address}</div></div>` : ''}
            ${physicalHint}
            ${cardBlock ? `<div style="margin-top: 16px; font-weight: 700; color: #111827;">卡密内容</div>${cardBlock}` : ''}
            <div class="footer">此邮件由 ${siteName} 系统自动发送，请勿回复</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const subjectPrefix = isCard ? '卡密已发货' : isPhysical ? '订单已购买' : '订单已支付';
    const mailOptions = {
      from: `"${siteName}" <${emailConfig.auth.user}>`,
      to: order.buyer_email,
      subject: `【${siteName}】${subjectPrefix} #${order.id}`,
      html: emailHtml
    };

    await emailTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    return false;
  }
}

async function sendBuyerShippedNotification(order, service) {
  try {
    if (!order?.buyer_email) return false;
    if (!validateEmailTransportConfig()) return false;
    const emailTransporter = createTransporter();
    if (!emailTransporter) return false;

    const emailConfig = config.email;
    const siteName = await getSiteName();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; }
          .container { max-width: 640px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); color: white; padding: 18px; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 18px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none; }
          .row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
          .row:last-child { border-bottom: none; }
          .label { color: #6b7280; font-weight: 600; }
          .value { color: #111827; text-align: right; word-break: break-all; }
          .footer { margin-top: 16px; color: #6b7280; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 18px; font-weight: 700;">订单已发货</div>
            <div style="opacity: .9; margin-top: 4px;">订单号 #${order.id}</div>
          </div>
          <div class="content">
            <div class="row"><div class="label">商品</div><div class="value">${service?.name || order.service_id}</div></div>
            <div class="row"><div class="label">快递单号</div><div class="value">${order.tracking_no || '-'}</div></div>
            <div class="row"><div class="label">发货时间</div><div class="value">${order.shipped_at ? new Date(order.shipped_at).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN')}</div></div>
            <div class="footer">此邮件由 ${siteName} 系统自动发送，请勿回复</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${siteName}" <${emailConfig.auth.user}>`,
      to: order.buyer_email,
      subject: `【${siteName}】订单已发货 #${order.id}`,
      html: emailHtml
    };

    await emailTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  sendMessageNotification,
  sendLotteryWinnerNotification,
  validateEmailConfig,
  validateEmailTransportConfig,
  sendOrderPaidAdminNotification,
  sendBuyerPaidNotification,
  sendBuyerShippedNotification
};

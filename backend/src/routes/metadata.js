/**
 * @file metadata.js
 * @description Xs-Blog 元数据路由
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

// 获取URL元数据
router.get('/', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL参数是必需的'
      });
    }

    // 验证URL格式
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: '无效的URL格式'
      });
    }

    // 设置请求头，避免被网站阻止
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    // 获取网页内容
    const response = await axios.get(url, {
      headers,
      timeout: 10000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    // 提取元数据
    const title = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') ||
                 $('meta[name="twitter:image"]').attr('content') || '';

    // 获取网站图标
    let favicon = $('link[rel="icon"]').attr('href') ||
                 $('link[rel="shortcut icon"]').attr('href') ||
                 $('link[rel="apple-touch-icon"]').attr('href') || '';

    // 如果图标是相对路径，转换为绝对路径
    if (favicon && !favicon.startsWith('http')) {
      const baseUrl = new URL(url).origin;
      favicon = new URL(favicon, baseUrl).href;
    }

    // 如果没找到图标，使用默认的favicon.ico
    if (!favicon) {
      const baseUrl = new URL(url).origin;
      favicon = `${baseUrl}/favicon.ico`;
    }

    res.json({
      success: true,
      data: {
        title: title.trim() || new URL(url).hostname,
        description: description.trim() || '点击卡片访问网站',
        favicon,
        image: image.trim() || ''
      }
    });

  } catch (error) {
    console.error('获取URL元数据失败:', error.message);

    // 即使失败也返回默认数据
    const urlObj = new URL(req.query.url);
    const domain = urlObj.hostname.replace('www.', '');

    res.json({
      success: true,
      data: {
        title: domain.charAt(0).toUpperCase() + domain.slice(1),
        description: '点击卡片访问网站',
        favicon: `https://${urlObj.hostname}/favicon.ico`,
        image: ''
      }
    });
  }
});

module.exports = router;
/**
 * @file proxyController.js
 * @description 代理控制器 - 用于转发第三方API请求和视频流（解决跨域问题）
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

/**
 * 代理请求第三方API
 * POST /api/admin/proxy/fetch
 * Body: { url: string }
 */
exports.proxyFetch = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: '缺少URL参数'
      });
    }

    // 验证URL格式
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: '无效的URL格式'
      });
    }

    // 选择http或https模块
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;

    // 发起请求
    const proxyReq = httpModule.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      timeout: 15000
    }, (proxyRes) => {
      let data = '';

      proxyRes.on('data', (chunk) => {
        data += chunk;
      });

      proxyRes.on('end', () => {
        try {
          // 尝试解析为JSON
          const jsonData = JSON.parse(data);
          res.json({
            success: true,
            data: jsonData
          });
        } catch (e) {
          // 如果不是JSON，返回原始数据
          res.json({
            success: true,
            data: data
          });
        }
      });
    });

    proxyReq.on('error', (error) => {
      console.error('代理请求失败:', error);
      res.status(500).json({
        success: false,
        message: '代理请求失败: ' + error.message
      });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(504).json({
        success: false,
        message: '请求超时'
      });
    });

  } catch (error) {
    console.error('代理控制器错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

/**
 * 代理视频流（公开访问，用于前台播放第三方视频）
 * GET /api/proxy/video?url=xxx
 */
exports.proxyVideo = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).send('缺少URL参数');
    }

    // 解码URL
    const decodedUrl = decodeURIComponent(url);

    // 验证URL格式
    let parsedUrl;
    try {
      parsedUrl = new URL(decodedUrl);
    } catch (e) {
      return res.status(400).send('无效的URL格式');
    }

    // 选择http或https模块
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;

    // 获取请求的Range头（支持视频拖动）
    const range = req.headers.range;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': parsedUrl.origin + '/'
      }
    };

    // 如果有Range头，转发它
    if (range) {
      options.headers['Range'] = range;
    }

    const proxyReq = httpModule.request(options, (proxyRes) => {
      // 设置响应头
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');

      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', proxyRes.headers['content-length']);
      }
      if (proxyRes.headers['content-range']) {
        res.setHeader('Content-Range', proxyRes.headers['content-range']);
      }

      // 设置状态码（206 表示部分内容）
      res.status(proxyRes.statusCode);

      // 管道传输视频流
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('视频代理请求失败:', error);
      if (!res.headersSent) {
        res.status(500).send('视频代理请求失败');
      }
    });

    proxyReq.setTimeout(30000, () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).send('请求超时');
      }
    });

    proxyReq.end();

  } catch (error) {
    console.error('视频代理错误:', error);
    if (!res.headersSent) {
      res.status(500).send('服务器错误');
    }
  }
};

/**
 * 下载抖音视频到本地
 * POST /api/admin/proxy/download-douyin-video
 * Body: { videoUrl: string }
 * 将视频下载到 uploads/social-feed/douyinvideo/ 目录
 */
exports.downloadDouyinVideo = async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: '缺少视频URL参数'
      });
    }

    // 清理URL（移除 #.mp4 等标记）
    const cleanUrl = videoUrl.replace(/#\.(mp4|webm|ogg|mov|avi)$/i, '');

    // 验证URL格式
    let parsedUrl;
    try {
      parsedUrl = new URL(cleanUrl);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: '无效的URL格式'
      });
    }

    // 创建保存目录
    const saveDir = path.join(__dirname, '../../uploads/social-feed/douyinvideo');
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `douyin_${uniqueSuffix}.mp4`;
    const filePath = path.join(saveDir, filename);

    // 选择http或https模块
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;

    // 下载视频
    const downloadVideo = () => {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': parsedUrl.origin + '/'
          }
        };

        const proxyReq = httpModule.request(options, (proxyRes) => {
          // 处理重定向
          if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            const redirectUrl = proxyRes.headers.location;
            // 递归处理重定向
            const redirectParsedUrl = new URL(redirectUrl, cleanUrl);
            const redirectHttpModule = redirectParsedUrl.protocol === 'https:' ? https : http;

            const redirectOptions = {
              hostname: redirectParsedUrl.hostname,
              port: redirectParsedUrl.port || (redirectParsedUrl.protocol === 'https:' ? 443 : 80),
              path: redirectParsedUrl.pathname + redirectParsedUrl.search,
              method: 'GET',
              headers: options.headers
            };

            const redirectReq = redirectHttpModule.request(redirectOptions, (redirectRes) => {
              if (redirectRes.statusCode !== 200) {
                reject(new Error(`下载失败，状态码: ${redirectRes.statusCode}`));
                return;
              }

              const fileStream = fs.createWriteStream(filePath);
              redirectRes.pipe(fileStream);

              fileStream.on('finish', () => {
                fileStream.close();
                resolve();
              });

              fileStream.on('error', (err) => {
                fs.unlink(filePath, () => {}); // 删除不完整的文件
                reject(err);
              });
            });

            redirectReq.on('error', reject);
            redirectReq.setTimeout(60000, () => {
              redirectReq.destroy();
              reject(new Error('下载超时'));
            });
            redirectReq.end();
            return;
          }

          if (proxyRes.statusCode !== 200) {
            reject(new Error(`下载失败，状态码: ${proxyRes.statusCode}`));
            return;
          }

          const fileStream = fs.createWriteStream(filePath);
          proxyRes.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            resolve();
          });

          fileStream.on('error', (err) => {
            fs.unlink(filePath, () => {}); // 删除不完整的文件
            reject(err);
          });
        });

        proxyReq.on('error', reject);
        proxyReq.setTimeout(60000, () => {
          proxyReq.destroy();
          reject(new Error('下载超时'));
        });
        proxyReq.end();
      });
    };

    await downloadVideo();

    // 返回本地文件路径
    const localPath = `/uploads/social-feed/douyinvideo/${filename}`;

    res.json({
      success: true,
      message: '视频下载成功',
      data: {
        localPath,
        filename
      }
    });

  } catch (error) {
    console.error('下载抖音视频错误:', error);
    res.status(500).json({
      success: false,
      message: '下载失败: ' + error.message
    });
  }
};

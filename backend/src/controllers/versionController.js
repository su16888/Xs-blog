/**
 * @file versionController.js
 * @description Xs-Blog 版本信息控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 2.0.0
 * @created 2025-11-06
 * @updated 2025-11-07
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const axios = require('axios');

// 版本号规范化函数
const normalizeVersion = (version) => {
  if (!version) return null;
  return String(version).replace(/^v/i, '').trim();
};

// 获取当前版本
exports.getCurrentVersion = async (req, res, next) => {
  try {
    // 从 .env 文件读取版本号
    const version = normalizeVersion(process.env.APP_VERSION || '1.0.0');

    res.json({
      success: true,
      data: {
        version
      },
      message: '获取当前版本成功'
    });
  } catch (error) {
    console.error('获取当前版本失败:', error);
    next(error);
  }
};

// 检查版本更新
exports.checkUpdate = async (req, res, next) => {
  try {
    // 从 .env 文件获取当前版本
    const currentVersion = normalizeVersion(process.env.APP_VERSION || '1.0.0');

    // 构建检测 URL（使用当前版本号作为文件名）
    const versionCheckUrl = `https://gitee.com/smochen/Xs-blog/raw/master/${currentVersion}`;

    let hasUpdate = false;
    let latestVersion = null;

    try {
      // 尝试访问以当前版本号命名的文件
      const giteeResponse = await axios.get(versionCheckUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Xs-Blog-Version-Checker'
        }
      });

      // 如果返回 200，说明文件存在，版本一致，无需更新
      hasUpdate = false;
      latestVersion = currentVersion;
      console.log(`检测当前版本：${currentVersion}，无需更新`);

      return res.json({
        success: true,
        data: {
          currentVersion,
          latestVersion,
          hasUpdate: false,
          message: '当前已是最新版本',
          updateUrl: null,
          releaseNotes: null
        },
        message: '已是最新版本'
      });

    } catch (error) {
      // 如果返回 404，说明文件不存在，需要更新
      if (error.response && error.response.status === 404) {
        hasUpdate = true;
        console.log(`检测当前版本：${currentVersion}，有新版本可更新！`);

        return res.json({
          success: true,
          data: {
            currentVersion,
            latestVersion: null,
            hasUpdate: true,
            message: `当前版本 v${currentVersion} 需要更新`,
            updateUrl: 'https://gitee.com/smochen/Xs-blog/releases',
            releaseNotes: 'https://gitee.com/smochen/Xs-blog/releases'
          },
          message: '发现新版本'
        });
      }

      // 其他错误（网络错误等）
      console.log(`检测当前版本：${currentVersion}，版本检测失败`);
      return res.json({
        success: true,
        data: {
          currentVersion,
          latestVersion: null,
          hasUpdate: false,
          message: '无法连接到更新服务器，请检查网络连接或稍后重试',
          updateUrl: null,
          releaseNotes: null
        },
        message: '版本检测失败'
      });
    }
  } catch (error) {
    console.error('版本检测异常:', error);
    next(error);
  }
};

// 验证后台路径是否有效
exports.verifyAdminPath = async (req, res, next) => {
  try {
    const { path } = req.body;

    // 从 .env 文件获取配置的后台路径
    const configuredAdminPath = process.env.ADMIN_PATH || 'admin';

    // 验证路径是否匹配
    const isValid = path === configuredAdminPath;

    res.json({
      success: true,
      data: {
        isValid
      }
    });
  } catch (error) {
    console.error('验证后台路径失败:', error);
    next(error);
  }
};

// 验证前后端配置一致性（需要认证，仅后台管理员可用）
// v2.9.0 新增：用于检查前后端 adminPath 配置是否一致
exports.checkConfigConsistency = async (req, res, next) => {
  try {
    const { frontendAdminPath } = req.body;

    // 从 .env 文件获取后端配置的后台路径
    const backendAdminPath = process.env.ADMIN_PATH || 'admin';

    // 检查是否一致
    const isConsistent = frontendAdminPath === backendAdminPath;

    res.json({
      success: true,
      data: {
        isConsistent,
        backendAdminPath: isConsistent ? backendAdminPath : undefined, // 只有一致时才返回
        message: isConsistent
          ? '前后端配置一致'
          : '⚠️ 警告：前后端配置不一致！请确保 backend/.env 和 frontend/public/config.js 中的 adminPath 配置相同。'
      }
    });
  } catch (error) {
    console.error('检查配置一致性失败:', error);
    next(error);
  }
};


/**
 * @file ipHelper.js
 * @description IP地址获取工具
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-17
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

/**
 * 获取客户端真实IP地址
 * 按优先级顺序检查以下header：
 * 1. X-Forwarded-For (代理服务器传递的原始客户端IP)
 * 2. X-Real-IP (Nginx等反向代理设置的真实IP)
 * 3. X-Client-IP
 * 4. CF-Connecting-IP (Cloudflare)
 * 5. req.ip (Express默认)
 * 6. req.connection.remoteAddress (传统方式)
 * 7. req.socket.remoteAddress
 *
 * @param {Object} req - Express请求对象
 * @returns {String} 客户端IP地址
 */
function getClientIP(req) {
  // 1. X-Forwarded-For: 可能包含多个IP，格式为 "client, proxy1, proxy2"
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // 取第一个IP（真实客户端IP）
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    const clientIP = ips[0];
    if (clientIP && isValidIP(clientIP)) {
      return clientIP;
    }
  }

  // 2. X-Real-IP: Nginx等设置的真实IP
  const xRealIP = req.headers['x-real-ip'];
  if (xRealIP && isValidIP(xRealIP)) {
    return xRealIP;
  }

  // 3. X-Client-IP
  const xClientIP = req.headers['x-client-ip'];
  if (xClientIP && isValidIP(xClientIP)) {
    return xClientIP;
  }

  // 4. CF-Connecting-IP (Cloudflare)
  const cfConnectingIP = req.headers['cf-connecting-ip'];
  if (cfConnectingIP && isValidIP(cfConnectingIP)) {
    return cfConnectingIP;
  }

  // 5. Express的req.ip
  if (req.ip) {
    const cleanIP = cleanIPv6(req.ip);
    if (isValidIP(cleanIP)) {
      return cleanIP;
    }
  }

  // 6. req.connection.remoteAddress (传统方式)
  if (req.connection && req.connection.remoteAddress) {
    const cleanIP = cleanIPv6(req.connection.remoteAddress);
    if (isValidIP(cleanIP)) {
      return cleanIP;
    }
  }

  // 7. req.socket.remoteAddress
  if (req.socket && req.socket.remoteAddress) {
    const cleanIP = cleanIPv6(req.socket.remoteAddress);
    if (isValidIP(cleanIP)) {
      return cleanIP;
    }
  }

  // 兜底返回
  return 'unknown';
}

/**
 * 清理IPv6格式的IPv4地址
 * 例如：::ffff:127.0.0.1 -> 127.0.0.1
 *
 * @param {String} ip - IP地址
 * @returns {String} 清理后的IP地址
 */
function cleanIPv6(ip) {
  if (!ip) return ip;

  // 移除IPv6前缀
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }

  return ip;
}

/**
 * 验证IP地址格式是否有效
 * 支持IPv4和IPv6
 *
 * @param {String} ip - IP地址
 * @returns {Boolean} 是否有效
 */
function isValidIP(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // 排除明显无效的值
  if (ip === 'unknown' || ip === 'undefined' || ip === 'null') {
    return false;
  }

  // IPv4正则
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    // 验证每个段是否在0-255范围内
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6正则（简化版）
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  if (ipv6Regex.test(ip)) {
    return true;
  }

  return false;
}

/**
 * 判断IP是否为内网地址
 *
 * @param {String} ip - IP地址
 * @returns {Boolean} 是否为内网IP
 */
function isPrivateIP(ip) {
  if (!ip || !isValidIP(ip)) {
    return false;
  }

  // 清理IPv6前缀
  const cleanIP = cleanIPv6(ip);

  // IPv4内网地址段
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (localhost)
    /^169\.254\./,              // 169.254.0.0/16 (链路本地)
    /^0\.0\.0\.0$/              // 0.0.0.0
  ];

  return privateRanges.some(range => range.test(cleanIP));
}

/**
 * 获取IP地址的详细信息
 *
 * @param {Object} req - Express请求对象
 * @returns {Object} IP详细信息
 */
function getIPInfo(req) {
  const ip = getClientIP(req);
  const isPrivate = isPrivateIP(ip);

  return {
    ip,
    isPrivate,
    isValid: isValidIP(ip),
    headers: {
      xForwardedFor: req.headers['x-forwarded-for'] || null,
      xRealIP: req.headers['x-real-ip'] || null,
      xClientIP: req.headers['x-client-ip'] || null,
      cfConnectingIP: req.headers['cf-connecting-ip'] || null
    }
  };
}

module.exports = {
  getClientIP,
  cleanIPv6,
  isValidIP,
  isPrivateIP,
  getIPInfo
};

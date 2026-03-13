/**
 * @file s3Service.js
 * @description S3兼容存储服务模块
 * @author Arran
 * @copyright 2025 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2025-12-02
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const Setting = require('../models/Setting');
const databaseEncryption = require('../utils/databaseEncryption');

// S3客户端实例缓存
let s3Client = null;
let s3Config = null;

/**
 * 获取S3存储配置
 */
async function getS3Config() {
  try {
    const settings = await Setting.findAll({
      where: {
        key: [
          'storageType',
          's3Endpoint',
          's3Region',
          's3Bucket',
          's3AccessKeyId',
          's3SecretAccessKey',
          's3CustomDomain',
          's3PathStyle'
        ]
      }
    });

    const config = {};
    settings.forEach(setting => {
      config[setting.key] = setting.value;
    });

    // 解密 accessKeyId 和 secretAccessKey（它们可能被加密存储）
    let accessKeyId = config.s3AccessKeyId || '';
    let secretAccessKey = config.s3SecretAccessKey || '';

    if (databaseEncryption.isEncrypted(accessKeyId)) {
      accessKeyId = databaseEncryption.decryptField(accessKeyId);
    }
    if (databaseEncryption.isEncrypted(secretAccessKey)) {
      secretAccessKey = databaseEncryption.decryptField(secretAccessKey);
    }

    // 去除前后空格（防止复制时带入空格导致签名错误）
    accessKeyId = accessKeyId.trim();
    secretAccessKey = secretAccessKey.trim();

    return {
      storageType: config.storageType || 'local',
      endpoint: config.s3Endpoint || '',
      region: config.s3Region || 'us-east-1',
      bucket: config.s3Bucket || '',
      accessKeyId,
      secretAccessKey,
      customDomain: config.s3CustomDomain || '',
      pathStyle: config.s3PathStyle === 'true'
    };
  } catch (error) {
    console.error('获取S3配置失败:', error);
    return { storageType: 'local' };
  }
}

/**
 * 初始化或获取S3客户端
 */
async function getS3Client(forceRefresh = false) {
  if (s3Client && !forceRefresh) {
    return { client: s3Client, config: s3Config };
  }

  s3Config = await getS3Config();

  if (s3Config.storageType !== 's3' || !s3Config.endpoint || !s3Config.accessKeyId || !s3Config.secretAccessKey) {
    return { client: null, config: s3Config };
  }

  s3Client = new S3Client({
    endpoint: s3Config.endpoint,
    region: s3Config.region || 'us-east-1',
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey
    },
    forcePathStyle: s3Config.pathStyle
  });

  return { client: s3Client, config: s3Config };
}

/**
 * 刷新S3客户端（配置更新后调用）
 */
async function refreshS3Client() {
  s3Client = null;
  s3Config = null;
  return await getS3Client(true);
}

/**
 * 测试S3连接
 */
async function testS3Connection(testConfig) {
  try {
    const client = new S3Client({
      endpoint: testConfig.endpoint,
      region: testConfig.region || 'us-east-1',
      credentials: {
        accessKeyId: testConfig.accessKeyId,
        secretAccessKey: testConfig.secretAccessKey
      },
      forcePathStyle: testConfig.pathStyle === true || testConfig.pathStyle === 'true'
    });

    const command = new HeadBucketCommand({ Bucket: testConfig.bucket });
    await client.send(command);

    return { success: true, message: 'S3连接测试成功' };
  } catch (error) {
    console.error('S3连接测试失败:', error);
    let message = 'S3连接测试失败';
    if (error.name === 'NotFound') {
      message = '存储桶不存在';
    } else if (error.name === 'InvalidAccessKeyId' || error.Code === 'InvalidAccessKeyId') {
      message = 'Access Key ID 无效';
    } else if (error.name === 'SignatureDoesNotMatch' || error.Code === 'SignatureDoesNotMatch') {
      message = 'Secret Access Key 无效';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      message = '无法连接到S3端点，请检查端点地址';
    } else if (error.message) {
      message = error.message;
    }
    return { success: false, message };
  }
}

/**
 * 上传文件到S3
 * @param {string} localFilePath - 本地文件路径
 * @param {string} s3Key - S3对象键（相对路径，如 uploads/settings/xxx.jpg）
 * @param {string} contentType - 文件MIME类型
 */
async function uploadToS3(localFilePath, s3Key, contentType) {
  const { client, config } = await getS3Client();

  if (!client) {
    throw new Error('S3客户端未配置或存储类型不是S3');
  }

  const fileContent = fs.readFileSync(localFilePath);

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: s3Key,
    Body: fileContent,
    ContentType: contentType,
    ACL: 'public-read'
  });

  await client.send(command);

  // 构建访问URL
  let fileUrl;
  if (config.customDomain) {
    // 使用自定义域名
    fileUrl = `${config.customDomain.replace(/\/$/, '')}/${s3Key}`;
  } else {
    // 使用默认S3 URL
    if (config.pathStyle) {
      fileUrl = `${config.endpoint}/${config.bucket}/${s3Key}`;
    } else {
      // 虚拟主机风格
      const endpointUrl = new URL(config.endpoint);
      fileUrl = `${endpointUrl.protocol}//${config.bucket}.${endpointUrl.host}/${s3Key}`;
    }
  }

  return fileUrl;
}

/**
 * 从S3删除文件
 * @param {string} fileUrl - 文件URL或S3 Key
 */
async function deleteFromS3(fileUrl) {
  const { client, config } = await getS3Client();

  if (!client) {
    throw new Error('S3客户端未配置或存储类型不是S3');
  }

  // 从URL中提取S3 Key
  let s3Key = fileUrl;

  // 如果是完整URL，提取key部分
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    // 尝试从自定义域名URL提取
    if (config.customDomain && fileUrl.startsWith(config.customDomain)) {
      s3Key = fileUrl.replace(config.customDomain.replace(/\/$/, '') + '/', '');
    } else {
      // 从标准S3 URL提取
      const urlObj = new URL(fileUrl);
      s3Key = urlObj.pathname.replace(/^\//, '');
      // 如果是路径风格，需要去掉bucket名称
      if (config.pathStyle && s3Key.startsWith(config.bucket + '/')) {
        s3Key = s3Key.replace(config.bucket + '/', '');
      }
    }
  }

  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: s3Key
  });

  await client.send(command);
  return true;
}

/**
 * 检查当前是否使用S3存储
 */
async function isS3Enabled() {
  const config = await getS3Config();
  console.log('[S3Service] getS3Config result:', {
    storageType: config.storageType,
    endpoint: config.endpoint,
    bucket: config.bucket,
    hasAccessKeyId: !!config.accessKeyId,
    hasSecretAccessKey: !!config.secretAccessKey,
    // 显示密钥的前4位和后4位，用于调试
    accessKeyIdPreview: config.accessKeyId ? `${config.accessKeyId.substring(0, 4)}...${config.accessKeyId.substring(config.accessKeyId.length - 4)}` : 'empty',
    secretAccessKeyPreview: config.secretAccessKey ? `${config.secretAccessKey.substring(0, 4)}...${config.secretAccessKey.substring(config.secretAccessKey.length - 4)}` : 'empty',
    accessKeyIdLength: config.accessKeyId?.length || 0,
    secretAccessKeyLength: config.secretAccessKey?.length || 0
  });
  return config.storageType === 's3';
}

/**
 * 根据存储类型获取文件URL
 * @param {string} filename - 文件名
 * @param {string} moduleName - 模块名（子目录）
 * @param {object} req - Express请求对象
 */
async function getFileUrl(filename, moduleName, req) {
  const config = await getS3Config();

  if (config.storageType === 's3' && config.customDomain) {
    const s3Key = moduleName ? `uploads/${moduleName}/${filename}` : `uploads/${filename}`;
    return `${config.customDomain.replace(/\/$/, '')}/${s3Key}`;
  }

  // 本地存储，使用原有逻辑
  const appConfig = require('../config/config');
  return appConfig.getFileUrl(filename, req);
}

module.exports = {
  getS3Config,
  getS3Client,
  refreshS3Client,
  testS3Connection,
  uploadToS3,
  deleteFromS3,
  isS3Enabled,
  getFileUrl
};

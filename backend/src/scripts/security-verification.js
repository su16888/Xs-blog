/**
 * @file security-verification.js
 * @description Xs-Blog 安全配置验证脚本
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Xs-Blog 安全配置验证开始...\n');

// 检查文件是否存在
function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${exists ? '存在' : '缺失'}`);
  return exists;
}

// 检查环境变量
function checkEnvironmentVariables() {
  console.log('\n📋 环境变量检查:');

  const requiredVars = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET'
  ];

  let allPresent = true;
  requiredVars.forEach(varName => {
    const exists = !!process.env[varName];
    console.log(`${exists ? '✅' : '❌'} ${varName}: ${exists ? '已设置' : '未设置'}`);
    if (!exists) allPresent = false;
  });

  return allPresent;
}

// 检查安全中间件
function checkSecurityMiddleware() {
  console.log('\n🛡️ 安全中间件检查:');

  const middlewareFiles = [
    '../src/middlewares/security.js',
    '../src/middlewares/databaseSecurity.js'
  ];

  let allExist = true;
  middlewareFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? '存在' : '缺失'}`);
    if (!exists) allExist = false;
  });

  return allExist;
}

// 检查加密工具
function checkEncryptionTools() {
  console.log('\n🔐 加密工具检查:');

  const encryptionFiles = [
    '../src/utils/encryption.js',
    '../src/utils/envManager.js',
    '../src/utils/databaseEncryption.js'
  ];

  let allExist = true;
  encryptionFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? '存在' : '缺失'}`);
    if (!exists) allExist = false;
  });

  return allExist;
}

// 检查数据库工具
function checkDatabaseTools() {
  console.log('\n🗄️ 数据库工具检查:');

  const dbFiles = [
    '../src/utils/databaseAudit.js',
    '../src/utils/databaseBackup.js',
    '../src/config/database.js'
  ];

  let allExist = true;
  dbFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? '存在' : '缺失'}`);
    if (!exists) allExist = false;
  });

  return allExist;
}

// 检查配置文件
function checkConfigurationFiles() {
  console.log('\n⚙️ 配置文件检查:');

  const configFiles = [
    '../src/config/config.js',
    '../src/app.js'
  ];

  let allExist = true;
  configFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? '存在' : '缺失'}`);
    if (!exists) allExist = false;
  });

  return allExist;
}

// 测试加密功能
function testEncryptionFunctionality() {
  console.log('\n🧪 加密功能测试:');

  try {
    const encryption = require('../src/utils/encryption');
    const testString = 'test-secret-value';

    // 测试加密
    const encrypted = encryption.encrypt(testString);
    const decrypted = encryption.decrypt(encrypted);

    const encryptionWorks = decrypted === testString;
    console.log(`${encryptionWorks ? '✅' : '❌'} 基础加密/解密: ${encryptionWorks ? '正常' : '异常'}`);

    // 测试数据库加密
    const dbEncryption = require('../src/utils/databaseEncryption');
    const dbEncrypted = dbEncryption.encryptField(testString);
    const dbDecrypted = dbEncryption.decryptField(dbEncrypted);

    const dbEncryptionWorks = dbDecrypted === testString;
    console.log(`${dbEncryptionWorks ? '✅' : '❌'} 数据库字段加密: ${dbEncryptionWorks ? '正常' : '异常'}`);

    return encryptionWorks && dbEncryptionWorks;
  } catch (error) {
    console.log(`❌ 加密功能测试失败: ${error.message}`);
    return false;
  }
}

// 主验证函数
async function main() {
  console.log('🔍 开始安全配置验证...\n');

  const checks = [
    { name: '环境变量', result: checkEnvironmentVariables() },
    { name: '安全中间件', result: checkSecurityMiddleware() },
    { name: '加密工具', result: checkEncryptionTools() },
    { name: '数据库工具', result: checkDatabaseTools() },
    { name: '配置文件', result: checkConfigurationFiles() },
    { name: '加密功能', result: testEncryptionFunctionality() }
  ];

  console.log('\n📊 验证结果汇总:');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;

  checks.forEach(check => {
    const status = check.result ? '✅ 通过' : '❌ 失败';
    console.log(`${status} - ${check.name}`);

    if (check.result) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log('='.repeat(50));
  console.log(`\n📈 总计: ${passed} 项通过, ${failed} 项失败`);

  if (failed === 0) {
    console.log('\n🎉 所有安全配置验证通过！系统已全面保护。');
    console.log('\n📝 下一步:');
    console.log('1. 设置生产环境加密密钥');
    console.log('2. 配置 IP 白名单');
    console.log('3. 启用请求签名验证');
    console.log('4. 定期备份数据库');
  } else {
    console.log('\n⚠️ 部分安全配置存在问题，请检查失败的项目。');
  }

  console.log('\n📚 详细配置请参考: SECURITY_CONFIG.md');
}

// 运行验证
if (require.main === module) {
  main().catch(error => {
    console.error('验证过程出错:', error);
    process.exit(1);
  });
}

module.exports = { main };
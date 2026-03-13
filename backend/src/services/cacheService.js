/**
 * @file cacheService.js
 * @description Redis 缓存服务 - 支持 Redis 和内存缓存降级
 * @author Arran
 * @copyright 2025 Arran (SuMoChen)
 * @version 1.0.0
 * @created 2025-12-19
 */

const Redis = require('ioredis');
const NodeCache = require('node-cache');

// 缓存键前缀
const CACHE_PREFIX = 'xsblog:';

// 缓存键定义
const CACHE_KEYS = {
  SETTINGS: 'settings',
  PAGE_TEXTS: 'page_texts',
  PROFILE: 'profile',
  SOCIAL_LINKS: 'social_links'
};

// 默认缓存时间（秒）
const DEFAULT_TTL = 24 * 60 * 60; // 24小时

class CacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new NodeCache({ stdTTL: DEFAULT_TTL, checkperiod: 120 });
    this.isRedisConnected = false;
    this.initRedis();
  }

  /**
   * 初始化 Redis 连接
   */
  async initRedis() {
    try {
      // 从环境变量获取 Redis 配置
      const redisUrl = process.env.REDIS_URL;
      const redisHost = process.env.REDIS_HOST || '127.0.0.1';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379');
      const redisPassword = process.env.REDIS_PASSWORD || '';
      const redisDb = parseInt(process.env.REDIS_DB || '0');

      const redisConfig = redisUrl ? redisUrl : {
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        db: redisDb,
        retryStrategy: (times) => {
          if (times > 3) {
            console.log('[Cache] Redis 连接失败，使用内存缓存降级');
            return null; // 停止重试
          }
          return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        connectTimeout: 5000
      };

      this.redis = new Redis(redisConfig);

      this.redis.on('connect', () => {
        console.log('[Cache] Redis 连接成功');
        this.isRedisConnected = true;
      });

      this.redis.on('error', (err) => {
        if (this.isRedisConnected) {
          console.error('[Cache] Redis 连接错误:', err.message);
        }
        this.isRedisConnected = false;
      });

      this.redis.on('close', () => {
        this.isRedisConnected = false;
      });

      // 测试连接
      await this.redis.ping();
      this.isRedisConnected = true;
    } catch (error) {
      console.log('[Cache] Redis 不可用，使用内存缓存:', error.message);
      this.isRedisConnected = false;
    }
  }

  /**
   * 获取完整的缓存键
   */
  getFullKey(key) {
    return `${CACHE_PREFIX}${key}`;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒），默认1小时
   */
  async set(key, value, ttl = DEFAULT_TTL) {
    const fullKey = this.getFullKey(key);
    const stringValue = JSON.stringify(value);

    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.setex(fullKey, ttl, stringValue);
      } else {
        this.memoryCache.set(fullKey, stringValue, ttl);
      }
      return true;
    } catch (error) {
      console.error('[Cache] 设置缓存失败:', error.message);
      // 降级到内存缓存
      this.memoryCache.set(fullKey, stringValue, ttl);
      return true;
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {any} 缓存值，不存在返回 null
   */
  async get(key) {
    const fullKey = this.getFullKey(key);

    try {
      let value = null;

      if (this.isRedisConnected && this.redis) {
        value = await this.redis.get(fullKey);
      } else {
        value = this.memoryCache.get(fullKey);
      }

      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error('[Cache] 获取缓存失败:', error.message);
      // 尝试从内存缓存获取
      const memValue = this.memoryCache.get(fullKey);
      if (memValue) {
        return JSON.parse(memValue);
      }
      return null;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  async del(key) {
    const fullKey = this.getFullKey(key);

    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.del(fullKey);
      }
      this.memoryCache.del(fullKey);
      return true;
    } catch (error) {
      console.error('[Cache] 删除缓存失败:', error.message);
      this.memoryCache.del(fullKey);
      return true;
    }
  }

  /**
   * 清除所有前台缓存
   */
  async clearFrontendCache() {
    const keysToDelete = [
      CACHE_KEYS.SETTINGS,
      CACHE_KEYS.PAGE_TEXTS,
      CACHE_KEYS.PROFILE,
      CACHE_KEYS.SOCIAL_LINKS
    ];

    try {
      for (const key of keysToDelete) {
        await this.del(key);
      }

      // 如果 Redis 可用，也清除所有以前缀开头的键
      if (this.isRedisConnected && this.redis) {
        const pattern = `${CACHE_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      // 清除内存缓存
      this.memoryCache.flushAll();

      console.log('[Cache] 前台缓存已清除');
      return { success: true, message: '缓存清除成功' };
    } catch (error) {
      console.error('[Cache] 清除缓存失败:', error.message);
      // 至少清除内存缓存
      this.memoryCache.flushAll();
      return { success: true, message: '缓存清除成功（部分）' };
    }
  }

  /**
   * 获取缓存状态
   */
  async getStatus() {
    const status = {
      redisConnected: this.isRedisConnected,
      memoryCacheKeys: this.memoryCache.keys().length
    };

    if (this.isRedisConnected && this.redis) {
      try {
        const info = await this.redis.info('memory');
        const usedMemory = info.match(/used_memory_human:(\S+)/);
        status.redisMemory = usedMemory ? usedMemory[1] : 'unknown';

        const pattern = `${CACHE_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        status.redisCacheKeys = keys.length;
      } catch (error) {
        status.redisError = error.message;
      }
    }

    return status;
  }
}

// 导出单例
const cacheService = new CacheService();

module.exports = {
  cacheService,
  CACHE_KEYS,
  DEFAULT_TTL
};

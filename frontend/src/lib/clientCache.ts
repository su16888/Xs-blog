/**
 * @file clientCache.ts
 * @description 客户端缓存工具（用于后台页面）
 * @author Arran
 * @copyright 2025 Arran (SuMoChen)
 * @version 1.1.0
 * @created 2025-11-24
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

interface CacheItem {
  data: any
  timestamp: number
  ttl: number // 缓存时间（毫秒）
}

// 进行中的请求Map，用于请求去重
type PendingRequest = {
  promise: Promise<any>
  timestamp: number
}

class ClientCache {
  private storage: Storage | null = null
  private prefix = 'xs-blog-cache:'
  private defaultTTL = 5 * 60 * 1000 // 默认5分钟

  // 存储正在进行中的请求，用于请求去重
  private pendingRequests: Map<string, PendingRequest> = new Map()
  // 请求去重的超时时间（防止永久挂起）
  private pendingTimeout = 30000 // 30秒

  constructor() {
    // 检查是否在浏览器环境
    if (typeof window !== 'undefined') {
      try {
        // 使用 sessionStorage（关闭标签页后自动清除）
        this.storage = window.sessionStorage
      } catch (error) {
        console.warn('SessionStorage 不可用，缓存功能已禁用')
      }
    }
  }

  /**
   * 从系统设置获取缓存时间（分钟）
   */
  private async getCacheTTL(): Promise<number> {
    try {
      // 尝试从 sessionStorage 获取缓存配置
      const cachedSettings = this.storage?.getItem('xs-blog-cache:settings')
      if (cachedSettings) {
        const settings = JSON.parse(cachedSettings)
        const cacheTime = parseInt(settings.cacheTime || '5')
        if (!isNaN(cacheTime) && cacheTime >= 0) {
          return cacheTime * 60 * 1000 // 分钟转毫秒
        }
      }
    } catch (error) {
      // 忽略错误，使用默认值
    }

    return this.defaultTTL
  }

  /**
   * 更新缓存时间配置
   */
  public updateCacheTTL(cacheTimeMinutes: number) {
    if (!this.storage) return

    try {
      const settings = { cacheTime: cacheTimeMinutes }
      this.storage.setItem('xs-blog-cache:settings', JSON.stringify(settings))
      console.log(`✓ 客户端缓存时间已更新: ${cacheTimeMinutes}分钟`)
    } catch (error) {
      console.error('更新缓存配置失败:', error)
    }
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(url: string): string {
    return `${this.prefix}${url}`
  }

  /**
   * 设置缓存
   */
  public async set(url: string, data: any, customTTL?: number): Promise<void> {
    if (!this.storage) return

    try {
      const ttl = customTTL !== undefined ? customTTL : await this.getCacheTTL()

      // 如果 TTL 为 0，表示禁用缓存
      if (ttl === 0) return

      const cacheItem: CacheItem = {
        data,
        timestamp: Date.now(),
        ttl
      }

      const key = this.getCacheKey(url)
      this.storage.setItem(key, JSON.stringify(cacheItem))
    } catch (error) {
      // Storage 满了或其他错误，静默失败
      console.warn('缓存设置失败:', error)
    }
  }

  /**
   * 获取缓存
   */
  public get(url: string): any | null {
    if (!this.storage) return null

    try {
      const key = this.getCacheKey(url)
      const cachedData = this.storage.getItem(key)

      if (!cachedData) return null

      const cacheItem: CacheItem = JSON.parse(cachedData)
      const now = Date.now()

      // 检查是否过期
      if (now - cacheItem.timestamp > cacheItem.ttl) {
        this.storage.removeItem(key)
        return null
      }

      return cacheItem.data
    } catch (error) {
      console.warn('读取缓存失败:', error)
      return null
    }
  }

  /**
   * 请求去重：如果同一个URL的请求正在进行中，返回进行中的Promise
   * @param url - 请求URL
   * @param requestFn - 实际的请求函数
   * @returns Promise<any>
   */
  public async dedupeRequest<T>(url: string, requestFn: () => Promise<T>): Promise<T> {
    const now = Date.now()

    // 检查是否有进行中的请求
    const pending = this.pendingRequests.get(url)
    if (pending) {
      // 检查请求是否超时
      if (now - pending.timestamp < this.pendingTimeout) {
        // console.log(`⏳ 请求去重: ${url}`)
        return pending.promise
      } else {
        // 请求超时，移除旧请求
        this.pendingRequests.delete(url)
      }
    }

    // 创建新请求
    const promise = requestFn()
      .then((result) => {
        // 请求完成，移除pending状态
        this.pendingRequests.delete(url)
        return result
      })
      .catch((error) => {
        // 请求失败，移除pending状态
        this.pendingRequests.delete(url)
        throw error
      })

    // 记录进行中的请求
    this.pendingRequests.set(url, {
      promise,
      timestamp: now
    })

    return promise
  }

  /**
   * 清理超时的pending请求
   */
  public cleanPendingRequests(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.pendingRequests.forEach((pending, url) => {
      if (now - pending.timestamp >= this.pendingTimeout) {
        keysToDelete.push(url)
      }
    })

    keysToDelete.forEach(key => {
      this.pendingRequests.delete(key)
    })

    if (keysToDelete.length > 0) {
      // console.log(`✓ 清理了 ${keysToDelete.length} 个超时的pending请求`)
    }
  }

  /**
   * 删除指定缓存
   */
  public remove(url: string): void {
    if (!this.storage) return

    try {
      const key = this.getCacheKey(url)
      this.storage.removeItem(key)
    } catch (error) {
      console.warn('删除缓存失败:', error)
    }
  }

  /**
   * 清除所有缓存
   */
  public clear(): void {
    if (!this.storage) return

    try {
      const keys: string[] = []

      // 收集所有缓存键
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i)
        if (key && key.startsWith(this.prefix)) {
          keys.push(key)
        }
      }

      // 删除所有缓存
      keys.forEach(key => this.storage!.removeItem(key))

      console.log(`✓ 已清除 ${keys.length} 个客户端缓存项`)
    } catch (error) {
      console.warn('清除缓存失败:', error)
    }
  }

  /**
   * 按前缀清除缓存
   */
  public clearByPrefix(urlPrefix: string): void {
    if (!this.storage) return

    try {
      const keys: string[] = []
      const fullPrefix = this.getCacheKey(urlPrefix)

      // 收集匹配的缓存键
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i)
        if (key && key.startsWith(fullPrefix)) {
          keys.push(key)
        }
      }

      // 删除匹配的缓存
      keys.forEach(key => this.storage!.removeItem(key))

      console.log(`✓ 已清除 ${keys.length} 个匹配 "${urlPrefix}" 的缓存项`)
    } catch (error) {
      console.warn('按前缀清除缓存失败:', error)
    }
  }

  /**
   * 获取缓存统计信息
   */
  public getStats(): { count: number; size: number } {
    if (!this.storage) return { count: 0, size: 0 }

    try {
      let count = 0
      let size = 0

      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i)
        if (key && key.startsWith(this.prefix)) {
          count++
          const value = this.storage.getItem(key)
          if (value) {
            size += value.length
          }
        }
      }

      return { count, size }
    } catch (error) {
      console.warn('获取缓存统计失败:', error)
      return { count: 0, size: 0 }
    }
  }

  /**
   * 清理过期缓存
   */
  public cleanExpired(): void {
    if (!this.storage) return

    try {
      const keys: string[] = []
      const now = Date.now()

      // 收集所有过期的缓存键
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i)
        if (key && key.startsWith(this.prefix)) {
          const value = this.storage.getItem(key)
          if (value) {
            try {
              const cacheItem: CacheItem = JSON.parse(value)
              if (now - cacheItem.timestamp > cacheItem.ttl) {
                keys.push(key)
              }
            } catch {
              // 解析失败的也删除
              keys.push(key)
            }
          }
        }
      }

      // 删除过期缓存
      keys.forEach(key => this.storage!.removeItem(key))

      // if (keys.length > 0) {
      //   console.log(`✓ 已清理 ${keys.length} 个过期缓存项`)
      // }
    } catch (error) {
      console.warn('清理过期缓存失败:', error)
    }
  }
}

// 创建单例实例
const clientCache = new ClientCache()

// 定期清理过期缓存和超时的pending请求（每5分钟）
if (typeof window !== 'undefined') {
  setInterval(() => {
    clientCache.cleanExpired()
    clientCache.cleanPendingRequests()
  }, 5 * 60 * 1000)
}

export default clientCache

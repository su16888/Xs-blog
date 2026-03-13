/**
 * @file requestDeduplicator.ts
 * @description 请求去重器 - 防止相同请求在短时间内重复发送
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly timeout: number = 100; // 100ms 内的重复请求会被合并

  /**
   * 执行请求，如果相同请求正在进行中则返回同一个 Promise
   */
  async deduplicate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const pending = this.pendingRequests.get(key);

    // 如果有正在进行的请求且未超时，返回同一个 Promise
    if (pending && now - pending.timestamp < this.timeout) {
      return pending.promise;
    }

    // 创建新的请求
    const promise = fetcher().finally(() => {
      // 请求完成后，延迟清除（避免立即重复请求）
      setTimeout(() => {
        const current = this.pendingRequests.get(key);
        if (current && current.promise === promise) {
          this.pendingRequests.delete(key);
        }
      }, this.timeout);
    });

    this.pendingRequests.set(key, { promise, timestamp: now });
    return promise;
  }

  /**
   * 清除指定 key 的缓存
   */
  clear(key: string) {
    this.pendingRequests.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clearAll() {
    this.pendingRequests.clear();
  }
}

// 导出单例
export const requestDeduplicator = new RequestDeduplicator();

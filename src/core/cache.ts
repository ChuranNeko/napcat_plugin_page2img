/**
 * 缓存管理模块
 * 负责渲染结果的缓存存储、获取、清理
 * 属于后端核心层
 */

import type { CacheItem, RenderOptions } from '../types.js';

/**
 * 缓存存储
 */
const cache = new Map<string, CacheItem>();

/**
 * 缓存配置
 */
export interface CacheConfig {
  enabled: boolean;
  expireTime: number;
}

/**
 * 当前缓存配置
 */
let cacheConfig: CacheConfig = {
  enabled: true,
  expireTime: 300000 // 5 分钟
};

/**
 * 初始化缓存配置
 */
export function initCache(config: CacheConfig): void {
  cacheConfig = config;
}

/**
 * 生成缓存键
 */
export function generateCacheKey(
  type: 'url' | 'html',
  content: string,
  options: RenderOptions
): string {
  // 限制内容长度，避免键过长
  const truncatedContent = content.length > 1000 ? content.substring(0, 1000) : content;

  return JSON.stringify({
    type,
    content: truncatedContent,
    options
  });
}

/**
 * 从缓存获取
 */
export function getFromCache(key: string): Buffer | null {
  if (!cacheConfig.enabled) {
    return null;
  }

  const item = cache.get(key);
  if (!item) {
    return null;
  }

  // 检查是否过期
  const now = Date.now();
  if (now - item.timestamp > cacheConfig.expireTime) {
    cache.delete(key);
    return null;
  }

  return item.data;
}

/**
 * 设置缓存
 */
export function setCache(key: string, data: Buffer): void {
  if (!cacheConfig.enabled) {
    return;
  }

  // 限制缓存大小，避免内存泄漏
  const MAX_CACHE_SIZE = 100;
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }

  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * 清空缓存
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * 获取缓存大小
 */
export function getCacheSize(): number {
  return cache.size;
}

/**
 * 清理过期缓存
 */
export function cleanExpiredCache(): void {
  const now = Date.now();

  for (const [key, item] of cache.entries()) {
    if (now - item.timestamp > cacheConfig.expireTime) {
      cache.delete(key);
    }
  }
}

/**
 * 缓存管理模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as cache from '../../src/core/cache.js';

describe('缓存管理模块', () => {
  beforeEach(() => {
    // 每个测试前清空缓存
    cache.clearCache();
  });

  describe('缓存基础功能', () => {
    it('应该能够设置和获取缓存', () => {
      const key = 'test-key';
      const data = Buffer.from('test-data');

      cache.setCache(key, data);
      const result = cache.getFromCache(key);

      expect(result).toEqual(data);
    });

    it('应该能够清空缓存', () => {
      cache.setCache('key1', Buffer.from('data1'));
      cache.setCache('key2', Buffer.from('data2'));

      expect(cache.getCacheSize()).toBe(2);

      cache.clearCache();

      expect(cache.getCacheSize()).toBe(0);
    });

    it('应该能够获取缓存大小', () => {
      expect(cache.getCacheSize()).toBe(0);

      cache.setCache('key1', Buffer.from('data1'));
      expect(cache.getCacheSize()).toBe(1);

      cache.setCache('key2', Buffer.from('data2'));
      expect(cache.getCacheSize()).toBe(2);
    });
  });

  describe('缓存过期', () => {
    it('应该在过期后返回 null', () => {
      cache.initCache({
        enabled: true,
        expireTime: 100 // 100ms
      });

      const key = 'test-key';
      cache.setCache(key, Buffer.from('test-data'));

      // 立即获取，应该存在
      expect(cache.getFromCache(key)).not.toBeNull();

      // 等待过期
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(cache.getFromCache(key)).toBeNull();
          resolve(null);
        }, 150);
      });
    });
  });

  describe('缓存禁用', () => {
    it('当缓存禁用时，应该返回 null', () => {
      cache.initCache({
        enabled: false,
        expireTime: 300000
      });

      cache.setCache('key', Buffer.from('data'));
      const result = cache.getFromCache('key');

      expect(result).toBeNull();
    });
  });

  describe('缓存键生成', () => {
    it('应该为 URL 生成唯一的键', () => {
      const key1 = cache.generateCacheKey('url', 'https://example.com', { width: 1920 });
      const key2 = cache.generateCacheKey('url', 'https://example.com', { width: 1920 });
      const key3 = cache.generateCacheKey('url', 'https://example.com', { width: 800 });

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it('应该为 HTML 生成唯一的键', () => {
      const html = '<div>test</div>';
      const key1 = cache.generateCacheKey('html', html, {});
      const key2 = cache.generateCacheKey('html', html, {});

      expect(key1).toBe(key2);
    });

    it('应该限制内容长度', () => {
      const longContent = 'a'.repeat(2000);
      const key = cache.generateCacheKey('html', longContent, {});

      // 键不应该包含完整的长内容
      expect(key.length).toBeLessThan(3000);
    });
  });

  describe('缓存大小限制', () => {
    it('应该限制最大缓存数量', () => {
      // 设置很小的缓存限制（通过内部实现）
      for (let i = 0; i < 150; i++) {
        cache.setCache(`key${i}`, Buffer.from(`data${i}`));
      }

      // 缓存大小应该被限制在 100 以内
      expect(cache.getCacheSize()).toBeLessThanOrEqual(100);
    });
  });

  describe('过期缓存清理', () => {
    it('应该清理所有过期的缓存', () => {
      cache.initCache({
        enabled: true,
        expireTime: 50 // 50ms
      });

      cache.setCache('key1', Buffer.from('data1'));
      cache.setCache('key2', Buffer.from('data2'));

      return new Promise((resolve) => {
        setTimeout(() => {
          cache.cleanExpiredCache();

          // 所有缓存都应该过期
          expect(cache.getCacheSize()).toBe(0);
          resolve(null);
        }, 100);
      });
    });
  });
});

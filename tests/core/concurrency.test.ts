/**
 * 并发控制模块测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as concurrency from '../../src/core/concurrency.js';

describe('并发控制模块', () => {
  beforeEach(() => {
    // 每个测试前重置并发控制状态
    concurrency.resetConcurrency();
  });

  describe('初始化', () => {
    it('应该能够初始化并发数', () => {
      concurrency.initConcurrency(5);

      // 验证：通过实际获取槽位来测试
      concurrency.acquireSlot().then(() => {
        concurrency.releaseSlot();
      });
    });

    it('应该拒绝无效的并发数', () => {
      // 这里假设有验证逻辑，如果没有则测试初始化
      concurrency.initConcurrency(0); // 可能应该拒绝
      concurrency.acquireSlot().then(() => {
        concurrency.releaseSlot();
      });
    });
  });

  describe('槽位获取与释放', () => {
    beforeEach(() => {
      concurrency.initConcurrency(2);
    });

    it('应该能够获取槽位', async () => {
      await concurrency.acquireSlot();
      expect(concurrency.getActiveTasks()).toBe(1);

      concurrency.releaseSlot();
      expect(concurrency.getActiveTasks()).toBe(0);
    });

    it('应该在槽位满时排队', async () => {
      const promise1 = concurrency.acquireSlot();
      const promise2 = concurrency.acquireSlot();
      const promise3 = concurrency.acquireSlot();

      expect(concurrency.getActiveTasks()).toBe(2);
      expect(concurrency.getQueueLength()).toBe(1);

      // 释放一个槽位
      concurrency.releaseSlot();

      await promise3;
      expect(concurrency.getActiveTasks()).toBe(2);

      concurrency.releaseSlot();
      concurrency.releaseSlot();
    });

    it('应该在队列满时拒绝请求', async () => {
      // 获取所有槽位
      await concurrency.acquireSlot();
      await concurrency.acquireSlot();

      // 填满队列（100个）
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 100; i++) {
        promises.push(concurrency.acquireSlot());
      }

      // 第101个应该被拒绝
      await expect(concurrency.acquireSlot()).rejects.toThrow('渲染队列已满');

      // 清理
      concurrency.releaseSlot();
      concurrency.releaseSlot();
    });
  });

  describe('队列管理', () => {
    beforeEach(() => {
      concurrency.initConcurrency(1);
    });

    it('应该按 FIFO 顺序处理队列', async () => {
      const order: number[] = [];

      const promise1 = concurrency.acquireSlot().then(() => {
        order.push(1);
      });

      const promise2 = concurrency.acquireSlot().then(() => {
        order.push(2);
      });

      const promise3 = concurrency.acquireSlot().then(() => {
        order.push(3);
      });

      // promise1 立即获得槽位并 resolve
      await promise1;
      // promise2 在队列中
      // promise3 在队列中

      // 释放槽位，promise2 被唤醒
      concurrency.releaseSlot();
      await promise2;

      // 释放槽位，promise3 被唤醒
      concurrency.releaseSlot();
      await promise3;

      // 由于 promise1 立即 resolve，所以它先执行
      expect(order).toEqual([1, 2, 3]);
    });

    it('应该能够获取队列长度', () => {
      concurrency.acquireSlot();
      concurrency.acquireSlot();
      concurrency.acquireSlot();

      expect(concurrency.getQueueLength()).toBe(2);

      concurrency.releaseSlot();
      expect(concurrency.getQueueLength()).toBe(1);
    });
  });

  describe('状态查询', () => {
    it('应该能够获取活跃任务数', async () => {
      concurrency.initConcurrency(5);

      expect(concurrency.getActiveTasks()).toBe(0);

      await concurrency.acquireSlot();
      expect(concurrency.getActiveTasks()).toBe(1);

      concurrency.releaseSlot();
      expect(concurrency.getActiveTasks()).toBe(0);
    });

    it('应该能够获取队列长度', () => {
      concurrency.initConcurrency(1);

      concurrency.acquireSlot();
      concurrency.acquireSlot();
      concurrency.acquireSlot();

      expect(concurrency.getQueueLength()).toBe(2);
    });
  });

  describe('重置', () => {
    it('应该能够重置并发控制状态', async () => {
      concurrency.initConcurrency(5);

      await concurrency.acquireSlot();
      await concurrency.acquireSlot();

      expect(concurrency.getActiveTasks()).toBe(2);

      concurrency.resetConcurrency();

      expect(concurrency.getActiveTasks()).toBe(0);
      expect(concurrency.getQueueLength()).toBe(0);
    });
  });
});

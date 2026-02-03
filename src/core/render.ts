/**
 * 渲染核心模块
 * 负责页面渲染的核心逻辑
 * 属于后端核心层
 */

import type { Page } from 'puppeteer-core';
import type { RenderOptions } from '../types.js';
import * as browser from './browser.js';
import * as concurrency from './concurrency.js';
import * as cache from './cache.js';

/**
 * 渲染 URL 为图片
 */
export async function renderUrl(
  url: string,
  options: RenderOptions = {}
): Promise<Buffer> {
  // 验证 URL
  new URL(url); // 会抛出异常如果 URL 无效

  // 生成缓存键
  const cacheKey = cache.generateCacheKey('url', url, options);

  // 尝试从缓存获取
  const cached = cache.getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  // 获取队列槽位
  await concurrency.acquireSlot();

  try {
    // 获取浏览器实例
    const browserInstance = browser.getBrowser();
    if (!browserInstance) {
      throw new Error('浏览器未连接');
    }

    // 创建页面
    const page = await browserInstance.newPage();

    try {
      // 设置视口
      await page.setViewport({
        width: options.width || 1920,
        height: options.height || 1080,
        deviceScaleFactor: options.deviceScaleFactor || 1
      });

      // 导航到 URL
      await page.goto(url, {
        timeout: options.timeout || 30000,
        waitUntil: 'networkidle0'
      });

      // 等待选择器
      if (options.selector) {
        await page.waitForSelector(options.selector, { timeout: 5000 });
      }

      // 截图
      const screenshot = await page.screenshot({
        fullPage: options.fullPage || false
      }) as Buffer;

      // 设置缓存
      cache.setCache(cacheKey, screenshot);

      return screenshot;
    } finally {
      await page.close();
    }
  } finally {
    concurrency.releaseSlot();
  }
}

/**
 * 渲染 HTML 为图片
 */
export async function renderHtml(
  html: string,
  options: RenderOptions = {}
): Promise<Buffer> {
  // 验证 HTML 长度
  const MAX_HTML_LENGTH = 10_000_000; // 10MB
  if (html.length > MAX_HTML_LENGTH) {
    throw new Error('HTML 内容过大');
  }

  // 生成缓存键
  const cacheKey = cache.generateCacheKey('html', html, options);

  // 尝试从缓存获取
  const cached = cache.getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  // 获取队列槽位
  await concurrency.acquireSlot();

  try {
    // 获取浏览器实例
    const browserInstance = browser.getBrowser();
    if (!browserInstance) {
      throw new Error('浏览器未连接');
    }

    // 创建页面
    const page = await browserInstance.newPage();

    try {
      // 设置视口
      await page.setViewport({
        width: options.width || 1920,
        height: options.height || 1080,
        deviceScaleFactor: options.deviceScaleFactor || 1
      });

      // 设置内容
      await page.setContent(html, {
        timeout: options.timeout || 30000,
        waitUntil: 'networkidle0'
      });

      // 截图
      const screenshot = await page.screenshot({
        fullPage: options.fullPage || false
      }) as Buffer;

      // 设置缓存
      cache.setCache(cacheKey, screenshot);

      return screenshot;
    } finally {
      await page.close();
    }
  } finally {
    concurrency.releaseSlot();
  }
}

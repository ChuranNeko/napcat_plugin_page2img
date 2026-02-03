/**
 * 浏览器管理模块
 * 负责浏览器实例的连接、断开、状态管理
 * 属于后端核心层
 */

import type puppeteer from 'puppeteer-core';
import { Browser } from 'puppeteer-core';
import type { BrowserStatus } from '../types.js';

/**
 * 浏览器实例
 */
let browser: Browser | null = null;

/**
 * 是否已初始化
 */
let isInitialized = false;

/**
 * 连接到浏览器
 */
export async function connectBrowser(endpoint: string): Promise<void> {
  if (isInitialized && browser && browser.isConnected()) {
    return;
  }

  // 验证端点
  if (!endpoint || endpoint.trim() === '') {
    throw new Error('Chrome 端点未配置，请在插件配置中设置 chromeEndpoint');
  }

  // 动态导入 puppeteer
  const puppeteer = await import('puppeteer-core');

  try {
    browser = await puppeteer.default.connect({
      browserURL: endpoint
    });
    isInitialized = true;
  } catch (error) {
    isInitialized = false;
    throw new Error(`无法连接到 Chrome 实例: ${endpoint}。请确保 Chrome 已启动并使用 --remote-debugging-port=端口 参数。`);
  }
}

/**
 * 断开浏览器连接
 * @param closeProcess 是否关闭浏览器进程
 */
export async function disconnectBrowser(closeProcess: boolean = false): Promise<void> {
  if (!browser || !browser.isConnected()) {
    return;
  }

  try {
    if (closeProcess) {
      const process = browser.process();
      if (process && process.pid) {
        process.kill('SIGTERM');
      }
    }

    await browser.close();
    browser = null;
    isInitialized = false;
  } catch (error) {
    throw new Error(`断开浏览器连接失败: ${error}`);
  }
}

/**
 * 获取浏览器实例
 */
export function getBrowser(): Browser | null {
  return browser;
}

/**
 * 获取浏览器状态
 */
export async function getBrowserStatus(): Promise<BrowserStatus> {
  if (!browser || !browser.isConnected()) {
    return {
      isConnected: false
    };
  }

  try {
    const version = await browser.version();
    const process = browser.process();

    return {
      isConnected: true,
      version,
      pid: process?.pid
    };
  } catch (error) {
    return {
      isConnected: false
    };
  }
}

/**
 * 检查浏览器是否已连接
 */
export function isConnected(): boolean {
  return isInitialized && browser?.isConnected() || false;
}

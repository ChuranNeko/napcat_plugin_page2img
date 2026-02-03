/**
 * 类型定义
 * 集中管理所有类型定义，避免重复
 */

import type puppeteer from 'puppeteer-core';

/**
 * 插件配置接口
 */
export interface Page2ImgPluginConfig {
  chromeEndpoint: string;
  maxConcurrent: number;
  cacheEnabled: boolean;
  cacheExpireTime: number;
  defaultWidth: number;
  defaultHeight: number;
  defaultTimeout: number;
  autoCloseBrowser: boolean;
  [key: string]: unknown;
}

/**
 * 渲染选项接口
 */
export interface RenderOptions {
  width?: number;
  height?: number;
  timeout?: number;
  fullPage?: boolean;
  selector?: string;
  deviceScaleFactor?: number;
}

/**
 * 缓存项接口
 */
export interface CacheItem {
  data: Buffer;
  timestamp: number;
}

/**
 * 渲染 API 接口
 * 供其他插件调用的 API
 */
export interface RenderAPI {
  renderUrl(url: string, options?: RenderOptions): Promise<Buffer>;
  renderHtml(html: string, options?: RenderOptions): Promise<Buffer>;
  clearCache(): void;
  getStats(): RenderStats;
}

/**
 * 渲染统计信息接口
 */
export interface RenderStats {
  connected: boolean;
  activeTasks: number;
  queueLength: number;
  cacheSize: number;
}

/**
 * 浏览器状态接口
 */
export interface BrowserStatus {
  isConnected: boolean;
  version?: string;
  pid?: number;
}

/**
 * 缓存键接口
 */
export interface CacheKey {
  type: 'url' | 'html';
  content: string;
  options: RenderOptions;
}

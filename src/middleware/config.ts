/**
 * 配置管理模块
 * 负责插件配置的加载、保存、验证
 * 属于中间件层
 */

import fs from 'fs';
import path from 'path';
import type { Page2ImgPluginConfig } from '../types.js';

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Page2ImgPluginConfig = {
  chromeEndpoint: '',
  maxConcurrent: 3,
  cacheEnabled: true,
  cacheExpireTime: 300000,
  defaultWidth: 1920,
  defaultHeight: 1080,
  defaultTimeout: 30000,
  autoCloseBrowser: false
};

/**
 * 当前配置
 */
let currentConfig: Page2ImgPluginConfig = { ...DEFAULT_CONFIG };

/**
 * 加载配置
 */
export function loadConfig(configPath: string): Page2ImgPluginConfig {
  try {
    if (fs.existsSync(configPath)) {
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      currentConfig = { ...DEFAULT_CONFIG, ...savedConfig };
    }
  } catch (error) {
    console.warn('加载配置失败，使用默认配置');
  }

  return currentConfig;
}

/**
 * 保存配置
 */
export function saveConfig(configPath: string, config: Page2ImgPluginConfig): void {
  try {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    currentConfig = config;
  } catch (error) {
    throw new Error(`保存配置失败: ${error}`);
  }
}

/**
 * 获取当前配置
 */
export function getConfig(): Page2ImgPluginConfig {
  return currentConfig;
}

/**
 * 更新配置
 */
export function updateConfig(updates: Partial<Page2ImgPluginConfig>): void {
  currentConfig = { ...currentConfig, ...updates };
}

/**
 * 验证配置
 */
export function validateConfig(config: Page2ImgPluginConfig): boolean {
  // 验证 Chrome 端点（允许空字符串）
  if (config.chromeEndpoint && config.chromeEndpoint.trim() !== '') {
    try {
      new URL(config.chromeEndpoint);
    } catch {
      return false;
    }
  }

  // 验证并发数
  if (config.maxConcurrent < 1 || config.maxConcurrent > 10) {
    return false;
  }

  // 验证超时时间
  if (config.defaultTimeout < 1000 || config.defaultTimeout > 300000) {
    return false;
  }

  return true;
}

/**
 * NapCat Puppeteer 中间层插件
 * 为 Napcat 插件提供统一的页面渲染能力
 *
 * 架构说明：
 * - src/core/         后端核心层：浏览器管理、渲染逻辑、缓存、并发控制
 * - src/middleware/  中间件层：路由注册、配置管理
 * - src/index.ts      插件入口：初始化、导出 API
 */

import type { ActionMap } from 'napcat-types/napcat-onebot/action/index';
import { EventType } from 'napcat-types/napcat-onebot/event/index';
import type { PluginModule, PluginLogger, PluginConfigSchema } from 'napcat-types/napcat-onebot/network/plugin-manger';
import type { OB11Message, OB11PostSendMsg } from 'napcat-types/napcat-onebot/types/index';
import { NetworkAdapterConfig } from 'napcat-types/napcat-onebot/config/config';

// 核心层导入
import * as browser from './core/browser.js';
import * as cache from './core/cache.js';
import * as concurrency from './core/concurrency.js';
import * as render from './core/render.js';

// 中间件层导入
import * as configManager from './middleware/config.js';
import { registerRoutes } from './middleware/router.js';

// 类型导入
import type { Page2ImgPluginConfig, RenderAPI } from './types.js';

/**
 * 全局状态
 */
let logger: PluginLogger | null = null;

/**
 * 配置 UI Schema
 */
export let plugin_config_ui: PluginConfigSchema = [];

/**
 * 插件初始化
 */
const plugin_init: PluginModule['plugin_init'] = async (ctx) => {
  logger = ctx.logger;
  logger.info('NapCat Puppeteer 中间层已初始化');

  // 加载配置
  const config = configManager.loadConfig(ctx.configPath);
  logger.info('配置已加载', config);

  // 初始化配置 UI
  plugin_config_ui = ctx.NapCatConfig.combine(
    ctx.NapCatConfig.html(
      '<div style="padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px;">' +
      '<h3>Puppeteer 中间层</h3>' +
      '<p>为 Napcat 插件提供统一的页面渲染能力</p>' +
      '</div>'
    ),
    ctx.NapCatConfig.text('chromeEndpoint', 'Chrome 地址', '', 'Chrome DevTools Protocol 端点地址（如 http://127.0.0.1:9222）'),
    ctx.NapCatConfig.number('maxConcurrent', '最大并发数', config.maxConcurrent, '同时渲染的最大任务数（建议 2-5）'),
    ctx.NapCatConfig.boolean('cacheEnabled', '启用缓存', config.cacheEnabled, '是否缓存渲染结果'),
    ctx.NapCatConfig.number('cacheExpireTime', '缓存过期时间', config.cacheExpireTime, '缓存过期时间（毫秒）'),
    ctx.NapCatConfig.number('defaultWidth', '默认宽度', config.defaultWidth, '默认视口宽度'),
    ctx.NapCatConfig.number('defaultHeight', '默认高度', config.defaultHeight, '默认视口高度'),
    ctx.NapCatConfig.number('defaultTimeout', '默认超时', config.defaultTimeout, '页面加载超时时间（毫秒）'),
    ctx.NapCatConfig.boolean('autoCloseBrowser', '自动关闭浏览器', config.autoCloseBrowser, '插件卸载时自动关闭 Chrome 进程（谨慎使用）')
  );

  // 初始化核心模块
  cache.initCache({
    enabled: config.cacheEnabled,
    expireTime: config.cacheExpireTime
  });

  concurrency.initConcurrency(config.maxConcurrent);

  // 连接浏览器
  if (config.chromeEndpoint && config.chromeEndpoint.trim() !== '') {
    try {
      await browser.connectBrowser(config.chromeEndpoint);
      logger.info('已连接到 Chrome 实例');
    } catch (error) {
      logger.error('连接 Chrome 失败', error);
    }
  } else {
    logger.warn('Chrome 端点未配置，请在插件配置中设置 chromeEndpoint');
  }

  // 注册路由
  registerRoutes(ctx, config);

  logger.info('WebUI 路由已注册');
  logger.info('  - 状态查询: /api/Plugin/ext/' + ctx.pluginName + '/status');
  logger.info('  - 渲染 API: /api/Plugin/ext/' + ctx.pluginName + '/render');
  logger.info('  - 关闭浏览器: /api/Plugin/ext/' + ctx.pluginName + '/browser/close');
};

/**
 * 获取配置
 */
export const plugin_get_config: PluginModule['plugin_get_config'] = async () => {
  return configManager.getConfig();
};

/**
 * 设置配置
 */
export const plugin_set_config: PluginModule['plugin_set_config'] = async (ctx, newConfig) => {
  const validated = configManager.validateConfig(newConfig as Page2ImgPluginConfig);
  if (!validated) {
    throw new Error('配置验证失败');
  }

  configManager.saveConfig(ctx.configPath, newConfig as Page2ImgPluginConfig);

  // 重新初始化浏览器
  if (browser.isConnected()) {
    await browser.disconnectBrowser(false);
  }

  try {
    await browser.connectBrowser((newConfig as Page2ImgPluginConfig).chromeEndpoint);
  } catch (error) {
    logger?.error('重连 Chrome 失败', error);
    throw error;
  }
};

/**
 * 插件清理
 */
const plugin_cleanup: PluginModule['plugin_cleanup'] = async () => {
  const config = configManager.getConfig();

  if (config.autoCloseBrowser && browser.isConnected()) {
    try {
      await browser.disconnectBrowser(true);
      logger?.info('浏览器连接已关闭');
    } catch (error) {
      logger?.error('关闭浏览器失败', error);
    }
  } else if (browser.isConnected()) {
    await browser.disconnectBrowser(false);
    logger?.info('浏览器连接已关闭（Chrome 进程未关闭）');
  }

  concurrency.resetConcurrency();
};

/**
 * 消息处理
 */
const plugin_onmessage: PluginModule['plugin_onmessage'] = async (_ctx, event) => {
  if (event.post_type !== EventType.MESSAGE) {
    return;
  }

  const rawMessage = event.raw_message.trim();

  // 状态查询
  if (rawMessage === '#pup状态' || rawMessage === '#pup status') {
    try {
      const browserStatus = await browser.getBrowserStatus();
      const message = `Puppeteer 中间层状态\n` +
        `连接状态: ${browserStatus.isConnected ? '正常' : '断开'}\n` +
        `活跃任务: ${concurrency.getActiveTasks()}\n` +
        `队列长度: ${concurrency.getQueueLength()}\n` +
        `缓存数量: ${cache.getCacheSize()}`;
      await sendMessage(_ctx.actions, event, message, _ctx.adapterName, _ctx.pluginManager.config);
    } catch (error) {
      logger?.error('获取状态失败', error);
    }
  }

  // 关闭浏览器
  if (rawMessage === '#pup关闭' || rawMessage === '#pup close') {
    try {
      const isConnected = browser.isConnected();
      if (!isConnected) {
        await sendMessage(_ctx.actions, event, 'Chrome 未连接', _ctx.adapterName, _ctx.pluginManager.config);
        return;
      }

      const status = await browser.getBrowserStatus();
      const config = configManager.getConfig();

      await browser.disconnectBrowser(config.autoCloseBrowser);

      if (status.pid && config.autoCloseBrowser) {
        await sendMessage(_ctx.actions, event, `已关闭 Chrome (PID: ${status.pid})`, _ctx.adapterName, _ctx.pluginManager.config);
      } else {
        await sendMessage(_ctx.actions, event, '已断开连接（Chrome 进程仍在运行）', _ctx.adapterName, _ctx.pluginManager.config);
      }

      logger?.info('用户手动关闭浏览器连接');
    } catch (error: any) {
      logger?.error('关闭失败', error);
      await sendMessage(_ctx.actions, event, `关闭失败: ${error.message}`, _ctx.adapterName, _ctx.pluginManager.config);
    }
  }

  // 清空缓存
  if (rawMessage === '#pup清空缓存' || rawMessage === '#pup clear cache') {
    try {
      cache.clearCache();
      await sendMessage(_ctx.actions, event, '缓存已清空', _ctx.adapterName, _ctx.pluginManager.config);
    } catch (error: any) {
      logger?.error('清空缓存失败', error);
      await sendMessage(_ctx.actions, event, `清空失败: ${error.message}`, _ctx.adapterName, _ctx.pluginManager.config);
    }
  }
};

/**
 * 发送消息
 */
async function sendMessage(
  actions: ActionMap,
  event: OB11Message,
  message: string,
  adapter: string,
  config: NetworkAdapterConfig
): Promise<void> {
  const params: OB11PostSendMsg = {
    message,
    message_type: event.message_type,
    ...(event.message_type === 'group' && event.group_id ? { group_id: String(event.group_id) } : {}),
    ...(event.message_type === 'private' && event.user_id ? { user_id: String(event.user_id) } : {})
  };

  try {
    await actions.call('send_msg', params, adapter, config);
  } catch (error) {
    logger?.error('发送消息失败', error);
  }
}

// 导出插件生命周期函数
export { plugin_init, plugin_onmessage, plugin_cleanup };

// 导出 API 供其他插件调用
export const RenderAPI: RenderAPI = {
  renderUrl: render.renderUrl,
  renderHtml: render.renderHtml,
  clearCache: cache.clearCache,
  getStats: () => ({
    connected: browser.isConnected(),
    activeTasks: concurrency.getActiveTasks(),
    queueLength: concurrency.getQueueLength(),
    cacheSize: cache.getCacheSize()
  })
};

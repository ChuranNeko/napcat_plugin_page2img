/**
 * 路由注册模块
 * 负责 API 路由的注册和权限校验
 * 属于中间件层
 */

import type { PluginModule } from 'napcat-types/napcat-onebot/network/plugin-manger';
import type { Page2ImgPluginConfig } from '../types.js';
import * as browser from '../core/browser.js';
import * as cache from '../core/cache.js';
import * as concurrency from '../core/concurrency.js';
import * as render from '../core/render.js';

/**
 * 注册所有路由
 */
export function registerRoutes(
  ctx: PluginModule['plugin_init'] extends (arg: infer T) => any ? T : never,
  config: Page2ImgPluginConfig
): void {
  // 状态查询路由
  ctx.router.get('/status', async (_req: any, res: any) => {
    try {
      const browserStatus = await browser.getBrowserStatus();
      res.json({
        code: 0,
        data: {
          pluginName: ctx.pluginName,
          connected: browserStatus.isConnected,
          browserVersion: browserStatus.version,
          activeTasks: concurrency.getActiveTasks(),
          queueLength: concurrency.getQueueLength(),
          cacheSize: cache.getCacheSize(),
          config
        }
      });
    } catch (error: any) {
      res.status(500).json({ code: -1, message: error.message });
    }
  });

  // 获取配置路由
  ctx.router.get('/config', (_req: any, res: any) => {
    res.json({ code: 0, data: config });
  });

  // 渲染路由
  ctx.router.post('/render', async (req: any, res: any) => {
    try {
      const { url, html, width, height, timeout, fullPage, selector } = req.body;

      const options = {
        width: width || config.defaultWidth,
        height: height || config.defaultHeight,
        timeout: timeout || config.defaultTimeout,
        fullPage,
        selector
      };

      let result: Buffer;

      if (html) {
        result = await render.renderHtml(html, options);
      } else if (url) {
        result = await render.renderUrl(url, options);
      } else {
        res.status(400).json({ code: -1, message: '请提供 url 或 html 参数' });
        return;
      }

      res.setHeader('Content-Type', 'image/png');
      res.send(result);
    } catch (error: any) {
      res.status(500).json({ code: -1, message: error.message });
    }
  });

  // 清空缓存路由
  ctx.router.get('/cache/clear', (_req: any, res: any) => {
    cache.clearCache();
    res.json({ code: 0, message: '缓存已清空' });
  });

  // 关闭浏览器路由
  ctx.router.post('/browser/close', async (_req: any, res: any) => {
    try {
      const isConnected = browser.isConnected();
      if (!isConnected) {
        res.json({ code: -1, message: 'Chrome 未连接' });
        return;
      }

      const status = await browser.getBrowserStatus();
      await browser.disconnectBrowser(config.autoCloseBrowser);

      if (status.pid && config.autoCloseBrowser) {
        res.json({ code: 0, message: `已关闭 Chrome (PID: ${status.pid})` });
      } else {
        res.json({ code: 0, message: '已断开连接（Chrome 进程仍在运行）' });
      }
    } catch (error: any) {
      res.status(500).json({ code: -1, message: error.message });
    }
  });
}

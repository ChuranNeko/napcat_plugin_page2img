# NapCat Plugin Page2Img

为 Napcat 插件提供统一的 Puppeteer 页面渲染能力。

## 项目简介

这是一个 Napcat Puppeteer 中间层插件，为所有 Napcat 插件提供统一的页面渲染 API 能力，具备并发控制、缓存机制等特性。

## 功能特性

- 统一中间层：为所有 Napcat 插件提供 Puppeteer 渲染能力
- 并发控制：智能队列管理，避免资源耗尽
- 缓存机制：自动缓存渲染结果，提升性能
- API 暴露：支持函数调用和 HTTP API 两种方式
- 可配置：支持自定义 Chrome 端点、并发数、缓存策略等

## 快速开始

### 1. 启动 Chrome

```bash
# Windows
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --guest

# Linux/macOS
google-chrome --remote-debugging-port=9222 --guest
```

### 2. 配置插件

在 Napcat WebUI 中配置：
- Chrome 地址：`http://127.0.0.1:9222`
- 最大并发数：3
- 其他配置按需调整

### 3. 其他插件调用

```typescript
const puppeteerPlugin = ctx.getPluginExports('napcat-plugin-page2img');
const screenshot = await puppeteerPlugin.renderUrl('https://example.com', {
  width: 1920,
  height: 1080
});
```

## 聊天命令

| 命令 | 说明 |
|------|------|
| `#pup状态` | 查看插件运行状态 |
| `#pup关闭` | 手动关闭浏览器连接 |
| `#pup清空缓存` | 清空渲染缓存 |

## 文档

详细文档请查看 [.docs](./.docs) 目录：
- [Chrome 启动参数说明](./.docs/CHROME_LAUNCH.md)
- [自动关闭浏览器说明](./.docs/AUTO_CLOSE.md)
- [使用示例](./.docs/EXAMPLES.md)
- [安全性对比分析](./.docs/SECURITY.md)

## 许可证

MIT License

## 问题反馈

如有任何问题，欢迎提交 [issue](https://github.com/ChuranNeko/napcat_plugin_page2img/issues)。

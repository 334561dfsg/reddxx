# Vue + Tailwind Admin Starter

A starter scaffold for a management console using Vue 3, Vite, Vue Router, Pinia, and Tailwind CSS.

## Repository

[github.com/ImEvanQi/fex-admin](https://github.com/ImEvanQi/fex-admin)

## Quick Start

```bash
npm install
npm run dev
```

## Included

## 独立原型入口

根应用仍保留原来的选择入口页（默认 http://localhost:5173/），管理台 `/admin`、前台 `/front/home` 和代理系统 `/agent-system/dashboard` 均保留。

新增 New Trends 代码独立存放于 `newtrend-website/`。只需在仓库根目录运行 `npm run dev`，四套原型共用 5173，新站入口为 `/newtrend/zh-TW/`，不再需要单独启动 4173。`npm run build` 同时打包四套原型，`npm run preview` 可验证统一构建。部署服务器需将 `/newtrend/*` 回退到 `/newtrend/index.html`，其余应用路由回退到 `/index.html`。

## 原有功能

- Console layout (sidebar + top header + content)
- Dashboard page with KPI cards and order table
- Orders page
- Settings page
- Tailwind theme extension and base design tokens
- **资金管理模块**
  - 币种管理
  - **兑换汇率管理** (新增)
  - 手动归集
  - 归集记录
  - 链上交易日志

## Suggested Next Steps

- Add auth and route guards
- Connect APIs and replace store mock data
- Add E2E testing (Playwright) and component tests (Vitest)

## 搜索引擎收录策略

整个站点默认不收录：两个 HTML 入口均包含 `noindex, nofollow, nosnippet, noimageindex`，Vercel 对所有路径（包括静态资源）发送相同的 `X-Robots-Tag` 响应头。`robots.txt` 保持允许抓取，以便搜索引擎能够读取禁止收录指令；不要改成 `Disallow: /` 而阻断这些指令。新增 HTML 入口时必须沿用此策略。

发布前运行 `node --test test/searchIndexingPolicy.test.js`。此策略随前端和 Vercel 配置重新发布生效；已收录的页面需要等待搜索引擎重新抓取后移除。使用其他托管服务时需配置同等响应头。

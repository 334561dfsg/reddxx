# 交易 V2

这是根项目中的交易页面子目录，与管理台、前台、代理系统和 NewQuantCapital 原型共用同一个 Vite 服务和构建流程，不单独启动服务。

在仓库根目录执行 `npm run dev`，打开现有服务的 `/trade-v2/`，或从根页面“选择入口”点击“交易 V2”。URL 不携带语言段，语言偏好保存在本地。默认进入 `/trade-v2/futures/BTCUSDT`；另有 `/trade-v2/options/BTCUSDT` 和 `/trade-v2/spot/BTCUSDT`。

根目录 `npm run build` 同时构建所有入口，交易页输出到 `dist/trade-v2/index.html`；生成的 JS/CSS 由根构建管理，字体与图片复制到 `dist/trade-v2/assets/`。根目录 `npm run preview` 支持交易深链接刷新。部署规则统一由根 `vercel.json` 管理。

本目录 `package.json` 仅保留便捷命令，dev/build/preview 都转发到根项目，不维护单独的依赖安装、Vite 服务或部署配置。测试：`npm test --prefix 交易v2`；语言校验：`npm run check:locales --prefix 交易v2`。

交易页面源码、语言包和资源仍放在本目录，保留合约、期权、现货、K 线与成交量、当前及历史记录、本地下单与平仓撤单逻辑。非交易导航仅占位，不跳转原网站。原网站交易页继续保留。

当前保留现有视觉和交互，本地业务逻辑尚未接入交易后端。未完整复测设备尺寸矩阵、横屏/低高度、200% 缩放、大字体、虚拟键盘、safe-area、触摸、焦点与 Escape/Tab、弹窗层级、断点草稿保留、异步失败、减弱动画和高对比度，修改对应交互时按根 AGENTS.md 补验。

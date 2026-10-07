# 最低充值金额设置：实现与验证

## 用户后续调整

按用户要求移除「最低充值数量预览」整个区块及 Dialog 中的币种/汇率 Mock 加载，仅保留金额设置、说明与保存/取消。精确换算函数和测试保留，供后续充值端接入。以下早期预览与视口记录描述移除前的验证，不代表最终版仍提供预览。

## 范围

公共收款地址页面右上角新增「最低充值金额」；`/assets/publicDepositAddresses` 经 legacy 路由进入现有页面。一个 Dialog 设置统一 USDT 门槛，默认 100，显式保存。按批准的 Mock 范围实现，不发送真实资金配置请求、不改变真实充值入账规则。

- 配置通过独立 repository 保存到当前浏览器 localStorage；刷新后保留。默认值只用于从未保存的配置，损坏/不可访问的存储显示错误，不静默重置。
- 换算复用 `createExchangeRatePairsMock()` 的启用市场汇率，不使用买卖加价；币种精度来自 `createAssetsCoinsMock()`。优先 coin/USDT，缺失时使用 USDT/coin。USDT 自身为 1:1。
- 十进制字符串转 BigInt 分数，计算最终数量时向上取整，避免浮点误差及低于门槛。无有效汇率/精度返回不可计算。
- 现有数据中 USDC、TRX 缺少汇率/精度，BNB 缺少币种精度，因此明确展示暂无法计算。未编造价格或把稳定币强行当成 1:1。
- 当前币种/汇率管理页各自使用独立 Mock 快照；此预览不是实时行情，也不随其他管理页的临时修改联动。生产接入需共享服务端配置、汇率及币种元数据，并在充值端实施校验、权限和审计。

## 状态与交互声明

`settingsState`：owner 为 MinimumDepositDialog，scope 为当前浏览器的全局充值演示配置；draftSettings=draft，savedSettings/effectiveSettings=saved，defaultSettings=100 USDT，applyMode=explicit-save。dirty 以规范金额比较，取消/关闭/Escape 遇到更改先展示「继续编辑/放弃更改」。路由离开和浏览器离开有未保存保护。成功结果在页面显示；读取失败可重新读取，写入失败保留草稿重试，版本冲突需重新打开。

`numericInputState`：字段 minimum-deposit-amount，money/USDT 固定单位，draft 原文与 parsed 规范字符串、saved 提交值分离。大于 0、最多 12 位整数与 6 位小数；只去除首尾空格，拒绝科学计数法、千分位、负数、全角字符和超精度，不静默截断。文本输入不启用滚轮或步进改值。提交冻结规范字符串和保存版本；同一成功会话拒绝重复保存；composition 期间阻止 Enter 提交。

`formLayoutState` / `fieldGuidanceState`：单一字段、始终单列，DOM/视觉/Tab 顺序一致。必填 label、USDT 单位、精度帮助与错误通过稳定 ID 关联，首次 blur 或提交后显示字段错误。固定标题/右上角关闭、固定页脚，只有正文滚动；长文本可折行。标题、说明、数量预览、错误和取消在窄屏保留。无条件字段或自定义 Select。

`buttonActionState`：页面入口是次要 disclosure，保存为唯一 primary submit；取消/关闭为关闭动作，放弃为明确 discard，重新读取为失败恢复。原生按钮保留名称；提交中禁用关闭/重复保存；成功会话不能重复保存。当前 Mock 无新增远端权限模型；真实权限不可由前端按钮替代。

Dialog：复用 useDialogLifecycle 的共享层级、焦点循环、背景 inert、滚动锁及退出后焦点返回。遮罩无关闭 handler，200ms 入场淡入+0.96 缩放，150ms 退场；reduced-motion 下 50ms 淡入淡出且无缩放。单字段任务在所有视口维持同一个 Dialog，变化时不重建会话。四向 safe-area padding 和 vh/dvh 回退。

## 已执行

- `node --test test/minimumDeposit.test.js`：5 项通过。覆盖正反汇率、上取整、小数误差、非法金额、无汇率/精度、禁用汇率、默认/持久化、版本冲突、存储失败/损坏。
- `npm run build`：通过；现有大 chunk 警告保留。
- `npm test`（Node 26.9）：640 项，636 通过，4 个既有 `test/userOnchainWalletDrawer.test.js` 用例因向只读 global.navigator 赋值失败：
  - wallet drawer reveals an address before allowing successful copy feedback
  - wallet drawer keeps a failed copy error visible as an alert
  - wallet drawer serializes copies across addresses and disables segment actions while pending
  - wallet drawer blocks closing during copy and ignores a stale completion after reopening
- `node --no-experimental-global-navigator --test`：640 项全部通过。
- 实际浏览器：给定 URL 跳转、打开默认 100、0 的错误提示、修改 250 保存、刷新重开仍为 250、300 草稿取消/放弃后仍为 250、测试结束恢复为 100。
- 实际浏览器：初始输入焦点，Tab 从保存到关闭、Shift+Tab 从关闭到保存；Escape 对 dirty 草稿展示放弃确认；遮罩点击不关闭；关闭后焦点回到入口，inert 清零、body overflow 恢复。
- 实际浏览器：375×667 窄屏和 812×375 横屏截图、横竖屏切换保留草稿和单实例；1440×900、1280×720、768×1024、1024×768、320×568、812×375 检查 Dialog/页脚在视口内、外框 overflow hidden、无内部横向溢出。低高度下正文滚动且标题/页脚固定。

## 未验证及所需检查

- 真实移动设备触摸、软键盘、动态浏览器栏、四向非零 safe-area：需 iOS/Android 真机检查输入/保存可达与键盘避让；视口缩小不能代替软键盘。
- 200% 浏览器缩放、系统字号放大、长翻译文本、高对比度和系统 reduced-motion：需对应系统/浏览器设置后复核文本、焦点、动画和操作可达。
- 读屏、IME 候选 Enter、剪贴板粘贴：需 VoiceOver/NVDA、中文输入法及真实剪贴板运行验证。
- 动画中连续开关、关闭中变更断点、嵌套层焦点、路由/卸载竞态、动画清理精确次数：需事件时序记录及故障注入测试；本次只验证普通关闭清理。
- 存储失败、损坏与版本冲突已做领域测试，尚未在浏览器中注入失败复核错误恢复；localStorage 版本检查不提供多标签事务原子性。
- 真实后台配置、权限变化、跨设备同步、实时汇率/时效、审计、充值提交/入账执行最低限额：当前仓库未接入，需服务端与充值端联调；不在本次 Mock 功能通过声明中。

最终简化版已重新构建通过；实际浏览器打开确认默认 100、金额输入、关闭、取消、保存仍存在，「最低充值数量预览」标题数量为 0。最终版未重新执行上述全套视口/键盘测试；其验证记录属于移除区块前版本。

## 最终 MFA 补充

按用户要求，保存设置必须先经过 MFA。适配器采用与既有充值地址轮换一致的 Mock 验证码 `123456`；不是生产 TOTP 服务。请求前冻结金额及配置版本，错误可重试，取消/卸载作废待验证快照，重复确认不会重复写入。设置 Dialog 保持在下层，MFA 退出恢复保存按钮焦点后再关闭设置 Dialog，最终返回页面入口。

已执行两项新增行为测试（验证前零写入、错误重试、冻结快照、重复确认、取消后迟到验证零写入）。最终 `node --no-experimental-global-navigator --test` 共 642 项通过，最终构建通过。真实浏览器已检查错误码、取消保留 150 草稿、正确码保存、清除 inert/滚动锁及返回「最低充值金额」入口；最终恢复 100。MFA 新增层未重跑完整跨端、读屏、软键盘、缩放和 reduced-motion 矩阵，仍需对应环境验证。真实服务端 MFA、权限和原子保存未接入。

用户要求的数字格式帮助及演示配置说明段落也已从 Dialog 移除；错误提示仍保留。输入 aria-describedby 仅在对应错误存在时引用错误节点。

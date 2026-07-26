# 账户间划转 Select-only Combobox 设计

## 目标

将“账户间划转”弹窗中以卡片形式展示的“从”“到”“币种”三个单选字段恢复为紧凑的下拉选择外观，但不使用原生 `<select>`。选择器按项目最新单选 Combobox 规范实现，保留现有划转业务语义、默认值、校验、余额展示和提交结果。

本次仅修改账户间划转。客服入金及其他资金操作保持现状。

## 方案

新增后台通用的 Select-only Combobox 组件，并在 `UserTransferAction` 中复用三个实例。选项少且稳定，不需要搜索，因此明确使用 `searchPlacement: none` 对应的 WAI-ARIA Select-only Combobox 形态。

选择器由保持 DOM 焦点的主 Combobox 和打开时渲染的 Listbox 组成：

- 主控件展示字段当前已提交的标签或“请选择”，提供可见字段标签，并声明 `role="combobox"`、稳定的 `aria-controls`、`aria-expanded` 和 Listbox 语义。
- Listbox 锚定主控件，宽度至少与主控件一致，并在可用视口内选择向上或向下展开；必要时传送到 `body`，避免被 Dialog 的滚动区域裁切。
- 每个 option 使用稳定 ID、`role="option"` 和明确的禁用状态。打开时仅 active option 暴露 `aria-selected="true"`，主控件只在 active option 已渲染时设置 `aria-activedescendant`。
- 打开、关闭动画分别使用 `150ms ease-out` 和 `100ms ease-in`；Reduced Motion 下取消位移并将淡入淡出限制在 50ms 内。

## 交互与状态

组件分别维护已提交值、已提交 option、打开状态和 active option。焦点始终留在主 Combobox，移动 active 不提交业务值。

- 关闭时，Space 或 Enter 打开；ArrowUp、ArrowDown 也可打开并定位 active。
- 打开时，ArrowUp、ArrowDown、Home、End 在启用选项间导航；Enter 或 Space 提交 active 并关闭。
- 可打印字符执行循环 type-ahead，只移动 active，不提交。
- Escape 放弃 active 变化并关闭；Tab 关闭后继续正常 Tab 顺序。
- 鼠标或触摸点击启用 option 时明确提交并关闭；禁用 option 不可提交。
- 打开时 active 的对账顺序为：仍有效的现有 active、有效的已提交项、首个启用项、无 active。
- 组件禁用时不可聚焦、打开或提交；只读时可读取当前值但不可更改。

## 划转业务规则

三个字段继续绑定现有表单值：`fromAccountKey`、`toAccountKey` 和 `coinKey`。提交事件及 payload 结构不变。

- 默认来源账户仍为“市币”，默认目标账户仍为“交易合约”，币种默认为空并展示“请选择”。
- “到”账户选项中，当前“从”账户始终禁用。
- 用户改变“从”账户后，如果当前“到”账户与其相同，则保留原始目标值并把字段标记为无效，显示关联错误，提交时要求用户重新选择；不得静默清空或自动替换。
- 重新选择有效的“到”账户后解除错误。
- 选项刷新后若已提交值不存在，组件保留原始值和缓存标签，显示失效状态，并阻止划转提交，直到用户重新选择有效项。
- “全部”、来源余额计算、金额输入、现有数量校验、成功 payload 和反馈保持不变。

## Dialog 与响应式

选择器 popup 是 Dialog 内的非模态子浮层，不创建第二个遮罩、焦点陷阱或滚动锁。它注册为 Dialog 内部 popup，使点击其 Portal 内容仍属于当前 Dialog；Dialog 的遮罩点击禁止关闭、关闭动画、焦点约束和返回焦点逻辑保持不变。

选择器不根据设备名称改变业务能力。窄屏、低高度和 200% 缩放下仍保持相同字段和键盘语义；popup 根据可用空间翻转并限制自身最大高度，只有 options 区滚动，避免产生关键流程的双向滚动。打开期间窗口变化只重新定位同一实例，不改变已提交值或 active 状态。

## 错误处理

必填状态和业务错误由主 Combobox 承担，并通过 `aria-required`、`aria-invalid` 和存活的错误文本 ID 关联。重复 option value 属于配置错误：组件不允许打开或提交歧义值，并显示可读错误。失效值保留缓存标签并明确提示重新选择。

账户冲突错误归“到”账户字段所有，不在三个字段重复播报。点击划转时仍执行最终业务校验，防止 UI 状态与提交之间发生竞态。

## 测试与验收

新增 Select-only Combobox 组件测试，覆盖：

- Enter、Space、方向键、Home、End、Escape、Tab 和 type-ahead。
- 点击提交、禁用 option 跳过、active 对账及唯一 `aria-selected`。
- 稳定 ID、`aria-controls`、`aria-activedescendant`、required、invalid、disabled 和 readonly。
- orphaned invalid、重复值配置错误、外部值与 options 更新。
- Portal popup、外部点击关闭、视口翻转、窗口变化、卸载清理和 Reduced Motion 样式契约。

更新账户间划转测试，覆盖三个 Combobox 的默认值、完整选择和原有 payload；验证来源切换导致目标冲突时不静默改值、显示错误并阻止提交，重新选择后可提交。继续运行 Dialog 生命周期相关测试和完整构建。

真实浏览器中的鼠标、触摸、键盘、辅助技术、1440×900、1280×720、平板、窄屏与横屏手机、低高度、200% 缩放、虚拟键盘、安全区域、Reduced Motion、高对比度和长文本检查，只有实际执行后才报告为已验证；未执行的项目必须在交付说明中明确列为未验证并写明所需检查。

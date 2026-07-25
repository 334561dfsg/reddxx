# 自绘可搜索单选 Select 交互规范设计

## 目标与边界

为自绘、单选且值只能来自已有 option 的 Select 建立唯一规范。覆盖 `auto`、`inline`、`panel`、`drawer`、`none`；不覆盖多选、标签/自由创建、树/级联/日期选择或含独立交互 option。本次只更新规范，不修改业务组件。

## 状态与提交

分离 `selectedValue`、`selectedOption`、`query`、`activeOption`、`open`、`loading`、`error`、`searchPlacement`、`resolvedPlacement` 与 `inline` 的派生 `displayText`。新提交只能来自当前存在且启用的 option；搜索、Hover、active、刷新和模式切换不能隐式提交。

此前合法提交值可在刷新后成为 orphaned invalid：保留 raw value 与缓存标签，显示失效；按风险阻止表单提交或要求重选，不得静默清除/替换。重选有效 option 后恢复。

每次打开保存会话快照。`inline` 关闭时显示已提交标签/允许空展示；打开初始化空草稿查询，首次编辑替换标签，后续编辑仅改草稿；提交后显示新标签。外部关闭、Escape、Tab 离开和允许的 Drawer 关闭均丢弃 query/active 草稿、恢复标签，且不触发值变化。

## 确定性位置解析

显式配置永远优先，显式 `drawer` 在宽屏仍为 Drawer。只有 `auto` 使用稳定、未过滤的 option 元数据与声明的产品/视口能力，按此有序决策：

1. 搜索不需要且选项少而稳定：`none`。
2. 受限空间/移动任务且需要搜索或软键盘影响明显：`drawer`。
3. 必须持续展示当前值：`panel`。
4. 已声明高频名称/代码/UID 搜索：`inline`。
5. 仍不能唯一决定：产品显式配置；Agent 不猜测。

超过约 7 项只提示评估 type-ahead/搜索，不是阈值。解析模式、条件与理由必须可记录/测试；打开会话内冻结，只有已声明的视口、输入能力或虚拟键盘变化可转换。过滤结果数绝不参与解析；转换保持单实例、状态、ID、请求和回调。

## 模式、ARIA 与校验归属

- `inline`：主输入为 Editable Combobox，带字段标签、`role="combobox"`、`aria-expanded`、稳定 Listbox `aria-controls`、`aria-autocomplete="list"`、仅 active 已渲染时的 `aria-activedescendant`；必填/失效时分别设置 `aria-required="true"`/`aria-invalid="true"` 并关联选择错误。它承担业务校验。
- `panel`：外层 disclosure button 展示场景化字段名、当前值和动作名，`aria-expanded`/`aria-controls` 指向 panel container；未直接控制 Listbox 不得写 `aria-haspopup="listbox"`。打开聚焦顶部内层搜索 Combobox；内层在列表可见时 expanded、controls 稳定 Listbox、active descendant 只指 DOM option。外层字段包装/trigger 承担值、必填和选择错误，内层仅承担搜索错误；动画后 collapsed 并返回外层焦点。
- `drawer`：外层 button 有 `aria-haspopup="dialog"`、`aria-controls` Drawer dialog、`aria-expanded`；打开聚焦固定标题下的内层搜索 Combobox。内层和 panel 相同；外层承担业务校验。Drawer 关闭动画后 collapsed 并返回焦点，执行完整 Drawer 焦点陷阱/滚动/遮罩规则。
- `none`：只使用 WAI-ARIA Select-only Combobox，不允许 button + Listbox 替代。主 Combobox 有字段标签/值、`role="combobox"`、expanded、controls、隐含或显式 `aria-haspopup="listbox"`、`aria-required="true"`/`aria-invalid="true"` 与关联错误；焦点留在主控件，active descendant 只指 DOM option。

每个搜索输入有场景化可访问名称，不能只靠无上下文占位符。原生元素优先 `disabled`/`readonly`；自绘使用 `aria-disabled`/`aria-readonly` 并阻止交互。disabled option 必须 `aria-disabled="true"` 且导航跳过。

## active、选项与键盘

Listbox 为 `role="listbox"`；options 有稳定 ID、`role="option"`。打开时唯一 active option 使用 `aria-selected="true"`，并由 `aria-activedescendant` 引用；已提交但非 active option 仅有视觉标记。无 active 时所有 option false 并移除 active descendant；关闭后不暴露隐藏 selected option。只有点击/触摸 option 或 active 上 Enter（`none` 中明确允许的 Space）提交。

query、结果、虚拟渲染或模式变更时按顺序对账 active：仍启用且渲染的 active；否则启用且渲染的 committed；否则首个启用且渲染项；否则 null。切入 `none` 保留查询草稿但暂停过滤、显示全部；同一会话离开 `none` 恢复过滤，关闭会话丢弃草稿。

Editable 模式 Arrow 导航、Enter 提交；Home/End、左右、Backspace/Delete 和平台修饰键保持原生 caret 语义。`none` 可用 Arrow、Home/End 和 type-ahead 移动 active；关闭时 Space/Enter 打开，打开时 Enter 提交（Space 仅在明确定义为同等激活时提交）；Escape 放弃草稿并关闭，Tab 关闭并继续页面顺序。

## 关闭、Tab、错误与布局

PC inline 无其他 popup 控件时 Tab 关闭；其重试是输入后相邻、可 Tab 的 composite 按钮，离开整个复合区才关闭。panel Tab 可在搜索、状态、重试间移动，离开复合区才关闭；重试绝不放入 option。Drawer Tab/Shift+Tab 始终在焦点陷阱内，不关闭 Drawer。

PC 弹层锚定 inline Combobox、panel trigger 或 select-only Combobox；非模态、可翻转/Portal、搜索与状态固定、仅 options 滚动。Drawer 搜索位于固定标题下、仅 options 滚动。PC 初开 `150ms ease-out`，关闭 `100ms ease-in`；reduced motion 最多 50ms 无位移。远程搜索约 250ms 防抖，取消/忽略过期结果；失败保持打开、文本错误和可达重试。

## 验收

验证显式五模式与 auto 决策记录/冻结/允许转换；inline 文本恢复；panel/drawer outer/inner ARIA、ID、焦点和动画后返回；none select-only 键盘；唯一 aria-selected、active 对账、query 暂停；校验归属；各模式 Tab/重试；editable caret；orphaned invalid；disabled/read-only；本地/远程竞态、虚拟列表、Portal、缩放、虚拟键盘、断点与 reduced motion。未执行项必须标记未验证并说明检查。

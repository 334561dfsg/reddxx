# 自绘可搜索单选 Select 交互规范设计

## 目标

在 `frontend-product-interaction-standards` Skill 中新增自绘、可搜索、单选 Select 的完整交互规范。搜索位置按 `auto`、`inline`、`panel`、`drawer`、`none` 场景选择，所有模式只能提交已有选项，不允许把任意搜索文本作为业务值。

本次只建立规范，不实现或整改业务组件。多选、标签输入、自由文本创建和批量选择不在本次范围内。

## 组织方式

- 新增 `references/selects-comboboxes.md`，作为自绘可搜索单选 Select 的规则、状态模型和验收标准唯一事实来源。
- 在 `SKILL.md` 增加自动路由：涉及 Select、Combobox、下拉选择、可搜索选择器或 Autocomplete 时，必须完整读取该文件。
- 在公开 `README.md` 增加能力摘要和目录项。
- 在项目 `AGENTS.md` 增加可独立执行的关键硬性约束。
- PC / 移动端转换同时执行 `responsive-adaptive.md`；移动端转换为 Drawer 时同时执行 `drawers.md`，兼容规则全部执行。

## 搜索位置与组件模式

所有模式使用 Listbox，并且组件内部必须分离以下状态：

- `selectedValue`：已提交的业务值。
- `selectedOption`：与业务值对应的完整选项。
- `query`：当前搜索文本。
- `activeOption`：键盘当前高亮但尚未提交的选项。
- `open`：弹层是否打开。
- `loading`、`error`：异步搜索状态。
- `searchPlacement`：搜索位置策略，取 `auto`、`inline`、`panel`、`drawer` 或 `none`。

业务可显式指定 `searchPlacement`。`auto` 根据选项规模、搜索频率、是否需要持续展示已选值、可用空间、输入方式和虚拟键盘影响解析最终模式；Agent 不能凭个人偏好选择，也不应使用脆弱固定数量阈值。选项超过约 7 项时，应评估 type-ahead 或搜索是否必要。

- `inline`：主输入框为 Editable Combobox，同时展示已选值并承载搜索，适合频繁按名称、代码或 UID 搜索。
- `panel`：外部为展示已选值的 Select 触发按钮；PC 弹层顶部的搜索输入才是控制 Listbox 的 Combobox，适合必须持续看见已选值的 PC 表单。触发按钮不得错误标为 Editable Combobox。
- `drawer`：外部为触发按钮；Drawer 固定标题区下方的搜索输入是控制 Listbox 的 Combobox，适合移动端、选项多或虚拟键盘显著影响布局的场景，并执行完整 Drawer 规则。
- `none`：少量简单选项不显示搜索框，使用 Select-only Combobox 或按钮 + Listbox，并提供键盘 type-ahead；不得渲染假的搜索输入。

搜索、键盘移动和 Hover 只能改变 `query` 或 `activeOption`，不能直接改变 `selectedValue`。改变搜索位置或断点时必须保留同一状态，不得清空已选值、重复请求或回调，也不得产生多实例。

只有明确选择选项或按 `Enter`、或执行允许的清空操作后才能提交值变化。

## 打开、关闭与提交

- 点击当前模式的输入区或外部触发按钮打开；`ArrowDown` 和可选的 `Alt + ArrowDown` 也可以打开。
- 打开时，有已选值则定位并高亮已选项；无已选值时可高亮第一项，但不得自动提交。
- 选择选项后更新 `selectedValue`，触发一次值变化并关闭弹层。
- 点击组件外部可以关闭 PC 非模态浮层，但不能改变已选值。
- 外部关闭、`Escape` 和允许关闭的 Drawer 关闭按钮都放弃未提交搜索或高亮变化，并保留已选值。
- `Tab` 离开时关闭；未匹配搜索词不得成为值。
- Disabled 状态不可聚焦或打开；Read-only 状态可以读取当前值，但不可搜索、清空或选择。
- 打开、关闭和选择过程中防止重复回调。

## 搜索

- 默认匹配选项主标签，可由业务显式配置额外搜索字段。
- 搜索忽略首尾空格和大小写；中文名称、代码、拼音等字段必须明确配置，不能默认假设。
- 本地选项即时过滤。
- 远程搜索建议约 `250ms` 防抖；新请求发出时取消旧请求，或使用请求序号忽略过期结果。
- 搜索词变化、请求失败或结果刷新不得清除已选值。
- 清空搜索恢复完整结果；无匹配项显示明确空状态。
- 搜索失败时保持组件打开，显示文本错误与重试操作。
- Loading、结果数量、无结果和错误状态必须通过合适的状态消息让辅助技术感知。
- 搜索区固定可见，仅选项列表滚动。每个搜索框使用场景化可访问名称（例如“搜索币种”或“搜索用户”），不能只用无上下文的泛化占位符。

## 键盘与焦点

- `Tab`：`inline`、`panel` 和 `drawer` 的控制 Listbox 搜索 Combobox 进入正常页面 Tab 顺序。
- `ArrowDown` / `ArrowUp`：打开或移动当前高亮项。
- `Enter`：仅提交当前高亮的可选项。
- `Escape`：关闭并恢复关闭前状态。
- `Home` / `End`：移动到第一项或最后一项。
- 可打印字符：执行正常文本输入和搜索。
- `Backspace`、`Delete`、左右方向键及系统编辑快捷键保持原生单行文本编辑行为。
- PC Listbox 打开时，控制 Listbox 的 Combobox 保留 DOM 焦点，并通过 `aria-activedescendant` 表达当前高亮项。
- 高亮项与已选项必须具有可区分的视觉状态；焦点移动不得等同于提交选择。
- `none` 模式不显示搜索框，而是通过 Select-only Combobox 或按钮 + Listbox 支持 type-ahead、箭头键、`Home`、`End`、`Enter` 和 `Escape`。
- 关闭后焦点返回控制 Listbox 的 Combobox 或外部触发按钮；跨端或运行时模式转换时移到等价搜索输入、触发按钮或合理标题。

## ARIA 语义

`inline` 的主输入框必须是 Editable Combobox，具备：

- `role="combobox"`
- `aria-expanded`
- `aria-controls`
- `aria-autocomplete="list"`
- 打开且存在高亮项时的 `aria-activedescendant`
- 可见 Label 与原生 `<label>` 或 `aria-labelledby`
- 必填时的 `aria-required="true"`
- 错误时的 `aria-invalid="true"` 及错误信息关联

`panel` 与 `drawer` 的外部触发器是展示已选值的按钮，不得标为 Editable Combobox；弹层顶部或 Drawer 固定标题区下方的搜索输入才具备上述 Combobox 语义。`none` 按实际 Select-only Combobox 或按钮 + Listbox 模式提供语义，不能渲染假的搜索字段。

Listbox 使用 `role="listbox"`；每个选项使用稳定唯一 ID、`role="option"` 和正确的 `aria-selected`。Option 内不得放置按钮、链接、复选框或其他独立可交互控件；复杂交互列表应采用其他模式，不能伪装成 Select。

## 选项与数据一致性

- 选项主标签清楚、简短；允许使用图标或次要说明，但可访问名称不能冗长。
- 相同标签的选项必须提供可区分信息。
- 禁用选项清晰可见、不可选择，并在需要时说明原因。
- 排序必须稳定；搜索和异步刷新不得随机改变顺序或导致高亮项跳动。
- 已选项暂时不在搜索结果中时仍须保留。
- 数据刷新后已选值失效时，展示明确失效状态并要求用户重新选择；不得静默清空或自动改选其他值。
- 新结果到达时不得自动提交第一项。

## PC 弹层

- `inline` 弹层锚定 Editable Combobox；`panel` 弹层锚定外部触发按钮，顶部放置控制 Listbox 的搜索 Combobox；`none` 弹层锚定 Select-only Combobox 或按钮。弹层至少与锚点同宽，可按内容扩大但不得超出视口。
- 根据可用空间自动向下或向上展开，且不能被 `overflow` 祖先裁切；必要时挂载至应用根节点。
- 存在搜索输入时，搜索输入与状态区域保持可见，仅选项区域设置最大高度并滚动。
- 弹层为非模态，不使用全屏遮罩；点击外部可关闭并保留已提交值。
- 打开使用淡入和小幅位移 `150ms ease-out`，关闭使用 `100ms ease-in`；Reduced Motion 下取消位移并控制在 `50ms` 内或直接切换。

## 移动端

- 选项少且空间充足时可以保留锚定浮层；`drawer` 模式在选项多、需要搜索或虚拟键盘显著影响布局时转换为底部 Drawer。
- Drawer 内固定标题区下方的搜索输入框是 Combobox，外部为展示已选值的触发按钮；与 PC 共享同一已选值、选项数据源和搜索状态，且搜索区固定可见、仅选项列表滚动。
- 转换为 Drawer 后执行完整 Drawer 规范：全视口遮罩、遮罩与滑动不关闭、固定标题、右上角关闭按钮、仅列表内容滚动、焦点约束、背景隔离和清理。
- 断点实时切换时只保留一个活动实例，不得重复请求、遮罩、焦点陷阱、滚动锁或值变化回调。
- 初次打开使用最终呈现形态的专项动画；已打开实例实时转换时保持单实例，不重复播放两套进入或退出动画。

## 清空

- 是否允许清空由业务配置。
- 可清空时提供独立、可聚焦且具有可访问名称的清空按钮，不能与展开按钮共用语义。
- 必填字段不得提供会静默产生无效状态的清空方式。
- 清空后执行与正常值变化相同的校验和一次性回调。

## 大数据量

- 普通数据量使用完整 Listbox。
- 大量选项可以使用虚拟列表，但 `aria-activedescendant` 指向的选项必须实际存在于 DOM，高亮项自动滚入可视区域。
- 辅助技术必须能获得结果数量和当前位置。
- 远程分页或无限加载不得丢失已选值、重复结果或导致高亮项意外变化。

## 验收

至少验证：

- `auto` 解析和 `inline`、`panel`、`drawer`、`none` 各模式的打开、搜索（适用时）、type-ahead（`none`）、选择、外部关闭和 Drawer 关闭按钮。
- 完整键盘操作以及系统文本编辑快捷键不被破坏。
- `Escape`、`Tab` 和未匹配文本均不改变已选值。
- `query`、`activeOption` 与 `selectedValue` 严格分离。
- 本地搜索、远程防抖、请求竞态、Loading、无结果、失败和重试。
- Disabled、Read-only、Required、Invalid 和可清空状态。
- 超长选项、重复标签、禁用项和失效已选值。
- 弹层上下定位、视口边缘、滚动容器和 Portal 场景。
- PC、移动端 Drawer、虚拟键盘、运行时搜索位置/断点切换和 200% 缩放。
- 触摸、Reduced Motion、长文本、国际化和大量数据。
- 屏幕阅读器可获得名称、值、展开状态、高亮项、选中项、结果数量和错误状态。

未实际执行的交互、输入方式、辅助技术或视口检查必须明确报告为未验证，并说明所需检查。

## 范围边界

- 本规范只覆盖单选且值必须来自已有选项的 Select。
- 多选、标签输入、自由文本创建、树选择、级联选择、日期选择和含独立交互控件的复杂选项不在本次范围内。
- 不规定具体 Vue/React 组件 API、CSS 框架或视觉品牌样式。

## 参考资料

- [WAI-ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [WAI-ARIA Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)

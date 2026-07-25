# 完整 Dialog 产品交互规范设计

## 目标

将现有遮罩、滚动和动画要求扩展为完整的 Dialog 产品交互规范，覆盖可访问性、键盘操作、焦点、背景隔离、多层管理、异步状态、响应式布局和资源清理。规范同步到个人 Skill、项目 `AGENTS.md` 和开源 README，并作为后续界面审计的统一验收来源。

## 强制规范

### 遮罩与滚动

1. 点击遮罩不得关闭 Dialog。
2. Dialog 外框不得滚动；超出高度时仅内容区域滚动。
3. 遮罩必须覆盖整个视口，不受局部父容器限制。

### 动画

4. 打开时遮罩淡入，Dialog 淡入并从 `scale(0.96)` 到 `scale(1)`，时长 `200ms ease-out`。
5. 关闭时按相反方向播放 `150ms ease-in`，动画完成后才能卸载 DOM。
6. 动画期间屏蔽重复打开或关闭；关闭结束前保持遮罩、焦点约束和滚动锁定。
7. `prefers-reduced-motion: reduce` 时禁用缩放，淡入淡出不超过 `50ms` 或直接切换。

### 焦点与键盘

8. 打开后焦点移动到 Dialog 内最合理的元素：
   - 普通表单聚焦首个合理操作元素。
   - 长内容聚焦标题或顶部静态元素。
   - 不可逆危险操作优先聚焦破坏性最低的操作。
9. `Tab` 和 `Shift + Tab` 的焦点循环限制在当前活动 Dialog 内。
10. 关闭动画完成后焦点返回触发元素；触发元素不存在时移动到后续流程中合理的元素。
11. 默认支持 `Escape` 关闭最上层 Dialog，一次只关闭一层。
12. 正在提交、流程不可中断或存在未保存内容时，可以禁用 Escape 或先显示二次确认。
13. 点击遮罩始终不能触发关闭或关闭动画。

### 模态隔离与语义

14. Dialog 打开时，背景内容对鼠标、触摸、键盘和辅助技术均不可交互，使用原生模态能力或 `inert` 等等价机制。
15. 使用原生 `<dialog>`，或 `role="dialog"` 与 `aria-modal="true"`。
16. 必须提供可访问名称：优先使用可见标题和 `aria-labelledby`，无可见标题时才能使用 `aria-label`。
17. 复杂结构内容不把全部正文塞入 `aria-describedby`。
18. 必须提供可见、可聚焦、有可访问名称的关闭、取消、确认或等价操作。

### 多层 Dialog

19. 同一时间只有最上层 Dialog 可交互。
20. 下层 Dialog 和页面背景保持 inert。
21. 关闭最上层后，焦点返回下层 Dialog 中的触发元素。
22. 使用统一层级体系，不能依赖页面局部随意设置 z-index。

### 异步、错误与重复操作

23. 异步提交期间防止重复提交、重复关闭和重复回调。
24. loading 状态保留按钮可访问名称，并让辅助技术获得必要状态。
25. 请求失败后 Dialog 保持打开，以文本描述错误，并将焦点或错误摘要引导到合理位置。
26. 不能在用户来不及读取错误时自动关闭。
27. 业务禁止中断时，明确禁用相关关闭方式并向用户表达当前状态。

### 响应式与清理

28. 放大、移动端、低高度视口和虚拟键盘出现时，所有内容和操作仍可访问。
29. 聚焦元素不能被固定标题、底部或虚拟键盘完全遮挡。
30. 不依赖固定像素高度；动态视口单位需要合理回退。
31. 关闭、路由变化或组件卸载时，完整清理滚动锁定、inert、焦点约束、事件监听器和动画状态。
32. 再次打开不能残留意外的遮罩、loading、错误或关闭状态。

## 推荐设计

- 破坏性操作的主按钮与取消按钮保持稳定顺序。
- 标题准确描述任务，避免只写“提示”“信息”。
- 再次打开时默认清理旧错误和 loading，除非业务明确要求保留。
- 简单确认框避免嵌套复杂导航。

## 验收

后续审计与实现必须验证：

- 遮罩点击、明确关闭与 Escape 行为。
- 打开初始焦点、焦点循环和关闭后的焦点返回。
- 背景 inert 和多层 Dialog 的最上层隔离。
- 可访问角色、名称和可见关闭操作。
- 长内容、移动端、低高度、缩放和虚拟键盘场景。
- 打开/关闭动画、快速连续操作和 reduced-motion。
- 异步重复提交、失败错误、不可中断状态。
- 路由变化、组件卸载和多次打开后的资源清理。

未实际执行的交互或视口检查必须明确标为未验证。

## 同步范围

- 更新个人 Skill 的 `references/dialogs.md`，作为完整规则唯一事实来源。
- 更新项目 `AGENTS.md`，保留未安装 Skill 的 Agent 也能执行的兜底规则。
- 更新 Skill 开源仓库 `README.md` 的摘要和参考资料。
- `SKILL.md` 的触发范围与路由保持不变。

## 一手参考资料

- [WAI-ARIA Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [MDN HTML dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WCAG Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
- [WCAG No Keyboard Trap](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html)
- [WCAG Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [WCAG Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)

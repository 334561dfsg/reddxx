# 完整 Dialog 规范同步实施计划

> **供 Agent 执行：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐项实施。步骤使用复选框跟踪。

**目标：** 将已确认的完整 Dialog 规范同步到个人 Skill、fex-admin 项目约束和公开 README，并验证三处内容一致。

**架构：** `references/dialogs.md` 是完整规则唯一事实来源；项目 `AGENTS.md` 保存所有 Agent 可执行的兜底要求；README 只提供分类摘要和参考链接。两个 Git 仓库分别提交和推送。

**技术栈：** Markdown、Codex Skills、Git、WAI-ARIA/WCAG/MDN 参考资料。

## 全局约束

- 设计源：`docs/superpowers/specs/2026-07-25-complete-dialog-standards-design.md`。
- 不修改 `SKILL.md` 触发描述或路由。
- 完整规则只在 `references/dialogs.md` 出现；README 不复制全部 32 条。
- 项目 AGENTS 必须覆盖未安装 Skill 的 Agent 所需硬性规则。
- 所有未实测交互必须标记为未验证。
- Skill 和 fex-admin 分别提交、推送并核对远程哈希。

---

### 任务 1：建立规则缺失基线

**文件：**
- 只读：`references/dialogs.md`、`fex-admin/AGENTS.md`、`README.md`

- [ ] 检查三处当前缺少动画、焦点循环、inert、ARIA、Escape、多层、异步和清理规则，并记录匹配结果。

```bash
rg -n '200ms|aria-modal|inert|Shift.*Tab|Escape|prefers-reduced-motion|虚拟键盘' references/dialogs.md
```

预期：多个关键词无匹配，证明新增规范尚未落地。

### 任务 2：同步完整规则

**文件：**
- 修改：`/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/dialogs.md`
- 修改：`/Users/evanqi/code/fex-admin/AGENTS.md`
- 修改：`/Users/evanqi/.codex/skills/frontend-product-interaction-standards/README.md`

- [ ] 按设计文档将 `dialogs.md` 重组为：遮罩与滚动、动画、焦点与键盘、语义与背景隔离、多层 Dialog、异步与错误、响应式与清理、推荐设计、完成前检查、参考资料。
- [ ] 在 `AGENTS.md` 增加同等硬约束，使用紧凑但不丢失验收含义的英文项目指令。
- [ ] 在 README 当前规范中增加动画、焦点/键盘、可访问性、多层、异步与响应式摘要，并继续链接 `references/dialogs.md`。
- [ ] 保留原三条规则含义，不允许 Escape、动画或异步逻辑重新启用遮罩关闭或外框滚动。

### 任务 3：验证、评审与发布

**文件：**
- 验证上述三个文件，不新增公开文件。

- [ ] 检查完整规则关键词：

```bash
rg -n '200ms|150ms|50ms|aria-modal|aria-labelledby|inert|Shift.*Tab|Escape|prefers-reduced-motion|虚拟键盘|重复提交|焦点' references/dialogs.md
```

- [ ] 运行 Skill 官方校验、占位符扫描、相对链接检查和两个仓库的 `git diff --check`。
- [ ] 独立评审三处规则是否一致、README 是否只摘要、W3C/MDN 链接是否有效、原规则是否弱化。
- [ ] Skill 仓库提交：

```bash
git add references/dialogs.md README.md
git commit -m "docs: 扩展完整 Dialog 交互规范"
```

- [ ] fex-admin 提交：

```bash
git add AGENTS.md
git commit -m "docs: 扩展项目 Dialog 交互约束"
```

- [ ] 分别非强制推送 `main`，核对本地与远程提交哈希一致。

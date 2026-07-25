# 前端产品交互规范 Skill 实施计划

> **供 Agent 执行：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐项实施本计划。所有步骤使用复选框跟踪。

**目标：** 创建、验证并发布一个自动触发的中文个人 Skill，在所有前端项目中强制执行用户的产品交互规范。

**架构：** 将公开 Git 仓库直接克隆到 `~/.codex/skills/frontend-product-interaction-standards/`，使 Git 工作副本同时成为本地安装版本，消除双份同步。完整规则按类别放在 `references/`；首版仅创建 `dialogs.md`。

**技术栈：** Codex Skills、Markdown、YAML、Git、Skill Creator 校验脚本、独立 Agent 压力测试。

## 全局约束

- Skill 技术标识固定为 `frontend-product-interaction-standards`。
- 远程仓库固定为 `git@github.com:gloopai/frontend-product-interaction-standards.git`。
- 本地安装路径固定为 `~/.codex/skills/frontend-product-interaction-standards/`。
- 除技术标识、目录名和分类文件名外，Skill 内容全部使用中文。
- 创建、修改、重构、评审或测试前端页面、组件、布局或交互时自动触发。
- 规则默认为硬性要求，只有用户明确授权的指定范围可以例外。
- 先完成无 Skill 基线测试，再编写 Skill；不得颠倒顺序。

---

### 任务 1：建立无 Skill 基线并准备仓库

**文件：**
- 临时创建：`/private/tmp/frontend-product-interaction-standards-baseline.md`
- 最终创建目录：`~/.codex/skills/frontend-product-interaction-standards/`

**接口：**
- 输入：四个不包含目标规范提示的真实前端任务场景。
- 输出：基线 Agent 对遮罩关闭、滚动容器、全屏遮罩和第三方组件默认行为的选择与理由。

- [ ] **步骤 1：只读确认远程仓库和本地目标状态**

运行：

```bash
git ls-remote git@github.com:gloopai/frontend-product-interaction-standards.git
test ! -e ~/.codex/skills/frontend-product-interaction-standards
```

预期：远程连接成功；本地目标不存在。若远程已有引用，先克隆并检查已有文件，避免覆盖；若本地目标已存在，停止创建并检查它是否为同一远程仓库。

- [ ] **步骤 2：运行四个无 Skill 基线场景**

分别向新上下文 Agent 发送以下任务，不提供本设计文档、`AGENTS.md` 或目标 Skill：

```text
场景 A：请快速实现一个通用 Dialog。用户点击遮罩时关闭，Dialog 内容很多时允许整个弹窗滚动。今天必须交付，请直接给出实现方案。
```

```text
场景 B：请评审一个 Dialog：遮罩使用父容器内的 absolute inset-0，父容器只占主内容区。需求方只让我检查视觉间距，请不要扩大评审范围。
```

```text
场景 C：第三方 Dialog 默认点击遮罩关闭，并把 overflow-y-auto 放在最外层。项目已经大量使用它，改封装会增加工作量，请完成一个新弹窗。
```

```text
场景 D：请修改一个移动端 Dialog，使长内容可访问。可以选择让弹窗外框滚动或只让内容区滚动，请选择最快的方案并说明理由。
```

预期：至少一个场景接受或未主动纠正目标违规行为，证明没有 Skill 时规范不会被稳定执行。逐字保存关键选择和理由。

- [ ] **步骤 3：记录基线结果**

在临时基线文件中按“场景、Agent 选择、理由、违反的目标规则”四列记录结果。该文件只用于测试，不加入 Skill 仓库。

- [ ] **步骤 4：将远程仓库克隆到本地 Skills 目录**

远程为空且目标不存在时运行：

```bash
git clone git@github.com:gloopai/frontend-product-interaction-standards.git ~/.codex/skills/frontend-product-interaction-standards
```

预期：目录创建成功，`git remote -v` 显示指定的 `origin`。

### 任务 2：初始化并编写最小 Skill

**文件：**
- 创建：`~/.codex/skills/frontend-product-interaction-standards/SKILL.md`
- 创建：`~/.codex/skills/frontend-product-interaction-standards/agents/openai.yaml`
- 创建：`~/.codex/skills/frontend-product-interaction-standards/references/dialogs.md`

**接口：**
- `SKILL.md` 根据任务类别路由至参考文件。
- `references/dialogs.md` 为 Dialog 创建、修改、评审和测试提供强制验收规则。
- `agents/openai.yaml` 允许隐式自动触发并提供中文 UI 信息。

- [ ] **步骤 1：运行官方初始化脚本生成结构**

由于 Git 克隆目录已经存在，先在临时父目录生成同名模板：

```bash
python3 /Users/evanqi/.codex/skills/.system/skill-creator/scripts/init_skill.py frontend-product-interaction-standards --path /private/tmp/frontend-skill-scaffold --resources references --interface 'display_name=前端产品交互规范' --interface 'short_description=在前端设计、开发、评审和测试中执行个人交互规范' --interface 'default_prompt=使用 $frontend-product-interaction-standards 检查并完成当前前端交互任务。'
```

预期：临时目录包含初始化生成的 `SKILL.md`、`agents/openai.yaml` 和 `references/`。使用生成结果确认结构和元数据格式，不复制任何占位内容。

- [ ] **步骤 2：编写 `SKILL.md`**

创建以下内容，并根据任务 1 中实际出现的违规理由补充简短、明确的反驳条目，但不得增加首版范围之外的产品规则：

```markdown
---
name: frontend-product-interaction-standards
description: 用于创建、修改、重构、评审或测试前端页面、组件、布局、弹窗、表单及交互行为时；凡是前端产品交互任务都应自动加载。
---

# 前端产品交互规范

## 核心原则

把本 Skill 中与任务相关的规则视为硬性验收条件。框架限制、组件库默认行为、现有代码和交付压力都不能降低标准。只有用户针对明确范围作出的直接授权才构成例外。

## 执行流程

1. 判断任务涉及哪些交互类别。
2. 修改或评审前读取对应参考文件。
3. 实现前检查方案，实现后检查代码并验证相关交互和视口。
4. 第三方组件冲突时，优先配置、封装或替换。
5. 最终回复列明已验证的相关规则；无法验证时明确说明。

## 规范路由

- 涉及 Dialog、Modal、弹窗或对话框时，必须完整读取 `references/dialogs.md`。
- 用户增加新类别规范时，创建职责单一的 `references/<category>.md`，并在此增加路由。

## 与项目规则的关系

- 兼容规则全部执行。
- 一方更严格且不冲突时，执行更严格的规则。
- 规则冲突时停止受影响的实现并请用户裁决，不能自行采用宽松版本。

## 红线

- 不得因为“组件默认如此”而保留违规行为。
- 不得因为“只要求检查其他内容”而忽略当前改动涉及的交互违规。
- 不得把未执行的验证写成已经通过。
```

- [ ] **步骤 3：编写 `references/dialogs.md`**

```markdown
# Dialog 交互规范

适用于所有 Dialog、Modal、对话框及具有相同行为的弹出层。

## 强制规则

### 1. 点击遮罩不得关闭

点击遮罩层不能改变 Dialog 的打开状态。不得添加通过遮罩点击关闭的事件；使用第三方组件时，必须关闭其“点击遮罩关闭”选项。Dialog 只能通过明确的弹窗内操作关闭，例如关闭、取消、确认或业务操作。

验收：点击遮罩后 Dialog 保持打开；明确的关闭操作仍然有效。

### 2. 外框不得滚动

Dialog 外框必须保持不可滚动。内容超过视口可用高度时，应限制 Dialog 高度并仅让内容区域纵向滚动；标题、底部和操作区域保留在固定外框内。

验收：任何相关视口尺寸下，外框均不出现滚动条；长内容可以在内容区域完整访问。

### 3. 遮罩必须覆盖整个视口

遮罩层必须覆盖整个浏览器视口，包括 Dialog 父布局容器以外的区域。必要时将其挂载或传送到应用根节点，并采用相对于视口的固定定位与正确层级。遮罩不得被页面区块、面板、带变换的祖先元素或其他局部容器裁切或限制。

验收：滚动页面并检查不同视口尺寸时，遮罩始终覆盖完整视口，不露出可交互的局部区域。

## 完成前检查

- 实际点击遮罩，确认 Dialog 不关闭。
- 使用足以溢出的长内容，确认只有内容区域滚动。
- 在桌面和移动端相关视口检查遮罩覆盖范围。
- 检查第三方组件的默认配置没有重新启用违规行为。
```

- [ ] **步骤 4：生成并检查 `agents/openai.yaml`**

确保最终内容为：

```yaml
interface:
  display_name: "前端产品交互规范"
  short_description: "在前端设计、开发、评审和测试中执行个人交互规范"
  default_prompt: "使用 $frontend-product-interaction-standards 检查并完成当前前端交互任务。"

policy:
  allow_implicit_invocation: true
```

- [ ] **步骤 5：运行结构校验**

```bash
python3 /Users/evanqi/.codex/skills/.system/skill-creator/scripts/quick_validate.py ~/.codex/skills/frontend-product-interaction-standards
```

预期：校验成功，无 YAML、命名或必需文件错误。

- [ ] **步骤 6：提交最小 Skill**

```bash
git -C ~/.codex/skills/frontend-product-interaction-standards add SKILL.md agents/openai.yaml references/dialogs.md
git -C ~/.codex/skills/frontend-product-interaction-standards commit -m "feat: 创建前端产品交互规范 Skill"
```

预期：提交只包含三个目标文件，不包含临时模板或基线记录。

### 任务 3：复测、封堵遗漏并完成质量验证

**文件：**
- 按测试结果修改：`~/.codex/skills/frontend-product-interaction-standards/SKILL.md`
- 按测试结果修改：`~/.codex/skills/frontend-product-interaction-standards/references/dialogs.md`

**接口：**
- 输入：任务 1 的相同四个场景，以及显式加载当前 Skill 的全新 Agent 上下文。
- 输出：所有场景都主动执行三条 Dialog 规则，并拒绝以默认行为、已有代码、局部评审范围或交付压力为由降低标准。

- [ ] **步骤 1：用 Skill 复跑四个场景**

每次使用新的 Agent 上下文，显式要求加载 `$frontend-product-interaction-standards`，其余场景文本与任务 1 完全相同。

预期：四个场景均识别适用规则；涉及实现的回答满足规则，涉及评审的回答指出违规，且不会接受压力条件作为例外。

- [ ] **步骤 2：逐项对比基线与复测结果**

检查以下断言：

- 遮罩点击不会被建议为关闭方式。
- 滚动不会放在 Dialog 外框。
- 局部父容器内的遮罩会被识别为不合规。
- 第三方组件默认行为会被配置、封装或替换。
- 未得到用户明确授权时不会自行创建例外。
- 最终结论会区分“已验证”和“无法验证”。

- [ ] **步骤 3：只针对实际遗漏收紧措辞**

若复测出现遗漏，将 Agent 的实际理由归入以下位置：违反硬性要求的理由加入 `SKILL.md` 的“红线”；规则本身存在歧义时修改 `references/dialogs.md` 的对应验收条目。不得添加与实际失败无关的预防性章节。

- [ ] **步骤 4：复跑失败场景直至通过**

每次修改后使用新的 Agent 上下文重新运行失败场景。预期：原失败不再出现，其他已通过场景仍通过。

- [ ] **步骤 5：完成最终静态校验**

```bash
python3 /Users/evanqi/.codex/skills/.system/skill-creator/scripts/quick_validate.py ~/.codex/skills/frontend-product-interaction-standards
rg -n 'TBD|TODO|PLACEHOLDER|待补充|待定' ~/.codex/skills/frontend-product-interaction-standards
git -C ~/.codex/skills/frontend-product-interaction-standards diff --check
```

预期：校验成功；`rg` 无输出；`git diff --check` 无输出。

- [ ] **步骤 6：提交测试驱动的措辞调整**

仅当任务 3 产生文件修改时运行：

```bash
git -C ~/.codex/skills/frontend-product-interaction-standards add SKILL.md references/dialogs.md
git -C ~/.codex/skills/frontend-product-interaction-standards commit -m "docs: 收紧交互规范的执行约束"
```

### 任务 4：发布并验证本地发现

**文件：**
- 不新增文件。

**接口：**
- 本地：Codex 能从固定 Skills 目录发现并自动触发 Skill。
- 远程：公开仓库包含与本地 `HEAD` 相同的提交。

- [ ] **步骤 1：检查发布前状态**

```bash
git -C ~/.codex/skills/frontend-product-interaction-standards status --short
git -C ~/.codex/skills/frontend-product-interaction-standards log --oneline -3
git -C ~/.codex/skills/frontend-product-interaction-standards remote -v
```

预期：工作区干净，提交存在，`origin` 指向指定仓库。

- [ ] **步骤 2：推送公开仓库**

```bash
git -C ~/.codex/skills/frontend-product-interaction-standards push -u origin main
```

如果初始分支不是 `main`，先使用 `git branch --show-current` 确认实际分支，并将同一分支推送；不得强制推送或覆盖已有远程历史。

- [ ] **步骤 3：确认远程提交一致**

```bash
git -C ~/.codex/skills/frontend-product-interaction-standards rev-parse HEAD
git ls-remote git@github.com:gloopai/frontend-product-interaction-standards.git refs/heads/main
```

预期：本地与远程 `main` 的提交哈希一致。

- [ ] **步骤 4：验证本地发现和自动触发**

开启一个不显式点名 Skill 的新 Codex 任务，请求创建或评审 Dialog。预期：可用技能列表包含 `frontend-product-interaction-standards`，Agent 自动加载它并应用 `references/dialogs.md`。

- [ ] **步骤 5：最终报告**

报告本地安装路径、远程仓库、最终提交哈希、结构校验结果、四个压力场景结果及自动触发验证结果。若推送或自动发现失败，明确区分本地可用状态与远程发布状态。

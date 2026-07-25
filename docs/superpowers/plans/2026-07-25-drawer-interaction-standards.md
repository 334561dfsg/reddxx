# 四向抽屉交互规范实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在前端产品交互规范 Skill 中新增覆盖上、下、左、右抽屉的完整规则，并同步项目级 Agent 约束。

**Architecture:** 使用 `references/drawers.md` 作为抽屉规则的唯一事实来源，`SKILL.md` 只负责自动触发和路由，README 提供用户摘要，项目 `AGENTS.md` 保留可独立执行的关键硬性约束。此次仅修改规范文档，不修改现有业务组件。

**Tech Stack:** Markdown、YAML Frontmatter、Git、Ruby 内置 YAML 解析器

## Global Constraints

- 覆盖从上、下、左、右进入的 Drawer、Sheet 和抽屉式面板。
- 点击遮罩、拖拽和滑动均不得关闭抽屉。
- 普通可退出抽屉必须保留固定标题区右上角关闭按钮。
- 抽屉外框不得滚动，仅内容区域滚动。
- 四个方向使用与来源边缘一致的进入和退出动画。
- 本次不修改现有抽屉组件或页面。

---

### Task 1: 新增抽屉规范唯一事实来源

**Files:**
- Create: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/drawers.md`

**Interfaces:**
- Consumes: 已确认的 `docs/superpowers/specs/2026-07-25-drawer-interaction-standards-design.md`
- Produces: 可被 Skill 路由和项目规范引用的完整抽屉规则

- [ ] **Step 1: 验证基线缺口**

Run:

```sh
test ! -e /Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/drawers.md
```

Expected: exit 0，证明当前不存在独立抽屉规范。

- [ ] **Step 2: 编写完整规范**

创建 `references/drawers.md`，至少包含：适用范围、模态与非模态边界、遮罩和关闭方式、固定头尾与内容滚动、四方向布局、动画、Reduced Motion、焦点和键盘、语义与背景隔离、多层叠加、异步错误、响应式安全区域、清理和完整验收清单。

- [ ] **Step 3: 验证关键硬性规则存在**

Run:

```sh
rg -n '点击遮罩.*不得|拖拽.*不得关闭|右上角.*关闭按钮|仅.*内容区域.*滚动|左抽屉|右抽屉|上抽屉|下抽屉|200ms ease-out|150ms ease-in|prefers-reduced-motion' /Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/drawers.md
```

Expected: 每类规则均至少有一处匹配。

### Task 2: 配置自动路由与公开说明

**Files:**
- Modify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/SKILL.md`
- Modify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/README.md`

**Interfaces:**
- Consumes: `references/drawers.md`
- Produces: 抽屉任务自动加载规则及面向使用者的能力说明

- [ ] **Step 1: 增加 Skill 路由**

在“规范路由”中增加硬性规则：涉及 Drawer、Sheet、抽屉或侧滑/上下滑出面板时，必须完整读取 `references/drawers.md`。保持现有 Frontmatter 描述不变，因为其已覆盖所有前端产品交互任务。

- [ ] **Step 2: 更新 README**

在当前规范摘要中增加四向抽屉规则，并在目录结构中列出 `references/drawers.md`。

- [ ] **Step 3: 验证自动路由和 README**

Run:

```sh
rg -n 'Drawer|Sheet|drawers.md|上、下、左、右' /Users/evanqi/.codex/skills/frontend-product-interaction-standards/SKILL.md /Users/evanqi/.codex/skills/frontend-product-interaction-standards/README.md
```

Expected: Skill 路由和公开说明均包含抽屉规范。

### Task 3: 同步项目级抽屉约束

**Files:**
- Modify: `/Users/evanqi/code/fex-admin/AGENTS.md`

**Interfaces:**
- Consumes: `references/drawers.md` 的关键硬性规则
- Produces: 本项目所有 Agent 可直接执行的抽屉验收标准

- [ ] **Step 1: 新增独立 Drawer interaction constraints 章节**

增加以下内容：四向定位和动画、全视口遮罩、遮罩与手势不可关闭、右上角关闭按钮、外框不滚动、焦点和 Escape、语义和背景隔离、多层叠加、异步错误、安全区域、清理与未验证行为报告。不得用一句“遵循 Skill”替代项目可执行规则。

- [ ] **Step 2: 验证项目规则覆盖范围**

Run:

```sh
rg -n 'Drawer interaction constraints|backdrop|drag|swipe|top-right|overflow|left|right|top|bottom|safe-area|prefers-reduced-motion' /Users/evanqi/code/fex-admin/AGENTS.md
```

Expected: 所有关键类别均有明确约束。

### Task 4: 校验、提交和推送

**Files:**
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/SKILL.md`
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/drawers.md`
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/README.md`
- Verify: `/Users/evanqi/code/fex-admin/AGENTS.md`

**Interfaces:**
- Consumes: Tasks 1–3 的所有文档变更
- Produces: 两个范围明确、可追踪并已推送的 Git 提交

- [ ] **Step 1: 校验 Skill Frontmatter 和文本格式**

Run:

```sh
cd /Users/evanqi/.codex/skills/frontend-product-interaction-standards
git diff --check
ruby -e 'require "yaml"; s=File.read("SKILL.md"); m=s.match(/\A---\n(.*?)\n---/m) or abort("invalid frontmatter"); f=YAML.safe_load(m[1]); abort("missing name") unless f["name"]; abort("missing description") unless f["description"]; puts "Skill frontmatter valid"'
```

Expected: exit 0，输出 `Skill frontmatter valid`。

- [ ] **Step 2: 校验项目文档格式和变更范围**

Run:

```sh
cd /Users/evanqi/code/fex-admin
git diff --check
git status --short
```

Expected: 本任务在项目仓库只修改 `AGENTS.md`；其他并发改动必须保留且不得暂存。

- [ ] **Step 3: 提交 Skill 仓库**

```sh
git -C /Users/evanqi/.codex/skills/frontend-product-interaction-standards add SKILL.md README.md references/drawers.md
git -C /Users/evanqi/.codex/skills/frontend-product-interaction-standards commit -m "docs: 添加四向抽屉交互规范"
```

- [ ] **Step 4: 提交项目仓库**

```sh
git -C /Users/evanqi/code/fex-admin add AGENTS.md
git -C /Users/evanqi/code/fex-admin commit -m "docs: 添加四向抽屉交互约束"
```

- [ ] **Step 5: 推送两个 main 分支并核对远端**

```sh
git -C /Users/evanqi/.codex/skills/frontend-product-interaction-standards push https://github.com/gloopai/frontend-product-interaction-standards.git main:main
git -C /Users/evanqi/code/fex-admin push origin main
```

Expected: 两个推送成功，本地规范提交均为对应远端 `main` 的祖先。

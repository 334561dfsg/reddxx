# PC 与移动端兼容交互规范实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在前端产品交互规范 Skill 中新增跨 PC、平板和移动端的全局响应式与自适应规则，并同步项目级 Agent 约束。

**Architecture:** 使用 `references/responsive-adaptive.md` 作为跨端规则唯一事实来源；`SKILL.md` 负责自动路由，README 提供摘要，Dialog 和 Drawer 规范声明同时适用的全局跨端规则，项目 `AGENTS.md` 保留可独立执行的核心要求。此次只修改规范文档，不修改现有页面或组件。

**Tech Stack:** Markdown、YAML Frontmatter、Git、Ruby 内置 YAML 解析器

## Global Constraints

- PC 与移动端核心业务能力、业务语义、安全性和可访问性保持一致。
- 低频、次要能力可以折叠、收纳或转换形态，但不得彻底删除，且必须保持可发现、可访问。
- 适配基于可用空间、内容和输入能力，不只依赖设备名称或 User-Agent。
- 断点切换不得丢失表单、筛选、加载、上传、浮层或业务上下文。
- 覆盖键盘、鼠标、触摸、横竖屏、低高度、200% 缩放、虚拟键盘、动态视口和安全区域。
- 本次不修改现有业务代码。

---

### Task 1: 新增全局跨端规范

**Files:**
- Create: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/responsive-adaptive.md`

**Interfaces:**
- Consumes: `/Users/evanqi/code/fex-admin/docs/superpowers/specs/2026-07-25-responsive-adaptive-standards-design.md`
- Produces: 可由所有前端组件规范共同采用的 PC / 移动端兼容规则

- [ ] **Step 1: 验证当前缺少独立规范**

Run:

```sh
test ! -e /Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/responsive-adaptive.md
```

Expected: exit 0。

- [ ] **Step 2: 编写规范文件**

完整覆盖：核心能力与低频能力原则、适配依据、跨端组件转换、状态延续、布局和滚动、输入方式、内容与国际化、异步与浮层切换、验收矩阵、未验证项报告、范围边界及 W3C 参考资料。

- [ ] **Step 3: 验证关键规则**

Run:

```sh
rg -n '核心业务能力.*一致|不得彻底删除|可发现|User-Agent|断点切换|200%|虚拟键盘|safe-area|键盘.*鼠标.*触摸|未验证' /Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/responsive-adaptive.md
```

Expected: 每类规则均至少一处匹配。

### Task 2: 配置自动路由和组件规范关系

**Files:**
- Modify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/SKILL.md`
- Modify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/dialogs.md`
- Modify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/drawers.md`

**Interfaces:**
- Consumes: `references/responsive-adaptive.md`
- Produces: 自动加载规则，以及 Dialog/Drawer 与全局跨端规则的明确组合关系

- [ ] **Step 1: 增加自动路由**

在 `SKILL.md` 的规范路由中规定：涉及响应式、移动端、PC、桌面端、平板、断点、横竖屏、触摸、虚拟键盘或跨端适配时，必须完整读取 `references/responsive-adaptive.md`。

- [ ] **Step 2: 声明组合规则**

在 `dialogs.md` 和 `drawers.md` 的适用范围附近分别声明：涉及跨端形态或视口适配时，还必须执行 `responsive-adaptive.md`；兼容规则全部执行，一方更严格时执行更严格规则。

- [ ] **Step 3: 验证路由和引用**

Run:

```sh
rg -n 'responsive-adaptive.md|响应式|移动端|断点|虚拟键盘|更严格' /Users/evanqi/.codex/skills/frontend-product-interaction-standards/SKILL.md /Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/dialogs.md /Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/drawers.md
```

Expected: 三个文件均明确包含适用关系。

### Task 3: 更新公开说明

**Files:**
- Modify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/README.md`

**Interfaces:**
- Consumes: `references/responsive-adaptive.md`
- Produces: 面向安装者的跨端能力摘要与正确目录结构

- [ ] **Step 1: 添加能力摘要**

摘要必须包含“核心能力一致”和“低频能力可折叠但不能删除”，并链接完整规范；不得复制全部细则。

- [ ] **Step 2: 更新目录树**

在 `references/` 下增加 `responsive-adaptive.md`。

- [ ] **Step 3: 验证公开说明**

Run:

```sh
rg -n '核心能力|低频|折叠|不能删除|responsive-adaptive.md' /Users/evanqi/.codex/skills/frontend-product-interaction-standards/README.md
```

Expected: 摘要、链接和目录项均存在。

### Task 4: 同步项目级跨端约束

**Files:**
- Modify: `/Users/evanqi/code/fex-admin/AGENTS.md`

**Interfaces:**
- Consumes: `references/responsive-adaptive.md` 的关键硬性规则
- Produces: 即使未加载 Skill 也可独立执行的项目跨端约束

- [ ] **Step 1: 新增 Responsive and adaptive interaction constraints**

独立章节至少包含：核心能力一致、低频能力不得删除、适配依据、组件转换、断点状态延续、浮层单实例、键鼠触、200% 缩放、低高度、横竖屏、虚拟键盘、安全区域、国际化文本和未验证项报告。

- [ ] **Step 2: 链接完整规范**

链接 GitHub `references/responsive-adaptive.md`，但项目章节不能只依赖链接，必须自身可执行。

- [ ] **Step 3: 验证项目覆盖范围**

Run:

```sh
rg -n 'Responsive and adaptive interaction constraints|core business|low-frequency|must not be removed|breakpoint|200%|virtual keyboard|safe-area|keyboard, mouse, and touch|unverified' /Users/evanqi/code/fex-admin/AGENTS.md
```

Expected: 所有关键类别均明确出现。

### Task 5: 校验、提交和推送

**Files:**
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/SKILL.md`
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/README.md`
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/responsive-adaptive.md`
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/dialogs.md`
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/drawers.md`
- Verify: `/Users/evanqi/code/fex-admin/AGENTS.md`

**Interfaces:**
- Consumes: Tasks 1–4 的全部规范变更
- Produces: 两个范围明确、经审查并推送的 Git 提交

- [ ] **Step 1: 校验 Skill Frontmatter 与格式**

Run:

```sh
cd /Users/evanqi/.codex/skills/frontend-product-interaction-standards
git diff --check
ruby -e 'require "yaml"; s=File.read("SKILL.md"); m=s.match(/\A---\n(.*?)\n---/m) or abort("invalid frontmatter"); f=YAML.safe_load(m[1]); abort("missing name") unless f["name"]; abort("missing description") unless f["description"]; puts "Skill frontmatter valid"'
```

Expected: exit 0，输出 `Skill frontmatter valid`。

- [ ] **Step 2: 校验项目范围**

Run:

```sh
cd /Users/evanqi/code/fex-admin
git diff --check
git status --short
```

Expected: 本任务在项目仓库只修改 `AGENTS.md`；其他 Agent 的业务代码和测试改动不得暂存。

- [ ] **Step 3: 提交 Skill 仓库**

```sh
git -C /Users/evanqi/.codex/skills/frontend-product-interaction-standards add SKILL.md README.md references/responsive-adaptive.md references/dialogs.md references/drawers.md
git -C /Users/evanqi/.codex/skills/frontend-product-interaction-standards commit -m "docs: 添加 PC 与移动端兼容规范"
```

- [ ] **Step 4: 提交项目仓库**

```sh
git -C /Users/evanqi/code/fex-admin add AGENTS.md
git -C /Users/evanqi/code/fex-admin commit -m "docs: 添加跨端兼容交互约束"
```

- [ ] **Step 5: 推送与核对远端**

推送前检查本地相对远端的提交范围；如果项目 `main` 含其他 Agent 的未推送提交，必须从 `origin/main` 建立临时隔离分支，只挑选本任务的设计、计划和项目规范提交后再快进推送，不能夹带无关提交。

Expected: Skill 与项目远端 `main` 均包含本次规范，项目远端不包含因本任务意外发布的业务代码提交。

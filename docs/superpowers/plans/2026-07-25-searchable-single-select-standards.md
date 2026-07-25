# 可搜索单选 Select 交互规范实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在前端产品交互规范 Skill 中新增自绘、可搜索、值必须来自已有选项的单选 Select 规则，并同步项目级 Agent 约束。

**Architecture:** 使用 `references/selects-comboboxes.md` 作为状态、搜索、键盘、ARIA、PC 浮层、移动端 Drawer 和验收规则的唯一事实来源；`SKILL.md` 负责自动路由，README 提供摘要，跨端与 Drawer 规范声明组合关系，项目 `AGENTS.md` 保留可独立执行的关键要求。本次不修改现有 Select 组件或页面。

**Tech Stack:** Markdown、YAML Frontmatter、WAI-ARIA Combobox/Listbox Pattern、Git、Ruby 内置 YAML 解析器

## Global Constraints

- 仅覆盖单选，值必须来自已有选项；不允许把任意搜索文本作为业务值。
- `selectedValue`、`query`、`activeOption` 和 `open` 状态必须分离。
- PC 使用 Editable Combobox + Listbox；移动端必要时转换为底部 Drawer。
- 搜索、键盘高亮、Hover 和异步刷新不得隐式改变已选值。
- 必须支持完整键盘、ARIA、本地/远程搜索、请求竞态、错误和跨端验收。
- 多选、标签输入、自由文本创建、树选择和级联选择不在范围内。
- 本次不修改业务代码。

---

### Task 1: 新增可搜索单选 Select 规范

**Files:**
- Create: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/selects-comboboxes.md`

**Interfaces:**
- Consumes: `/Users/evanqi/code/fex-admin/docs/superpowers/specs/2026-07-25-searchable-single-select-standards-design.md`
- Produces: 可供所有自绘可搜索单选 Select 任务执行的唯一事实来源

- [ ] **Step 1: 验证当前缺少独立规范**

Run:

```sh
test ! -e /Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/selects-comboboxes.md
```

Expected: exit 0。

- [ ] **Step 2: 编写完整规范**

规范必须包含：适用范围与排除项、状态模型、打开/关闭/提交、搜索、键盘、ARIA、选项数据一致性、PC 弹层、移动端 Drawer、动画、清空、异步竞态、大数据量、错误及验收清单。

- [ ] **Step 3: 验证关键规则存在**

Run:

```sh
rg -n 'selectedValue|query|activeOption|role="combobox"|aria-activedescendant|role="listbox"|role="option"|250ms|过期结果|Escape|移动端.*Drawer|虚拟列表|未验证' /Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/selects-comboboxes.md
```

Expected: 每类规则均至少一处匹配。

### Task 2: 配置自动路由和组合关系

**Files:**
- Modify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/SKILL.md`
- Modify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/responsive-adaptive.md`
- Modify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/drawers.md`

**Interfaces:**
- Consumes: `references/selects-comboboxes.md`
- Produces: 中英文自动触发与 Select/跨端/Drawer 的明确执行关系

- [ ] **Step 1: 增加自动路由**

在 `SKILL.md` 规定：涉及 Select、Combobox、下拉选择、可搜索选择器、Autocomplete、Dropdown Select、Searchable Select、单选选择器时，必须完整读取 `references/selects-comboboxes.md`。保留中英文常见触发词。

- [ ] **Step 2: 声明跨端组合**

在 `responsive-adaptive.md` 声明自绘 Select 跨端转换同时执行 Select 规范；PC 初次打开采用 Select 浮层动画，移动端最终形态为 Drawer 时采用 Drawer 动画；已打开实例实时断点转换保持单实例且不叠加两套动画。

- [ ] **Step 3: 声明 Drawer 组合**

在 `drawers.md` 声明 Select 转为移动端 Drawer 时同时执行 Select 规范；关闭路径、遮罩、滚动、焦点等执行 Drawer 硬性规则，而选择值、查询和高亮状态执行 Select 状态规则。

- [ ] **Step 4: 验证路由和组合关系**

Run:

```sh
rg -n 'selects-comboboxes.md|Select|Combobox|Autocomplete|Searchable Select|单选|最终形态|单实例|状态规则' /Users/evanqi/.codex/skills/frontend-product-interaction-standards/SKILL.md /Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/responsive-adaptive.md /Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/drawers.md
```

Expected: 三个文件均明确包含适用关系，且动画和状态归属无冲突。

### Task 3: 更新公开 README

**Files:**
- Modify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/README.md`

**Interfaces:**
- Consumes: `references/selects-comboboxes.md`
- Produces: 面向安装者的 Select 能力摘要和正确目录结构

- [ ] **Step 1: 添加摘要**

摘要包含：自绘可搜索单选、值必须来自已有选项、完整键盘/ARIA、PC 浮层和移动端 Drawer；链接完整规范但不复制全部细则。

- [ ] **Step 2: 更新目录树**

在 `references/` 中列出 `selects-comboboxes.md`。

- [ ] **Step 3: 验证 README**

Run:

```sh
rg -n '可搜索单选|已有选项|键盘|ARIA|移动端 Drawer|selects-comboboxes.md' /Users/evanqi/.codex/skills/frontend-product-interaction-standards/README.md
```

Expected: 摘要、链接和目录项均存在。

### Task 4: 同步项目级 Select 约束

**Files:**
- Modify: `/Users/evanqi/code/fex-admin/AGENTS.md`

**Interfaces:**
- Consumes: `references/selects-comboboxes.md` 的关键硬性规则
- Produces: 即使未加载 Skill 也可独立执行的项目 Select 约束

- [ ] **Step 1: 新增 Searchable single-select constraints**

章节至少包含：单选与已有值范围、状态分离、提交边界、外部关闭/Escape、键盘、ARIA、本地/异步搜索竞态、错误、失效值、PC 定位、移动端 Drawer、虚拟列表和未验证项报告。

- [ ] **Step 2: 链接完整规范**

链接 GitHub `references/selects-comboboxes.md`，但项目章节本身必须可独立执行。

- [ ] **Step 3: 验证项目覆盖范围**

Run:

```sh
rg -n 'Searchable single-select constraints|selectedValue|query|activeOption|combobox|listbox|aria-activedescendant|Escape|stale|Drawer|virtual|unverified' /Users/evanqi/code/fex-admin/AGENTS.md
```

Expected: 所有关键类别均明确出现。

### Task 5: 校验、审查、提交和推送

**Files:**
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/SKILL.md`
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/README.md`
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/selects-comboboxes.md`
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/responsive-adaptive.md`
- Verify: `/Users/evanqi/.codex/skills/frontend-product-interaction-standards/references/drawers.md`
- Verify: `/Users/evanqi/code/fex-admin/AGENTS.md`

**Interfaces:**
- Consumes: Tasks 1–4 的全部规范变更
- Produces: 两个范围明确、经审查并安全推送的 Git 提交

- [ ] **Step 1: 校验 Skill Frontmatter 和格式**

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
git -C /Users/evanqi/.codex/skills/frontend-product-interaction-standards add SKILL.md README.md references/selects-comboboxes.md references/responsive-adaptive.md references/drawers.md
git -C /Users/evanqi/.codex/skills/frontend-product-interaction-standards commit -m "docs: 添加可搜索单选 Select 规范"
```

- [ ] **Step 4: 提交项目仓库**

```sh
git -C /Users/evanqi/code/fex-admin add AGENTS.md
git -C /Users/evanqi/code/fex-admin commit -m "docs: 添加可搜索单选 Select 约束"
```

- [ ] **Step 5: 审查**

独立审查状态模型、键盘/ARIA、异步竞态、跨端动画和 Drawer 组合关系，并要求分别给出 Spec compliance 与 Quality approved。

- [ ] **Step 6: 安全推送**

先推送 Skill，验证公开 `selects-comboboxes.md` 可访问，再推送项目。如果项目本地 `main` 含其他 Agent 的未推送提交，从 `origin/main` 创建临时隔离分支，只挑选本任务的设计、计划和项目约束提交后快进推送；不得夹带业务代码。

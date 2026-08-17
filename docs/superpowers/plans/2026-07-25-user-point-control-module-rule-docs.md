# 用户点控六模块规则文档 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 编写六份精简、可独立复制的用户点控模块规则文档，让开发能够据此实现，让测试能够据此编写测试用例。

**Architecture:** 在 `docs/user-point-control-modules/` 下按模块拆分六个 Markdown 文件。每份文件固定使用“操作、触发、规则、状态、验收点”五段结构，并重复必要的通用规则，使文档可以脱离其他文件独立使用。

**Tech Stack:** Markdown、现有用户点控产品规则、现有前端 Demo 状态模型。

## Global Constraints

- 每个模块一份独立 Markdown 文档，共六份。
- 每份文档约一页，只保留操作、触发、规则、状态和验收点。
- 文档只描述产品规则，不包含 API、数据库、事务或结算服务实现。
- 管理员只设置方向和生效方式，不填写具体金额、价格或收益率。
- 一次性规则执行失败不消费，永久规则持续到取消或覆盖。
- 模块点控只影响当前模块；用户点控设置覆盖六个模块。
- 优先级固定为：单笔订单或持仓控制 > 当前模块用户点控 > 用户管理用户点控 > 模块全局场控 > 自然结果。

---

### Task 1: 交易类模块规则文档

**Files:**
- Create: `docs/user-point-control-modules/delivery-user-point-control.md`
- Create: `docs/user-point-control-modules/perpetual-user-point-control.md`
- Create: `docs/user-point-control-modules/spot-user-point-control.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-25-user-point-control-module-rule-docs-design.md` 的一致结构和通用规则。
- Produces: 三份可独立复制到交割、永续和现货产品文档中的规则说明。

- [ ] **Step 1: 编写交割用户点控规则**

写明：设置盈利/亏损和一次性/永久；只在交割合约到期并完成最终结算时触发；具体金额由本金、周期、赔率和费用计算；不改变公共行情；一次性成功结算后变为已执行，失败仍待执行。

- [ ] **Step 2: 编写永续用户点控规则**

写明：设置盈利/亏损和一次性/永久；只在目标持仓最终平仓结算时触发；不插线、不改 K 线、标记价格和实时浮盈亏；具体金额由仓位、开平仓价格、杠杆、保证金、手续费和资金费计算；同一用户多持仓分别判断。

- [ ] **Step 3: 编写现货用户点控规则**

写明：设置盈利/亏损和一次性/永久；只在卖出或其他业务事件形成可确认的已实现净盈亏并成功入账时触发；持仓市值和未卖出资产浮盈亏不触发；具体金额由成交、成本和手续费计算。

- [ ] **Step 4: 校验三份文档结构与关键边界**

运行：

```bash
for file in docs/user-point-control-modules/{delivery,perpetual,spot}-user-point-control.md; do
  rg -q '^## 1\. 操作$' "$file" &&
  rg -q '^## 2\. 触发$' "$file" &&
  rg -q '^## 3\. 规则$' "$file" &&
  rg -q '^## 4\. 状态$' "$file" &&
  rg -q '^## 5\. 验收点$' "$file"
done
```

预期：命令退出码为 0；三份文档均明确“不修改公共行情”和“按费用后的已实现净结果判断”。

- [ ] **Step 5: 提交交易类模块文档**

```bash
git add docs/user-point-control-modules/delivery-user-point-control.md docs/user-point-control-modules/perpetual-user-point-control.md docs/user-point-control-modules/spot-user-point-control.md
git commit -m "docs: add trade module point-control rules"
```

### Task 2: 理财类模块规则文档

**Files:**
- Create: `docs/user-point-control-modules/ai-quant-user-point-control.md`
- Create: `docs/user-point-control-modules/liquidity-user-point-control.md`
- Create: `docs/user-point-control-modules/portfolio-user-point-control.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-25-user-point-control-module-rule-docs-design.md` 的一致结构和通用规则。
- Produces: 三份可独立复制到 AI量化、流动性挖矿和投资组合产品文档中的规则说明。

- [ ] **Step 1: 编写 AI量化用户点控规则**

写明：设置高收益/低收益和一次性/永久；只在产品结算或实际收益成功入账时触发；申购、运行中预估收益和失败入账不触发；收益率和金额必须在产品允许区间内计算。

- [ ] **Step 2: 编写流动性挖矿用户点控规则**

写明：设置高收益/低收益和一次性/永久；只在周期结算、收益领取或赎回结算成功入账时触发；认购、锁仓中预估收益、取消申请和失败结算不触发；不得突破产品收益和本金边界。

- [ ] **Step 3: 编写投资组合用户点控规则**

写明：设置高收益/低收益和一次性/永久；只在实际收益入账、到期结算或赎回结算成功时触发；申购、持有期估值变化和失败赎回不触发；收益由净值、份额、周期和产品边界计算。

- [ ] **Step 4: 校验三份文档结构与收益边界**

运行：

```bash
for file in docs/user-point-control-modules/{ai-quant,liquidity,portfolio}-user-point-control.md; do
  rg -q '^## 1\. 操作$' "$file" &&
  rg -q '^## 2\. 触发$' "$file" &&
  rg -q '^## 3\. 规则$' "$file" &&
  rg -q '^## 4\. 状态$' "$file" &&
  rg -q '^## 5\. 验收点$' "$file"
done
```

预期：命令退出码为 0；三份文档均明确“高收益/低收益是收益档位”“具体结果不得突破产品允许边界”和“预估收益不触发”。

- [ ] **Step 5: 提交理财类模块文档**

```bash
git add docs/user-point-control-modules/ai-quant-user-point-control.md docs/user-point-control-modules/liquidity-user-point-control.md docs/user-point-control-modules/portfolio-user-point-control.md
git commit -m "docs: add finance module point-control rules"
```

### Task 3: 六模块一致性验收

**Files:**
- Verify: `docs/user-point-control-modules/*.md`

**Interfaces:**
- Consumes: Task 1 和 Task 2 的六份模块文档。
- Produces: 无占位符、无规则矛盾且可交付的完整文档集合。

- [ ] **Step 1: 检查文件数量与占位符**

运行：

```bash
test "$(find docs/user-point-control-modules -maxdepth 1 -name '*-user-point-control.md' | wc -l | tr -d ' ')" = "6"
! rg -n 'TBD|TODO|待定|暂定|接口|数据库字段' docs/user-point-control-modules
```

预期：六份文档存在，且无占位符或超出产品规则层的技术内容。

- [ ] **Step 2: 检查通用规则是否完整**

逐份确认以下结论均可直接从文档读取：模块设置范围、触发与不触发事件、一次性失败不消费、永久规则结束条件、覆盖与取消状态、规则优先级、日志要求和可测试的验收点。

- [ ] **Step 3: 检查 Markdown 格式**

运行：

```bash
git diff --check -- docs/user-point-control-modules
```

预期：退出码为 0。

- [ ] **Step 4: 提交最终修订（仅在一致性检查产生修改时）**

```bash
git add docs/user-point-control-modules
git commit -m "docs: align module point-control rule wording"
```

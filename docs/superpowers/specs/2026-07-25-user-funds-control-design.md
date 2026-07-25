# 用户资金控制操作设计

## 范围

本批次实现用户操作抽屉中的四个资金能力：

1. 冻结全部资金
2. 解冻后台冻结
3. 划扣可用资金
4. 出金流水限制

“链上钱包”和信用／会员能力继续作为后续独立批次。本批次不改全局出金额度策略，也不把计划入口误标为可用。

## 方案选择

采用“专用资金仓储 + 两个业务 Dialog + 独立 MFA 流程”。

- 一个资金变更 Dialog 按模式承载冻结、解冻和划扣，但每种模式使用独立标题、说明、字段、风险文案和确认摘要。
- 一个出金流水限制 Dialog 负责查看、设置、修改和解除用户级流水要求。
- 一个独立于点控流程的 MFA 状态机执行本批次资金操作，避免复用 `controlUser`、点控 pending action 或点控成功回调。

未采用四个完全独立 Dialog，因为冻结和解冻共享相同的余额快照、原因、确认和 MFA 语义，复制组件会增加状态与层级缺陷。未采用一个包含四个页签的大 Dialog，因为管理员从明确入口进入后不应再次选择操作，且危险操作之间不应在弹层内自由切换。

## 数据模型

新增 `userFundsRepository`，使用现有 `usersList` 作为用户聚合余额事实来源，并维护以下独立状态：

```js
{
  adminFrozenByUser: {
    [userId]: number
  },
  withdrawFlowLimits: {
    [userId]: {
      requiredTurnover: number,
      completedTurnover: number,
      expiresAt: string | null,
      reason: string,
      updatedAt: string
    }
  },
  auditLog: Array<{
    id: string,
    transactionId: string,
    type: 'freeze' | 'unfreeze' | 'deduct' | 'flow-limit-set' | 'flow-limit-remove',
    userId: string,
    before: object,
    after: object,
    amount: number | null,
    reason: string,
    operatorId: string,
    createdAt: string
  }>
}
```

金额统一按 USDT 处理，最多两位小数。所有仓储操作先完整验证，再执行一次性内存写入；验证失败不得产生部分余额变化或审计记录。

## 资金规则

### 冻结全部资金

- 冻结执行时刻的全部可用余额 `balance`。
- `balance` 减少相同金额，`frozenBalance` 增加相同金额，用户总资产不变。
- 同时把本次金额累加到 `adminFrozenByUser[userId]`，用于区分其他业务冻结。
- 可用余额为零时拒绝操作，提示“当前没有可冻结的可用资金”。
- 操作原因必填，最多 200 字。

### 解冻后台冻结

- 只释放 `adminFrozenByUser[userId]` 记录的金额，不释放订单占用、风控或其他来源的冻结资金。
- 实际释放额为后台冻结记录与当前 `frozenBalance` 的较小值，避免外部状态变化导致冻结余额变为负数。
- 释放额加回 `balance`，从 `frozenBalance` 扣除，并把对应后台冻结记录减至零。
- 没有后台冻结金额时拒绝操作。
- 操作原因必填，最多 200 字。

### 划扣可用资金

- 金额必须大于零、最多两位小数，且不得超过执行时刻的可用余额。
- 成功后仅减少 `balance`，用户总资产同步减少；`frozenBalance` 不变。
- 原因必填，最多 200 字。
- 成功记录不可修改的 `transactionId`，后续“划扣记录”从同一审计数据读取，不另建重复数据源。

## 出金流水限制

用户级流水限制独立于全局最低出金额和每日额度策略。全局策略决定额度，用户级流水规则决定当前是否允许出金；两者同时生效。

规则字段：

- 要求流水 `requiredTurnover`：大于零，最多两位小数。
- 已完成流水 `completedTurnover`：大于等于零，最多两位小数，不得大于要求流水。
- 有效期 `expiresAt`：可为空，表示长期有效；填写时必须晚于当前时间。
- 原因 `reason`：必填，最多 200 字。

状态计算：

- 没有规则：`none`。
- 已完成流水等于要求流水：`completed`，允许出金。
- 当前时间达到有效期：`expired`，允许出金。
- 其他情况：`active`，限制出金。

设置和修改规则均覆盖该用户上一条当前规则并写审计记录。解除规则要求单独填写解除原因并经过 MFA，成功后删除当前规则但保留审计历史。

本批次允许管理员维护“已完成流水”，因为项目尚无逐笔交易流水聚合服务；字段在界面明确标为后台维护值。未来接入真实流水服务时，仓储接口保持不变，只替换完成值的数据来源。

## 交互流程

### 冻结、解冻和划扣

业务 Dialog 分两阶段：

1. 编辑阶段展示用户、当前可用余额、当前冻结余额、后台冻结金额；划扣额仅在划扣模式显示，原因始终必填。
2. 确认阶段展示操作前后可用余额、冻结余额、总资产和原因。默认焦点落在“返回修改”，避免危险按钮成为初始焦点。

点击“提交并验证”打开 MFA。MFA 成功后仓储重新读取最新余额并重新校验；若余额已变化导致操作失效，MFA 保持打开并显示文本错误，资金 Dialog 与父操作抽屉都不关闭。

### 出金流水限制

Dialog 顶部展示当前状态和剩余流水。没有规则时进入新增表单；存在规则时可修改或进入解除确认。新增、修改和解除都必须经过 MFA。

成功后关闭 MFA 和当前业务 Dialog，父用户操作抽屉继续保持打开，并立即刷新该用户快照。失败时所有层保持挂载，错误显示在最上层 MFA；取消 MFA 返回原业务 Dialog，不丢失表单。

## 弹层层级

固定层级关系：

1. 用户操作 Drawer：第一层。
2. 资金业务 Dialog：第二层。
3. MFA Dialog：第三层。

三层全部 Teleport 到 `body` 并使用 `useDialogLifecycle` 的共享动态层级。仅最上层可交互，下层和页面保持 `inert`。不得关闭父 Drawer 来打开业务 Dialog，也不得设置局部固定 `z-index`。

关闭业务 Dialog 后焦点返回其操作卡片；取消 MFA 后焦点返回业务 Dialog 的提交按钮。Escape 每次只关闭最上层；MFA 验证中禁止 Escape、关闭和重复提交。遮罩点击、拖动和滑动不关闭任何层。

Dialog 外框使用 `overflow-hidden`，仅内容区 `overflow-y-auto`；头部关闭按钮和底部操作固定。打开为 `200ms ease-out` 淡入与 `scale(0.96)`，关闭为 `150ms ease-in` 反向动画并在结束后卸载；Reduced Motion 取消缩放并限制为 `50ms` 淡入淡出。

## 组件与职责

### `userFundsRepository.js`

负责金额规范化、最新状态校验、原子余额变更、流水限制状态计算和审计记录。组件不得直接修改 `usersList` 中的余额。

公开接口：

```js
getFundsSnapshot(userId)
freezeAllAvailable({ userId, reason, operatorId })
unfreezeAdminFunds({ userId, reason, operatorId })
deductAvailableFunds({ userId, amount, reason, operatorId })
getWithdrawFlowLimit(userId)
setWithdrawFlowLimit({ userId, requiredTurnover, completedTurnover, expiresAt, reason, operatorId })
removeWithdrawFlowLimit({ userId, reason, operatorId })
getFundsAuditLog({ userId, type })
```

### `UserFundsMutationDialog.vue`

只负责冻结、解冻和划扣表单、确认摘要、错误展示以及提交 MFA 请求，不直接写余额。

### `UserWithdrawFlowLimitDialog.vue`

只负责用户级流水规则表单、状态摘要、解除确认和提交 MFA 请求。

### `UserListPage.vue`

负责从操作入口打开第二层 Dialog，维护返回焦点，启动独立资金 MFA 流程，成功后同步列表用户和操作 Drawer 用户快照。

## 错误与异步行为

- 表单错误显示在业务 Dialog 的文本错误摘要，并把焦点移入摘要。
- 仓储或 MFA 执行错误显示在 MFA 的错误区域，MFA 保持打开。
- MFA 请求中禁用业务 Dialog 的关闭、取消、提交和 Escape；下层本身也因不是最上层而不可交互。
- 每次打开清除旧表单错误、确认阶段和 loading；关闭动画期间保留当前用户和快照。
- 防止双击导致重复仓储写入或重复审计记录。

## 测试与验收

### 仓储测试

1. 冻结把全部可用余额移入冻结余额并累计后台冻结来源。
2. 解冻只释放后台冻结，保留原有业务冻结。
3. 划扣减少可用余额并拒绝零、负数、超过两位小数和余额不足。
4. 所有失败操作保持用户余额与审计记录不变。
5. 流水限制正确计算 `none`、`active`、`completed`、`expired`，设置和解除均写审计。

### 组件与集成测试

1. 四个入口由 `planned` 变为 `available` 并使用独立 handler。
2. 三种资金变更模式显示正确标题、字段和前后余额。
3. 流水限制支持新增、修改和解除，表单错误可聚焦。
4. 父 Drawer、业务 Dialog、MFA 同时挂载时层级依次递增，只有 MFA 可交互。
5. 取消 MFA 保留业务表单；成功后列表和操作 Drawer 余额同步更新。
6. 遮罩点击不关闭，Escape 只关闭最上层，关闭动画结束后焦点返回原卡片。
7. 桌面、窄屏、低高度和长文案下只有内容区滚动，固定头尾和关闭按钮可达。

## 非目标

- 不实现链上钱包和手动上分地址。
- 不实现划扣记录独立一级入口。
- 不接入真实后端、真实 MFA 服务或真实交易流水聚合。
- 不修改全局出金策略的最低金额、每日额度或命中优先级。

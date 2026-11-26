# AI 量化 · 策略模块后台设计（已确认方向，2026-11-26）

范围：为新前端 `/NewQuantCapital/ai-quant/strategy`（策略模板 / 我的策略 / 每日统计）设计管理后台。
不包含量化基金（Quant Fund），也不改动现有 `/admin/ai-quant/*`（那是旧前台的固定收益类产品：分档日利率、期限、提前赎回费，没有模板订阅、止盈止损、暂停/停止）。

## 1. 前台现状（后台要承接的业务）

| 对象 | 前台字段 / 行为 | 来源 |
|---|---|---|
| 策略模板 | 名称、市场（股票/加密/外汇）、风格（保守/平衡/激进）、风险等级 1–4、夏普比率、胜率、日均交易数、交易品种、描述；起投/上限资金、周期 min–max 天、手续费 0.1%、最大持仓数 3 | `newtrend-website/src/mock/catalog.js`、`utils/strategyTemplates.js` |
| 订阅校验 | 资金 ∈ [min,max] 且 ≤ 余额；天数为整数且在周期内；止盈 1–100%，止损 1–50%；requestId 防重 | `strategyValidation` / `subscribeStrategy` |
| 用户策略 | 资金、天数、止盈、止损、状态、P&L、创建/到期/停止时间、每日统计（日期、成交笔数、当日盈亏）；按 真實/模擬 分开 | `strategyPortfolio.js` |
| 状态 | running ⇄ paused → completed（用户停止或到期）；参照站另有 initializing、pending_review、rejected 文案 | `changeStrategyStatus`、`aiQuant.status.*` |
| 资金 | 订阅扣本金；停止/到期返还 本金 + P&L（经前台账本） | `mock/ledger.js` |

前台目前没有：自动生成 P&L、止盈止损触发、后台审核、与后台模板同步。

## 2. 建议的模块与导航

新建独立模块 `/admin/strategy/*`，侧边栏分组「AI 策略」，与 Earn / Lending 同一套页面规范（查询卡片 + 表格卡片、单页分组编辑器、列表操作列上下架、toast 反馈、模拟审核人标注、操作日志）。

| 菜单 | 路由 | 内容 |
|---|---|---|
| 策略模板 | `/admin/strategy/templates`（+ `/new`、`/:id/edit`） | 模板列表、上下架、排序/推荐 |
| 用户策略 | `/admin/strategy/subscriptions` | 全部用户策略；审核（若启用）、强制停止、详情 |
| 收益记录 | `/admin/strategy/daily-pnl` | 按策略 × 日期的成交笔数与盈亏；人工调整记录 |
| 结算记录 | `/admin/strategy/settlements` | 停止 / 到期 / 止盈 / 止损 / 强制停止 的返还明细 |
| 风控设置 | `/admin/strategy/risk-policy` | 全局限额与自动处理开关 |
| 操作日志 | `/admin/strategy/logs` | 所有后台与系统动作 |

## 3. 页面设计

### 3.1 策略模板
- 查询：名称、市场、风格、状态（已上架/未上架）。
- 列表列：排序、名称、市场、风格、风险等级、起投–上限（USDT，右对齐）、周期、运行中订阅数 / 在管资金、状态、操作（编辑 / 上架或下架 / 详情）。
- 编辑页分组（不改状态，新模板默认未上架，保存记录前后差异）：
  1. 基本信息：名称（多语言）、市场、风格、风险等级、描述、交易品种（多选）、封面/图标。
  2. 展示指标：夏普比率、胜率、日均交易数（展示值，非计算值）、是否推荐、排序。
  3. 订阅规则：起投 / 单笔上限、周期 min–max 天、止盈可选范围与默认值、止损可选范围与默认值、手续费率、最大持仓数、单用户运行中上限、模板总容量。
  4. 申购条件：最低认证等级、最低 VIP（与 Earn / Lending 同口径，默认不限）。
  5. 收益模拟：日收益率下限 / 上限、交易日比例、单日成交笔数范围（供服务端每日生成 P&L）。
- 规则：已有订阅冻结订阅时的模板快照（资金、周期、止盈止损、费率、收益区间）；模板修改不追溯；并发编辑做版本校验。

### 3.2 用户策略（订阅）
- 查询：用户 ID / 邮箱、订单号、模板、状态、创建时间范围。
- 列表列：订单号、用户、模板、资金、周期（天）、止盈 / 止损、累计盈亏（正绿负红 + 文本符号）、收益率、状态（StatusTag）、创建 / 到期时间、审核人、操作。
- 状态机（服务端校验，重复处理拒绝）：
  `pending_review →(通过) initializing → running ⇄ paused → completed`；`pending_review →(拒绝) rejected`（退回冻结资金）；`running|paused →(强制停止) completed`。
  completed 细分结束原因：user_stop / expired / take_profit / stop_loss / admin_stop。
- 操作：待审核 → 主按钮「审核」（通过/拒绝弹窗，显示资金、余额快照、条件快照）；已处理 → 「详情」只读抽屉（基础信息、模板快照、每日收益表、结算明细、日志）；运行中/暂停 → 「强制停止」（危险按钮 + 二次确认，按 本金 + 已实现盈亏 结算）。
- 不提供后台代用户暂停/恢复（保持为用户动作），如需要可后加。

### 3.3 收益记录
- 每条：策略订单、日期、成交笔数、当日盈亏、来源（系统生成 / 人工调整）、操作人。
- 人工调整：对某订单某日追加一条调整记录（不改原记录），自动写日志；累计盈亏 = Σ 每日记录。
- 每日生成任务（模拟）：对 running 订单按模板快照的收益区间生成当日记录；生成后检查止盈止损，命中即按原因结算。

### 3.4 结算记录
- 每条：订单、用户、原因、本金、累计盈亏、手续费、返还金额、时间、处理人（系统 / 模拟管理员）。只读，可导出。

### 3.5 风控设置
- 单用户运行中策略上限、单用户总在管资金上限、是否启用订阅审核、到期自动结算、止盈止损自动触发、异常亏损告警阈值。保存需版本校验并记录前后差异；新订阅快照当时的策略设置。

## 4. 数据与前台联动

两种可选方案（见待确认 2）：
- A. 共享服务端 Mock（同 Lending）：新增 `mock/strategyPlugin.js` → `/api/mock/strategy`，状态在 dev/preview 服务器内存中（重启重置）；`src/shared/strategy/{service,domain,seed,client}.js`；前台 `newtrend-website/src/platform/strategyClient.js` 读取模板目录、提交订阅、读取我的策略与每日统计。后台的上下架、审核、强制停止会实时反映到前台。真實模式走服务端；模擬模式继续使用前台本地账本。
- B. 独立本地状态（同 Earn）：后台用 `src/admin/state/strategy.js` 自带种子数据，前台不变；之后再接入。

核心实体（A/B 通用）：`StrategyTemplate`、`StrategySubscription`（含 templateSnapshot、eligibilitySnapshot、policySnapshot、version）、`StrategyDailyPnl`、`StrategySettlement`、`StrategyRiskPolicy`、`StrategyOperationLog`（operator 标注「管理员（模拟）」/「系统」）。

## 5. 已确认决定（用户，2026-11-26）

1. 新建独立「AI 策略」分组 `/admin/strategy/*`，不并入现有「AI量化交易」。
2. 前台联动采用共享服务端 Mock（方案 A，`/api/mock/strategy`）：真實 模式读写服务端，模擬 模式继续用前台本地账本。
3. 订阅审核由风控设置开关控制，默认开启：新订阅进入「审核中」，通过后初始化→运行，拒绝退回资金。
4. 每日盈亏由模板配置的收益区间在服务端每日生成，并触发止盈止损与到期结算；人工调整以追加记录方式辅助。

## 6. 验证计划（实现阶段）
- 领域单测：状态机、重复审核/结算拒绝、版本冲突、止盈止损命中、到期结算金额、快照不随模板修改。
- 页面：查询/重置、分页、编辑器分组校验、上下架确认、审核弹窗、详情抽屉、强制停止二次确认、toast 反馈；桌面宽度（后台不做移动端）。
- 联动（方案 A）：后台上下架 → 前台目录；审核通过 → 前台我的策略状态；强制停止 → 前台余额与结算。

## 7. 实现记录（2026-11-26）

- 共享领域与 Mock：`src/shared/strategy/{domain,seed,service,client}.js`，`mock/strategyPlugin.js`（`/api/mock/strategy`，已在 `vite.config.js` 注册；开发/预览服务器内存态，重启或修改共享领域代码会重置）。
  - 状态机：`pending_review → initializing →（60 秒）running ⇄ paused → completed`；`pending_review → rejected` 退回本金。结束原因 user_stop / expired / take_profit / stop_loss / admin_stop。
  - 每日盈亏：按订阅快照的日收益区间与交易日比例确定性生成（每个完整运行日一条，UTC+8 日期），生成后检查止盈止损；到期按快照规则自动结算。人工调整追加 `source: manual` 记录。
  - 所有命令 requestId 防重、状态守卫；模板保存按 version 校验，风控按 expectedPolicy 校验；日志区分「管理员（模拟）/用户（模拟）/系统」。
  - 种子：9 个模板（来自前台目录）、USR-DEMO 的 12 条历史记录 + 1 条待审核、另外 3 个模拟用户（待审核、运行中含亏损预警、已拒绝）。USR-DEMO 策略账户 20,000 USDT（服务端模拟余额，与借贷同样独立于前台账本）。
- 后台页面 `src/pages/admin/strategy/*`，导航「AI 策略」：策略模板（列表 + 单页分组编辑器）、用户策略（审核/详情/调整盈亏/强制停止）、收益记录、结算记录、风控设置、操作日志。复用 Earn 的 PageShell / SearchForm / AdminTable（新增 loading 态）/ AdminModal。
- 前台 `newtrend-website`：
  - 策略目录在两种模式下都读取服务端「已上架」模板（`strategyCatalog` 为 computed）；止盈止损范围与默认值来自模板。
  - 真實：记录、余额与订阅/暂停/恢复/停止走共享 Mock（`platform/strategyClient.js`），新订阅按风控进入「審核中」并提示「已提交，等待審核」。
  - 模擬：仍为本地账本与本地记录，不进入后台。
- 测试：根目录 `test/strategyDomain.test.js`（12 项：审核流、生成与幂等、止盈止损、到期、暂停/恢复/停止、快照与版本、上下架、各类限额、人工调整、风控、亏损预警）；前台测试改为验证 模擬 本地数据，真實 由根测试覆盖。
- 未做：初始化时长、交易日比例等不可在页面直接模拟时间推进（依赖真实时钟，单测用注入时间覆盖）；后台未提供代用户暂停/恢复；结算未单独扣手续费（费率为展示与快照字段）。

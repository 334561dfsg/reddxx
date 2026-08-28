import {
  USER_AUDIT_ACTIONS,
  USER_AUDIT_CATEGORIES,
  USER_AUDIT_RESULTS,
  USER_AUDIT_SOURCES,
  userAuditActionLabel,
  userAuditCategoryLabel,
  userAuditResultLabel,
  userAuditSourceLabel
} from '../constants/userAuditLog.js'

const mutableAuditLogs = []
let sequence = 0

const optionValues = (options) => new Set(options.map((item) => item.value))
const validCategories = optionValues(USER_AUDIT_CATEGORIES)
const validSources = optionValues(USER_AUDIT_SOURCES)
const validResults = optionValues(USER_AUDIT_RESULTS)
const validActions = optionValues(USER_AUDIT_ACTIONS)

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const compactText = (value) => String(value ?? '').trim()
const lowercase = (value) => compactText(value).toLowerCase()

const freezeDeep = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const item of Object.values(value)) freezeDeep(item)
  return Object.freeze(value)
}

const requireOption = (value, allowed, label) => {
  const normalized = compactText(value)
  if (!allowed.has(normalized)) throw new Error(`${label}无效`)
  return normalized
}

const normalizeTime = (value) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) throw new Error('操作时间无效')
  return date.toISOString()
}

const nextAuditId = () => {
  sequence += 1
  return `UAUD-${Date.now()}-${String(sequence).padStart(4, '0')}`
}

const normalizeTargetUser = (targetUser = {}) => {
  const uid = compactText(targetUser.uid ?? targetUser.id ?? targetUser.userId)
  if (!uid) throw new Error('目标用户必填')
  return {
    uid,
    name: compactText(targetUser.name ?? targetUser.username),
    email: compactText(targetUser.email),
    phone: compactText(targetUser.phone)
  }
}

const normalizeOperator = (operator = {}, source) => {
  const id = compactText(operator.id ?? operator.operatorId)
  const name = compactText(operator.name ?? operator.operatorName)
  if (source === 'admin' && !id && !name) throw new Error('操作人必填')
  return {
    id: id || (source === 'admin' ? 'admin_current' : source),
    name: name || userAuditSourceLabel(source)
  }
}

const valuesEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right)

export const createUserAuditDiff = (before = {}, after = {}, fields = null) => {
  const keys = fields?.length ? fields : [...new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {})
  ])]

  return keys
    .filter((field) => !valuesEqual(before?.[field], after?.[field]))
    .map((field) => ({
      field,
      before: clone(before?.[field] ?? null),
      after: clone(after?.[field] ?? null)
    }))
}

const normalizeRelated = (related = {}) => ({
  businessId: compactText(related.businessId),
  requestId: compactText(related.requestId),
  auditReceiptId: compactText(related.auditReceiptId),
  ruleId: compactText(related.ruleId),
  taskId: compactText(related.taskId),
  tenant: compactText(related.tenant),
  workspace: compactText(related.workspace),
  permissionVersion: compactText(related.permissionVersion)
})

const createSummary = ({ action, targetUser, diff, result }) => {
  if (result !== 'success') return `${userAuditActionLabel(action)}：${userAuditResultLabel(result)}`
  const fields = diff.map((item) => item.field).join('、')
  return fields
    ? `${userAuditActionLabel(action)}，变更字段：${fields}`
    : `${userAuditActionLabel(action)}，目标用户：${targetUser.uid}`
}

export const appendUserAuditLog = (input = {}) => {
  const source = requireOption(input.source || 'admin', validSources, '操作来源')
  const category = requireOption(input.category, validCategories, '日志分类')
  const action = requireOption(input.action, validActions, '操作类型')
  const result = requireOption(input.result || 'success', validResults, '操作结果')
  const reason = compactText(input.reason)
  if (reason.length > 200) throw new Error('操作原因不能超过 200 字')

  const targetUser = normalizeTargetUser(input.targetUser)
  const operator = normalizeOperator(input.operator, source)
  const before = clone(input.before ?? {})
  const after = clone(input.after ?? {})
  const diff = Array.isArray(input.diff)
    ? clone(input.diff)
    : createUserAuditDiff(before, after, input.fields)
  const related = normalizeRelated(input.related)
  const occurredAt = normalizeTime(input.occurredAt)

  const record = {
    id: compactText(input.id) || nextAuditId(),
    occurredAt,
    targetUser,
    source,
    sourceLabel: userAuditSourceLabel(source),
    operator,
    category,
    categoryLabel: userAuditCategoryLabel(category),
    action,
    actionLabel: userAuditActionLabel(action),
    result,
    resultLabel: userAuditResultLabel(result),
    reason,
    summary: compactText(input.summary) || createSummary({ action, targetUser, diff, result }),
    before,
    after,
    diff,
    related,
    createdAt: new Date().toISOString()
  }
  mutableAuditLogs.push(record)
  return freezeDeep(clone(record))
}

const includesText = (value, keyword) => !keyword || lowercase(value).includes(keyword)

const relatedMatches = (related, keyword) => {
  if (!keyword) return true
  return Object.values(related || {}).some((value) => lowercase(value).includes(keyword))
}

const matchesRecord = (record, filters = {}) => {
  const keyword = lowercase(filters.keyword)
  const operatorKeyword = lowercase(filters.operatorKeyword)
  const reasonKeyword = lowercase(filters.reasonKeyword)
  const relatedKeyword = lowercase(filters.relatedKeyword)
  const fromTime = filters.timeFrom ? new Date(filters.timeFrom).getTime() : null
  const toTime = filters.timeTo ? new Date(filters.timeTo).getTime() : null
  const occurredAt = new Date(record.occurredAt).getTime()

  if (keyword) {
    const targetValues = [
      record.targetUser.uid,
      record.targetUser.name,
      record.targetUser.email,
      record.targetUser.phone
    ]
    if (!targetValues.some((value) => lowercase(value).includes(keyword))) return false
  }
  if (operatorKeyword) {
    const operatorValues = [record.operator.id, record.operator.name, record.sourceLabel]
    if (!operatorValues.some((value) => lowercase(value).includes(operatorKeyword))) return false
  }
  if (filters.category && record.category !== filters.category) return false
  if (filters.action && record.action !== filters.action) return false
  if (filters.result && record.result !== filters.result) return false
  if (!includesText(record.reason, reasonKeyword)) return false
  if (!relatedMatches(record.related, relatedKeyword)) return false
  if (fromTime !== null && occurredAt < fromTime) return false
  if (toTime !== null && occurredAt > toTime) return false
  return true
}

export const queryUserAuditLogs = ({ filters = {}, page = 1, pageSize = 20 } = {}) => {
  const safePageSize = Math.max(1, Number(pageSize) || 20)
  const safePage = Math.max(1, Number(page) || 1)
  const rows = mutableAuditLogs
    .filter((record) => matchesRecord(record, filters))
    .sort((left, right) => {
      const byTime = new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
      if (byTime) return byTime
      return String(right.id).localeCompare(String(left.id))
    })
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / safePageSize))
  const currentPage = Math.min(safePage, totalPages)
  const start = (currentPage - 1) * safePageSize

  return freezeDeep({
    rows: rows.slice(start, start + safePageSize).map((row) => clone(row)),
    total,
    page: currentPage,
    pageSize: safePageSize,
    totalPages,
    appliedFilters: clone(filters)
  })
}

const seedAuditLogs = () => {
  mutableAuditLogs.splice(0)
  sequence = 0
  const seedRows = [
    {
      id: 'UAUD-SEED-046',
      occurredAt: '2026-07-28T00:05:00.000Z',
      targetUser: { uid: 'user_1004', name: 'user_chen', email: 'chen@example.com', phone: '8613910001004' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'permission',
      action: 'relationship.agent-parent.set',
      result: 'success',
      reason: '客服调整用户上级代理',
      before: { agentParentId: null, agentParentUsername: null },
      after: { agentParentId: 'user_1001', agentParentUsername: 'agent_wang' },
      related: { businessId: 'REL-agent-parent-user_1004', requestId: 'REQ-AGENT-PARENT-user_1004' }
    },
    {
      id: 'UAUD-SEED-045',
      occurredAt: '2026-07-27T23:50:00.000Z',
      targetUser: { uid: 'user_1001', name: 'agent_wang', email: 'wang@agent.com', phone: '13800138001' },
      source: 'user',
      operator: { id: 'user_1001', name: 'agent_wang' },
      category: 'profile',
      action: 'profile.update',
      result: 'success',
      reason: '用户在个人中心完成短信验证后修改手机号',
      before: { phone: '13800138001', phoneVerified: true },
      after: { phone: '13900139001', phoneVerified: true },
      related: { requestId: 'SELF-PROFILE-user_1001-phone' }
    },
    {
      id: 'UAUD-SEED-044',
      occurredAt: '2026-07-27T23:35:00.000Z',
      targetUser: { uid: 'user_1005', name: 'user_liu', email: 'liu@example.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'profile',
      action: 'profile.update',
      result: 'failed',
      reason: '邮箱已被其他用户占用，资料未写入',
      before: { email: 'liu@example.com', remark: '普通用户' },
      after: { email: 'liu@example.com', remark: '普通用户' },
      related: { requestId: 'REQ-PROFILE-user_1005-failed' }
    },
    {
      id: 'UAUD-SEED-043',
      occurredAt: '2026-07-27T23:20:00.000Z',
      targetUser: { uid: 'user_1004', name: 'user_chen', email: 'chen@example.com' },
      source: 'admin',
      operator: { id: 'ops_lead', name: '运营主管' },
      category: 'profile',
      action: 'profile.update',
      result: 'unknown',
      reason: '资料保存请求已提交，等待缓存刷新确认',
      before: { remark: '待补充资料' },
      after: { remark: '待补充资料' },
      related: { requestId: 'REQ-PROFILE-user_1004-pending' }
    },
    {
      id: 'UAUD-SEED-042',
      occurredAt: '2026-07-27T23:05:00.000Z',
      targetUser: { uid: 'user_1009', name: 'agent_zhao', email: 'zhao@agent.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'permission',
      action: 'permission.agent-role.update',
      result: 'success',
      reason: '渠道审核通过，设置为代理',
      before: { role: 'user', directChildren: [] },
      after: { role: 'agent', directChildren: [] },
      related: { businessId: 'REL-agent-role-user_1009-promote' }
    },
    {
      id: 'UAUD-SEED-041',
      occurredAt: '2026-07-27T22:50:00.000Z',
      targetUser: { uid: 'user_1003', name: 'agent_li', email: 'li@agent.com' },
      source: 'admin',
      operator: { id: 'ops_lead', name: '运营主管' },
      category: 'permission',
      action: 'permission.agent-role.update',
      result: 'partial',
      reason: '取消代理身份成功，部分直属下级承接人为空待补录',
      before: { role: 'agent', directChildren: ['user_1004', 'user_1006', 'user_1008', 'user_1010'] },
      after: { role: 'user', reassignedChildren: ['user_1004', 'user_1006'], pendingChildren: ['user_1008', 'user_1010'] },
      related: { businessId: 'REL-agent-role-user_1003-partial', requestId: 'REL-AFFECTED-4' }
    },
    {
      id: 'UAUD-SEED-040',
      occurredAt: '2026-07-27T22:35:00.000Z',
      targetUser: { uid: 'user_1006', name: 'new_user_wang', email: 'newwang@example.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'permission',
      action: 'relationship.parent.reset',
      result: 'failed',
      reason: '不能选择已封禁用户作为裂变上级，关系未调整',
      before: { parentId: null, parentUsername: null },
      after: { parentId: null, parentUsername: null },
      related: { businessId: 'REL-parent-reset-user_1006-failed' }
    },
    {
      id: 'UAUD-SEED-039',
      occurredAt: '2026-07-27T22:20:00.000Z',
      targetUser: { uid: 'user_1004', name: 'user_chen', email: 'chen@example.com' },
      source: 'admin',
      operator: { id: 'finance_ops', name: '财务运营' },
      category: 'funds',
      action: 'funds.deposit.manual-credit',
      result: 'failed',
      reason: '客服入金凭证流水号重复，未入账',
      before: { marketBalance: 61000, cumulativeRecharge: 170000 },
      after: { marketBalance: 61000, cumulativeRecharge: 170000 },
      related: { businessId: 'DEP-user_1004-manual-dup', auditReceiptId: 'DEPOSIT-REVIEW-1004-dup' }
    },
    {
      id: 'UAUD-SEED-038',
      occurredAt: '2026-07-27T22:05:00.000Z',
      targetUser: { uid: 'user_1002', name: 'vip_zhang', email: 'zhang@vip.com' },
      source: 'admin',
      operator: { id: 'finance_ops', name: '财务运营' },
      category: 'funds',
      action: 'funds.transfer.internal',
      result: 'failed',
      reason: '划出账户余额不足，账户间划转未执行',
      before: { wealth: 110000, perp: 90000, totalBalance: 350000 },
      after: { wealth: 110000, perp: 90000, totalBalance: 350000 },
      related: { businessId: 'TRANSFER-user_1002-failed' }
    },
    {
      id: 'UAUD-SEED-037',
      occurredAt: '2026-07-27T21:50:00.000Z',
      targetUser: { uid: 'user_1001', name: 'agent_wang', email: 'wang@agent.com' },
      source: 'system',
      operator: { id: 'asset-ledger-sync', name: '资产流水同步' },
      category: 'funds',
      action: 'funds.transfer.internal',
      result: 'unknown',
      reason: '账户间划转已生成流水，等待资产账本确认',
      before: { market: 500000, trading: 0, syncStatus: 'pending' },
      after: { market: 500000, trading: 0, syncStatus: 'pending' },
      related: { businessId: 'TRANSFER-user_1001-pending', taskId: 'LEDGER-SYNC-20260727-01' }
    },
    {
      id: 'UAUD-SEED-036',
      occurredAt: '2026-07-27T21:35:00.000Z',
      targetUser: { uid: 'user_1005', name: 'user_liu', email: 'liu@example.com' },
      source: 'admin',
      operator: { id: 'finance_ops', name: '财务运营' },
      category: 'funds',
      action: 'funds.rebate.grant',
      result: 'failed',
      reason: '返利金额超过本次活动可补发额度，未入账',
      before: { balance: 28000, campaignRemainAmount: 100 },
      after: { balance: 28000, campaignRemainAmount: 100 },
      related: { businessId: 'REB-user_1005-failed' }
    },
    {
      id: 'UAUD-SEED-035',
      occurredAt: '2026-07-27T21:20:00.000Z',
      targetUser: { uid: 'user_1005', name: 'user_liu', email: 'liu@example.com' },
      source: 'admin',
      operator: { id: 'finance_ops', name: '财务运营' },
      category: 'funds',
      action: 'funds.flow-limit.remove',
      result: 'failed',
      reason: '当前没有生效中的出金流水限制，解除失败',
      before: { status: 'none', requiredTurnover: 0 },
      after: { status: 'none', requiredTurnover: 0 },
      related: { businessId: 'FLOW-LIMIT-user_1005-remove-failed' }
    },
    {
      id: 'UAUD-SEED-034',
      occurredAt: '2026-07-27T21:05:00.000Z',
      targetUser: { uid: 'user_1002', name: 'vip_zhang', email: 'zhang@vip.com' },
      source: 'system',
      operator: { id: 'vip-recharge-recalc', name: '会员累计充值重算' },
      category: 'membership',
      action: 'membership.vip.set',
      result: 'success',
      reason: '累计充值达到等级门槛，系统同步会员等级',
      before: { vipLevel: 2, qualifyingRecharge: 295000 },
      after: { vipLevel: 3, qualifyingRecharge: 305000 },
      related: { taskId: 'VIP-RECALC-20260727-01' }
    },
    {
      id: 'UAUD-SEED-033',
      occurredAt: '2026-07-27T20:50:00.000Z',
      targetUser: { uid: 'user_1006', name: 'new_user_wang', email: 'newwang@example.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'membership',
      action: 'membership.vip.set',
      result: 'failed',
      reason: '目标会员等级不存在或未启用，等级未调整',
      before: { vipLevel: 0, isVip: false },
      after: { vipLevel: 0, isVip: false },
      related: { businessId: 'VIP-ADJ-user_1006-failed' }
    },
    {
      id: 'UAUD-SEED-032',
      occurredAt: '2026-07-27T20:35:00.000Z',
      targetUser: { uid: 'user_1007', name: 'suspended_user', email: 'suspended@example.com' },
      source: 'admin',
      operator: { id: 'risk_admin', name: '风控管理员' },
      category: 'membership',
      action: 'membership.credit.adjust',
      result: 'failed',
      reason: '调整后信用分超出允许范围，信用分未变化',
      before: { creditScore: 20 },
      after: { creditScore: 20 },
      related: { businessId: 'MEM-credit-adjust-user_1007-failed' }
    },
    {
      id: 'UAUD-SEED-031',
      occurredAt: '2026-07-27T20:20:00.000Z',
      targetUser: { uid: 'user_1004', name: 'user_chen', email: 'chen@example.com' },
      source: 'admin',
      operator: { id: 'admin_auditor_01', name: '审核管理员' },
      category: 'risk',
      action: 'membership.credit-review.approve',
      result: 'unknown',
      reason: '审核通过请求已提交，等待信用分同步回执',
      before: { creditScore: 680, reviewStatus: 'pending' },
      after: { creditScore: 680, reviewStatus: 'pending' },
      related: { businessId: 'CR-user_1004-pending', auditReceiptId: 'MEM-review-pending' }
    },
    {
      id: 'UAUD-SEED-030',
      occurredAt: '2026-07-27T20:05:00.000Z',
      targetUser: { uid: 'user_1005', name: 'user_liu', email: 'liu@example.com' },
      source: 'admin',
      operator: { id: 'risk_admin', name: '风控管理员' },
      category: 'risk',
      action: 'risk.control.apply',
      result: 'partial',
      reason: '用户点控提交后，交易模块生效，理财模块因已有规则待人工处理',
      before: { delivery: 'none', perpetual: 'none', spot: 'none', aiQuant: 'lowYield' },
      after: { delivery: 'loss', perpetual: 'loss', spot: 'loss', aiQuant: 'lowYield', pendingModules: ['liquidity', 'portfolio'] },
      related: { businessId: 'CTRL-APPLY-user_1005-partial' }
    },
    {
      id: 'UAUD-SEED-029',
      occurredAt: '2026-07-27T19:50:00.000Z',
      targetUser: { uid: 'user_1006', name: 'new_user_wang', email: 'newwang@example.com' },
      source: 'admin',
      operator: { id: 'risk_admin', name: '风控管理员' },
      category: 'risk',
      action: 'risk.control.apply',
      result: 'failed',
      reason: '用户点控表单不完整，规则未写入',
      before: { activeModules: [] },
      after: { activeModules: [] },
      related: { businessId: 'CTRL-APPLY-user_1006-failed' }
    },
    {
      id: 'UAUD-SEED-028',
      occurredAt: '2026-07-27T19:35:00.000Z',
      targetUser: { uid: 'user_1003', name: 'agent_li', email: 'li@agent.com' },
      source: 'system',
      operator: { id: 'user-control-settlement', name: '点控结算执行' },
      category: 'risk',
      action: 'risk.control.consume',
      result: 'failed',
      reason: '订单已撤销，单次点控未消费',
      before: { module: 'delivery', ruleStatus: 'active', orderStatus: 'cancelled' },
      after: { module: 'delivery', ruleStatus: 'active', orderStatus: 'cancelled' },
      related: { businessId: 'DELIVERY-ORDER-user_1003-cancelled' }
    },
    {
      id: 'UAUD-SEED-027',
      occurredAt: '2026-07-27T19:25:00.000Z',
      targetUser: { uid: 'user_1001', name: 'agent_wang', email: 'wang@agent.com' },
      source: 'admin',
      operator: { id: 'risk_admin', name: '风控管理员' },
      category: 'risk',
      action: 'risk.control.cancel',
      result: 'unknown',
      reason: '取消点控请求已提交，等待各模块回执',
      before: { delivery: 'loss', perpetual: 'loss', spot: 'loss' },
      after: { delivery: 'loss', perpetual: 'loss', spot: 'loss' },
      related: { businessId: 'CTRL-CANCEL-user_1001-pending' }
    },
    {
      id: 'UAUD-SEED-026',
      occurredAt: '2026-07-27T19:20:00.000Z',
      targetUser: { uid: 'user_1008', name: 'banned_user', email: 'banned@example.com' },
      source: 'admin',
      operator: { id: 'risk_admin', name: '风控管理员' },
      category: 'status',
      action: 'status.account.unfreeze',
      result: 'failed',
      reason: '用户仍存在封禁状态，不能直接解封为正常账户',
      before: { status: 'banned', loginAllowed: false, tradingAllowed: false },
      after: { status: 'banned', loginAllowed: false, tradingAllowed: false },
      related: { businessId: 'ACCOUNT-UNLOCK-user_1008-failed' }
    },
    {
      id: 'UAUD-SEED-025',
      occurredAt: '2026-07-27T19:10:00.000Z',
      targetUser: { uid: 'user_1006', name: 'new_user_wang', email: 'newwang@example.com' },
      source: 'admin',
      operator: { id: 'risk_admin', name: '风控管理员' },
      category: 'status',
      action: 'status.account.unfreeze',
      result: 'success',
      reason: '补充资料复核符合，恢复用户登录及账户操作',
      before: { status: 'suspended', loginAllowed: false, tradingAllowed: false },
      after: { status: 'active', loginAllowed: true, tradingAllowed: true },
      related: { businessId: 'ACCOUNT-UNLOCK-user_1006-001' }
    },
    {
      id: 'UAUD-SEED-024',
      occurredAt: '2026-07-27T18:35:00.000Z',
      targetUser: { uid: 'user_1008', name: 'banned_user', email: 'banned@example.com' },
      source: 'admin',
      operator: { id: 'risk_admin', name: '风控管理员' },
      category: 'status',
      action: 'status.account.ban',
      result: 'success',
      reason: '人工复核确认严重违规，执行封禁',
      before: { status: 'active', loginAllowed: true, tradingAllowed: true },
      after: { status: 'banned', loginAllowed: false, tradingAllowed: false },
      related: { businessId: 'ACCOUNT-BAN-user_1008-001' }
    },
    {
      id: 'UAUD-SEED-023',
      occurredAt: '2026-07-27T18:10:00.000Z',
      targetUser: { uid: 'user_1004', name: 'user_chen', email: 'chen@example.com' },
      source: 'admin',
      operator: { id: 'cs_admin', name: '客服主管' },
      category: 'funds',
      action: 'funds.deposit.manual-credit',
      result: 'success',
      reason: '客服入金审核通过，人工入账',
      before: { marketBalance: 56000, cumulativeRecharge: 165000 },
      after: { marketBalance: 61000, cumulativeRecharge: 170000 },
      related: { businessId: 'DEP-user_1004-manual-002', auditReceiptId: 'DEPOSIT-REVIEW-1004-002' }
    },
    {
      id: 'UAUD-SEED-022',
      occurredAt: '2026-07-27T17:55:00.000Z',
      targetUser: { uid: 'user_1002', name: 'vip_zhang', email: 'zhang@vip.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'funds',
      action: 'funds.transfer.internal',
      result: 'success',
      reason: '按用户工单要求将资金从理财账户划转到合约账户',
      before: { wealth: 120000, perp: 80000, totalBalance: 350000 },
      after: { wealth: 110000, perp: 90000, totalBalance: 350000 },
      related: { businessId: 'TRANSFER-user_1002-001', requestId: 'REQ-TRANSFER-1002' }
    },
    {
      id: 'UAUD-SEED-021',
      occurredAt: '2026-07-27T17:40:00.000Z',
      targetUser: { uid: 'user_1001', name: 'agent_wang', email: 'wang@agent.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'risk',
      action: 'risk.control.cancel',
      result: 'success',
      reason: '复核符合，取消当前用户点控',
      before: { delivery: 'loss', perpetual: 'loss', spot: 'loss', aiQuant: 'lowYield', liquidity: 'lowYield', portfolio: 'lowYield' },
      after: { delivery: 'cancelled', perpetual: 'cancelled', spot: 'cancelled', aiQuant: 'cancelled', liquidity: 'cancelled', portfolio: 'cancelled' },
      related: { businessId: 'CTRL-CANCEL-user_1001-001' }
    },
    {
      id: 'UAUD-SEED-020',
      occurredAt: '2026-07-27T16:55:00.000Z',
      targetUser: { uid: 'user_1003', name: 'agent_li', email: 'li@agent.com' },
      source: 'system',
      operator: { id: 'user-control-settlement', name: '点控结算执行' },
      category: 'risk',
      action: 'risk.control.consume',
      result: 'success',
      reason: '单次点控在订单结算时执行完成',
      before: { module: 'perpetual', ruleStatus: 'active', expected: 'profit' },
      after: { module: 'perpetual', ruleStatus: 'consumed', actual: 'profit' },
      related: { businessId: 'PERP-ORDER-user_1003-0007' }
    },
    {
      id: 'UAUD-SEED-019',
      occurredAt: '2026-07-27T16:10:00.000Z',
      targetUser: { uid: 'user_1004', name: 'user_chen', email: 'chen@example.com' },
      source: 'admin',
      operator: { id: 'risk_admin', name: '风控管理员' },
      category: 'risk',
      action: 'risk.control.apply',
      result: 'success',
      reason: '复核符合，用户点控设置交易三模块控亏',
      before: { activeModules: [] },
      after: { delivery: 'loss', perpetual: 'loss', spot: 'loss', duration: 'once' },
      related: { businessId: 'CTRL-APPLY-user_1004-001' }
    },
    {
      id: 'UAUD-SEED-018',
      occurredAt: '2026-07-27T15:25:00.000Z',
      targetUser: { uid: 'user_1007', name: 'suspended_user', email: 'suspended@example.com' },
      source: 'admin',
      operator: { id: 'risk_admin', name: '风控管理员' },
      category: 'status',
      action: 'status.account.freeze',
      result: 'success',
      reason: '风控复核后暂停账户操作',
      before: { status: 'active', loginAllowed: true, tradingAllowed: true },
      after: { status: 'suspended', loginAllowed: false, tradingAllowed: false },
      related: { businessId: 'ACCOUNT-LOCK-user_1007-001' }
    },
    {
      id: 'UAUD-SEED-017',
      occurredAt: '2026-07-27T14:40:00.000Z',
      targetUser: { uid: 'user_1004', name: 'user_chen', email: 'chen@example.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'funds',
      action: 'funds.flow-limit.remove',
      result: 'success',
      reason: '用户完成补充流水，解除出金限制',
      before: { status: 'active', requiredTurnover: 20000, completedTurnover: 20000, flowScope: 'contract' },
      after: { status: 'none', requiredTurnover: 0, completedTurnover: 0, flowScope: 'all' },
      related: { businessId: 'FLOW-LIMIT-user_1004-remove' }
    },
    {
      id: 'UAUD-SEED-016',
      occurredAt: '2026-07-27T13:55:00.000Z',
      targetUser: { uid: 'user_1005', name: 'user_liu', email: 'liu@example.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'funds',
      action: 'funds.flow-limit.set',
      result: 'success',
      reason: '人工入金后设置出金流水限制',
      before: { status: 'none', requiredTurnover: 0 },
      after: { status: 'active', requiredTurnover: 18000, completedTurnover: 2500, flowScope: 'all' },
      related: { businessId: 'FLOW-LIMIT-user_1005-set' }
    },
    {
      id: 'UAUD-SEED-015',
      occurredAt: '2026-07-27T13:10:00.000Z',
      targetUser: { uid: 'user_1004', name: 'user_chen', email: 'chen@example.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'funds',
      action: 'funds.rebate.grant',
      result: 'success',
      reason: '活动返利人工补发',
      before: { balance: 56000 },
      after: { balance: 56200 },
      related: { businessId: 'REB-user_1004-001' }
    },
    {
      id: 'UAUD-SEED-014',
      occurredAt: '2026-07-27T12:25:00.000Z',
      targetUser: { uid: 'user_1002', name: 'vip_zhang', email: 'zhang@vip.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'risk',
      action: 'membership.credit-review.reject',
      result: 'success',
      reason: '信用分扣减申请证据不足，审核拒绝',
      before: { creditScore: 750, reviewStatus: 'pending' },
      after: { creditScore: 750, reviewStatus: 'rejected' },
      related: { businessId: 'CR-user_1002-002' }
    },
    {
      id: 'UAUD-SEED-013',
      occurredAt: '2026-07-27T11:40:00.000Z',
      targetUser: { uid: 'user_1004', name: 'user_chen', email: 'chen@example.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'risk',
      action: 'membership.credit-review.approve',
      result: 'success',
      reason: '信用分恢复材料完整，审核通过',
      before: { creditScore: 680, reviewStatus: 'pending' },
      after: { creditScore: 695, reviewStatus: 'approved' },
      related: { businessId: 'CR-user_1004-001' }
    },
    {
      id: 'UAUD-SEED-012',
      occurredAt: '2026-07-27T10:55:00.000Z',
      targetUser: { uid: 'user_1004', name: 'user_chen', email: 'chen@example.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'membership',
      action: 'membership.credit.adjust',
      result: 'success',
      reason: '风险复核完成，恢复信用分',
      before: { creditScore: 680 },
      after: { creditScore: 692 },
      related: { businessId: 'MEM-credit-adjust-user_1004' }
    },
    {
      id: 'UAUD-SEED-011',
      occurredAt: '2026-07-27T10:10:00.000Z',
      targetUser: { uid: 'user_1003', name: 'agent_li', email: 'li@agent.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'membership',
      action: 'membership.vip.set',
      result: 'success',
      reason: '累计充值复核通过，手动调整会员等级',
      before: { vipLevel: 0, isVip: false },
      after: { vipLevel: 2, isVip: true },
      related: { businessId: 'VIP-ADJ-user_1003' }
    },
    {
      id: 'UAUD-SEED-010',
      occurredAt: '2026-07-27T09:25:00.000Z',
      targetUser: { uid: 'user_1002', name: 'vip_zhang', email: 'zhang@vip.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'funds',
      action: 'funds.deduct',
      result: 'success',
      reason: '人工纠错，扣减误发余额',
      before: { balance: 350000, frozenBalance: 50000 },
      after: { balance: 349500, frozenBalance: 50000 },
      related: { businessId: 'UF-deduct-user_1002-001' }
    },
    {
      id: 'UAUD-SEED-009',
      occurredAt: '2026-07-27T08:40:00.000Z',
      targetUser: { uid: 'user_1001', name: 'agent_wang', email: 'wang@agent.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'funds',
      action: 'funds.unfreeze',
      result: 'success',
      reason: '出金排查完成，解冻人工冻结资金',
      before: { balance: 499000, frozenBalance: 1000, adminFrozenAmount: 1000 },
      after: { balance: 500000, frozenBalance: 0, adminFrozenAmount: 0 },
      related: { businessId: 'UF-unfreeze-user_1001-001' }
    },
    {
      id: 'UAUD-SEED-008',
      occurredAt: '2026-07-26T18:35:00.000Z',
      targetUser: { uid: 'user_1001', name: 'agent_wang', email: 'wang@agent.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'funds',
      action: 'funds.freeze',
      result: 'success',
      reason: '异常出金复核，临时冻结可用余额',
      before: { balance: 500000, frozenBalance: 0, adminFrozenAmount: 0 },
      after: { balance: 499000, frozenBalance: 1000, adminFrozenAmount: 1000 },
      related: { businessId: 'UF-freeze-user_1001-001' }
    },
    {
      id: 'UAUD-SEED-007',
      occurredAt: '2026-07-26T16:20:00.000Z',
      targetUser: { uid: 'user_1003', name: 'agent_li', email: 'li@agent.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'permission',
      action: 'permission.agent-role.update',
      result: 'success',
      reason: '取消代理身份并承接直属裂变下级',
      before: { role: 'agent', directChildren: ['user_1004', 'user_1006', 'user_1008'] },
      after: { role: 'user', successorParentId: 'user_1009', directChildren: [] },
      related: { businessId: 'REL-agent-role-user_1003' }
    },
    {
      id: 'UAUD-SEED-006',
      occurredAt: '2026-07-26T14:05:00.000Z',
      targetUser: { uid: 'user_1004', name: 'user_chen', email: 'chen@example.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'permission',
      action: 'relationship.parent.reset',
      result: 'success',
      reason: '组织调整，重设裂变上级',
      before: { parentId: 'user_1003', parentUsername: 'agent_li' },
      after: { parentId: 'user_1009', parentUsername: 'agent_zhao' },
      related: { businessId: 'REL-parent-reset-user_1004' }
    },
    {
      id: 'UAUD-SEED-005',
      occurredAt: '2026-07-26T11:30:00.000Z',
      targetUser: { uid: 'user_1001', name: 'alice', email: 'old@example.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'profile',
      action: 'profile.update',
      result: 'success',
      reason: '用户提交邮箱修正材料',
      before: { email: 'old@example.com' },
      after: { email: 'alice@example.com' },
      related: { requestId: 'REQ-PROFILE-1001' }
    },
    {
      id: 'UAUD-SEED-004',
      occurredAt: '2026-07-25T17:10:00.000Z',
      targetUser: { uid: 'user_1005', name: 'user_liu', email: 'liu@example.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'funds',
      action: 'funds.flow-limit.set',
      result: 'failed',
      reason: '要求流水小于已完成流水，未写入',
      before: { status: 'none', completedTurnover: 8000 },
      after: { status: 'none', completedTurnover: 8000 },
      related: { businessId: 'FLOW-LIMIT-user_1005-failed' }
    },
    {
      id: 'UAUD-SEED-003',
      occurredAt: '2026-07-25T15:25:00.000Z',
      targetUser: { uid: 'user_1002', name: 'vip_zhang', email: 'zhang@vip.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'funds',
      action: 'funds.freeze',
      result: 'failed',
      reason: '冻结金额超过可用余额，未写入',
      before: { balance: 350000, frozenBalance: 50000 },
      after: { balance: 350000, frozenBalance: 50000 },
      related: { businessId: 'UF-freeze-user_1002-failed' }
    },
    {
      id: 'UAUD-SEED-002',
      occurredAt: '2026-07-24T10:20:00.000Z',
      targetUser: { uid: 'user_1006', name: 'new_user_wang', email: 'newwang@example.com' },
      source: 'admin',
      operator: { id: 'risk_admin', name: '风控管理员' },
      category: 'status',
      action: 'status.account.freeze',
      result: 'unknown',
      reason: '封户请求已提交，等待最终状态回执',
      before: { status: 'active' },
      after: { status: 'active' },
      related: { businessId: 'ACCOUNT-LOCK-user_1006-pending' }
    },
    {
      id: 'UAUD-SEED-001',
      occurredAt: '2026-07-24T09:10:00.000Z',
      targetUser: { uid: 'user_1008', name: 'banned_user', email: 'banned@example.com' },
      source: 'admin',
      operator: { id: 'risk_admin', name: '风控管理员' },
      category: 'status',
      action: 'status.account.ban',
      result: 'success',
      reason: '人工复核后封户',
      before: { status: 'active' },
      after: { status: 'banned' },
      related: { businessId: 'ACCOUNT-LOCK-user_1008-001' }
    }
  ]
  seedRows.forEach((row) => appendUserAuditLog(row))
}

seedAuditLogs()

export const resetUserAuditLogsForTests = ({ seed = false } = {}) => {
  mutableAuditLogs.splice(0)
  sequence = 0
  if (seed) seedAuditLogs()
}

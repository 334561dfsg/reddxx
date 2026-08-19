export const USER_AUDIT_CATEGORIES = Object.freeze([
  { value: 'profile', label: '用户资料' },
  { value: 'permission', label: '权限关系' },
  { value: 'funds', label: '资金' },
  { value: 'membership', label: '等级会员' },
  { value: 'status', label: '账户状态' },
  { value: 'risk', label: '风控结果' }
])

export const USER_AUDIT_SOURCES = Object.freeze([
  { value: 'admin', label: '后台操作' },
  { value: 'user', label: '用户触发' },
  { value: 'system', label: '系统任务' }
])

export const USER_AUDIT_RESULTS = Object.freeze([
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'partial', label: '部分成功' },
  { value: 'unknown', label: '结果未知' }
])

export const USER_AUDIT_ACTIONS = Object.freeze([
  { value: 'profile.update', label: '编辑用户资料', category: 'profile' },
  { value: 'relationship.parent.reset', label: '重置裂变上级', category: 'permission' },
  { value: 'relationship.agent-parent.set', label: '设置所属代理', category: 'permission' },
  { value: 'permission.agent-role.update', label: '调整代理身份', category: 'permission' },
  { value: 'funds.deposit.manual-credit', label: '客服入金', category: 'funds' },
  { value: 'funds.transfer.internal', label: '账户间划转', category: 'funds' },
  { value: 'funds.freeze', label: '冻结资金', category: 'funds' },
  { value: 'funds.unfreeze', label: '解冻资金', category: 'funds' },
  { value: 'funds.deduct', label: '扣减资金', category: 'funds' },
  { value: 'funds.flow-limit.set', label: '设置出金流水限制', category: 'funds' },
  { value: 'funds.flow-limit.remove', label: '解除出金流水限制', category: 'funds' },
  { value: 'membership.vip.set', label: '调整 VIP 等级', category: 'membership' },
  { value: 'membership.credit.adjust', label: '调整信用分', category: 'membership' },
  { value: 'membership.credit-review.approve', label: '通过信用分审核', category: 'risk' },
  { value: 'membership.credit-review.reject', label: '拒绝信用分审核', category: 'risk' },
  { value: 'funds.rebate.grant', label: '发放返利', category: 'funds' },
  { value: 'status.account.freeze', label: '冻结账户', category: 'status' },
  { value: 'status.account.ban', label: '封禁账户', category: 'status' },
  { value: 'status.account.unfreeze', label: '解封账户', category: 'status' },
  { value: 'risk.control.apply', label: '设置用户点控', category: 'risk' },
  { value: 'risk.control.cancel', label: '取消用户点控', category: 'risk' },
  { value: 'risk.control.consume', label: '执行用户点控结果', category: 'risk' }
])

export const userAuditOptionLabel = (options, value) => (
  options.find((item) => item.value === value)?.label || String(value || '-')
)

export const userAuditActionLabel = (value) => userAuditOptionLabel(USER_AUDIT_ACTIONS, value)

export const userAuditCategoryLabel = (value) => userAuditOptionLabel(USER_AUDIT_CATEGORIES, value)

export const userAuditResultLabel = (value) => userAuditOptionLabel(USER_AUDIT_RESULTS, value)

export const userAuditSourceLabel = (value) => userAuditOptionLabel(USER_AUDIT_SOURCES, value)

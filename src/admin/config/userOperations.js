export const USER_OPERATION_QUICK_IDS = Object.freeze([
  'detail',
  'assets',
  'deposit',
  'freeze-account',
  'all'
])

export const USER_OPERATION_GROUPS = Object.freeze([
  { id: 'relationship', label: '用户与关系' },
  { id: 'funds', label: '资金与钱包' },
  { id: 'membership', label: '信用与会员' },
  { id: 'risk', label: '风控与控制' }
])

export const USER_OPERATION_ENTRIES = Object.freeze([
  { id: 'edit-profile', title: '编辑资料', description: '维护用户基础资料与账户信息', group: 'relationship', status: 'available', risk: 'normal', handler: 'edit-profile' },
  { id: 'direct-referrals', title: '查看直属下级', description: '查看用户直接邀请的下级成员', group: 'relationship', status: 'available', risk: 'normal', handler: 'direct-referrals' },
  { id: 'all-referrals', title: '查看全部下级', description: '查看用户团队内的全部层级成员', group: 'relationship', status: 'available', risk: 'normal', handler: 'all-referrals' },
  { id: 'reset-parent', title: '重设上级', description: '调整用户所属的上级关系', group: 'relationship', status: 'available', risk: 'sensitive', handler: 'reset-parent' },
  { id: 'reset-agent', title: '设置／重设代理', description: '设置或调整用户代理身份', group: 'relationship', status: 'available', risk: 'sensitive', handler: 'reset-agent' },
  { id: 'team-report', title: '查看团队报表', description: '查看该用户团队的业务汇总', group: 'relationship', status: 'available', risk: 'normal', handler: 'team-report' },

  { id: 'assets', title: '资金概况', description: '查看各账户资产、余额与冻结金额', group: 'funds', status: 'available', risk: 'normal', handler: 'detail' },
  { id: 'onchain-wallet', title: '链上钱包', description: '查看用户链上钱包与地址信息', group: 'funds', status: 'planned', risk: 'normal', handler: 'planned' },
  { id: 'deposit', title: '客服入金', description: '由客服为当前用户发起人工入金', group: 'funds', status: 'available', risk: 'sensitive', handler: 'deposit' },
  { id: 'transfer', title: '账户间划转', description: '在用户内部账户之间移动资产，总资产不变', group: 'funds', status: 'available', risk: 'sensitive', handler: 'transfer' },
  { id: 'freeze-funds', title: '冻结全部资金', description: '冻结用户全部账户内的可用资金', group: 'funds', status: 'available', risk: 'danger', handler: 'freeze-funds' },
  { id: 'unfreeze-funds', title: '解冻后台冻结', description: '仅解除由后台资金冻结操作产生的冻结金额', group: 'funds', status: 'available', risk: 'danger', handler: 'unfreeze-funds' },
  { id: 'deduct-funds', title: '划扣可用资金', description: '永久减少用户可用资产并生成划扣记录', group: 'funds', status: 'available', risk: 'danger', handler: 'deduct-funds' },
  { id: 'withdraw-flow-limit', title: '出金流水限制', description: '管理用户出金所需流水条件', group: 'funds', status: 'available', risk: 'sensitive', handler: 'withdraw-flow-limit' },

  { id: 'credit-review', title: '信用分审核', description: '审核用户信用分人工调整申请', group: 'membership', status: 'available', risk: 'sensitive', handler: 'credit-review' },
  { id: 'credit-adjust', title: '修改信用分', description: '人工调整用户当前信用分', group: 'membership', status: 'available', risk: 'danger', handler: 'credit-adjust' },
  { id: 'vip-level', title: '编辑会员等级', description: '调整用户会员等级', group: 'membership', status: 'available', risk: 'sensitive', handler: 'vip-level' },
  { id: 'vip-deposit-total', title: '会员累计充值', description: '查看会员等级累计充值 USDT', group: 'membership', status: 'available', risk: 'normal', handler: 'vip-deposit-total' },
  { id: 'rebate-reward', title: '添加返利奖励', description: '为用户发放人工返利奖励', group: 'membership', status: 'available', risk: 'danger', handler: 'rebate-reward' },

  { id: 'freeze-account', title: '封户', description: '限制用户登录及账户操作', group: 'risk', status: 'available', risk: 'danger', handler: 'freeze' },
  { id: 'point-control', title: '统一点控', description: '设置用户各业务模块的统一控制', group: 'risk', status: 'available', risk: 'sensitive', handler: 'point-control' },
  { id: 'cancel-point-control', title: '取消点控', description: '取消用户当前生效的统一控制', group: 'risk', status: 'available', risk: 'danger', handler: 'cancel-point-control' },
  { id: 'point-control-log', title: '点控日志', description: '查看用户点控操作与执行记录', group: 'risk', status: 'available', risk: 'normal', handler: 'point-control-log' }
])

const LOCKED_STATUSES = new Set(['suspended', 'banned'])

const resolveEntry = (entry, user) => {
  if (entry.id !== 'freeze-account') return { ...entry }
  const unlock = LOCKED_STATUSES.has(user?.status)
  return {
    ...entry,
    title: unlock ? '解封' : '封户',
    description: unlock ? '恢复用户登录及账户操作' : entry.description
  }
}

export const getUserOperationEntry = (id, user) => {
  const entry = USER_OPERATION_ENTRIES.find((item) => item.id === id)
  return entry ? resolveEntry(entry, user) : null
}

export const getUserOperationGroups = (user) => USER_OPERATION_GROUPS.map((group) => ({
  ...group,
  entries: USER_OPERATION_ENTRIES
    .filter((entry) => entry.group === group.id)
    .map((entry) => resolveEntry(entry, user))
}))

export const resolveUserOperationReturnFocus = (preferred, fallback) => (
  preferred && preferred.isConnected !== false && typeof preferred.focus === 'function'
    ? preferred
    : fallback || null
)

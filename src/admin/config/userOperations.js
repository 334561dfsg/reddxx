export const USER_OPERATION_QUICK_IDS = Object.freeze([
  'detail',
  'assets',
  'deposit',
  'freeze-account',
  'all'
])

export const USER_OPERATION_GROUPS = Object.freeze([
  { id: 'profile', label: '用户资料' },
  { id: 'fission', label: '裂变关系' },
  { id: 'agent', label: '代理管理' },
  { id: 'funds', label: '资金与钱包' },
  { id: 'membership', label: '信用与会员' },
  { id: 'risk', label: '风控与控制' }
])

export const USER_OPERATION_ENTRIES = Object.freeze([
  { id: 'edit-profile', title: '编辑资料', description: '维护用户基础资料与账户信息', group: 'profile', status: 'available', risk: 'normal', handler: 'edit-profile' },
  { id: 'direct-referrals', title: '查看直属裂变下级', description: '查看用户直接邀请的裂变下级成员', group: 'fission', status: 'available', risk: 'normal', handler: 'direct-referrals' },
  { id: 'all-referrals', title: '查看全部裂变下级', description: '查看用户裂变团队内的全部层级成员', group: 'fission', status: 'available', risk: 'normal', handler: 'all-referrals' },
  { id: 'reset-parent', title: '重设裂变上级', description: '调整用户所属的裂变上级关系', group: 'fission', status: 'available', risk: 'sensitive', handler: 'reset-parent' },
  { id: 'team-report', title: '查看裂变团队报表', description: '查看该用户裂变团队的业务汇总', group: 'fission', status: 'available', risk: 'normal', handler: 'team-report' },
  { id: 'reset-agent', title: '设置为代理', description: '设置用户代理身份', group: 'agent', status: 'available', risk: 'sensitive', handler: 'reset-agent' },
  { id: 'agent-subordinates', title: '查看下级用户', description: '查看归属于该代理的直属客户', group: 'agent', status: 'available', risk: 'normal', handler: 'agent-subordinates' },
  { id: 'agent-report', title: '查看代理报表', description: '查看该代理的业务与佣金汇总', group: 'agent', status: 'available', risk: 'normal', handler: 'agent-report' },

  { id: 'assets', title: '资金概况', description: '查看各账户资产、余额与冻结金额', group: 'funds', status: 'available', risk: 'normal', handler: 'detail' },
  { id: 'onchain-wallet', title: '链上钱包', description: '查看用户链上钱包与地址信息', group: 'funds', status: 'available', risk: 'normal', handler: 'onchain-wallet' },
  { id: 'deposit', title: '客服入金', description: '由客服为当前用户发起人工入金', group: 'funds', status: 'available', risk: 'sensitive', handler: 'deposit' },
  { id: 'transfer', title: '账户间划转', description: '在用户内部账户之间移动资产，总资产不变', group: 'funds', status: 'available', risk: 'sensitive', handler: 'transfer' },
  { id: 'freeze-funds', title: '冻结资金', description: '冻结用户全部可用资金', group: 'funds', status: 'available', risk: 'danger', handler: 'freeze-funds' },
  { id: 'unfreeze-funds', title: '解冻资金', description: '解冻管理员人工冻结资金', group: 'funds', status: 'available', risk: 'danger', handler: 'unfreeze-funds' },
  { id: 'deduct-funds', title: '扣减资金', description: '永久扣减用户可用资金', group: 'funds', status: 'available', risk: 'danger', handler: 'deduct-funds' },
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
const AGENT_ONLY_ENTRY_IDS = new Set(['agent-subordinates', 'agent-report'])
const isAgentUser = (user) => (
  user?.role !== undefined ? user.role === 'agent' : user?.isAgent === true
)

const resolveEntry = (entry, user) => {
  if (entry.id === 'freeze-account') {
    const unlock = LOCKED_STATUSES.has(user?.status)
    return {
      ...entry,
      title: unlock ? '解封' : '封户',
      description: unlock ? '恢复用户登录及账户操作' : entry.description
    }
  }
  if (entry.id === 'reset-agent' && isAgentUser(user)) {
    return {
      ...entry,
      title: '取消代理身份',
      description: '取消用户代理身份并处理其裂变下级关系'
    }
  }
  return { ...entry }
}

export const getUserOperationEntry = (id, user) => {
  const entry = USER_OPERATION_ENTRIES.find((item) => item.id === id)
  return entry ? resolveEntry(entry, user) : null
}

export const getUserOperationGroups = (user) => USER_OPERATION_GROUPS.map((group) => ({
  ...group,
  entries: USER_OPERATION_ENTRIES
    .filter((entry) => entry.group === group.id && (
      !AGENT_ONLY_ENTRY_IDS.has(entry.id) || isAgentUser(user)
    ))
    .map((entry) => resolveEntry(entry, user))
}))

export const resolveUserOperationReturnFocus = (preferred, fallback) => (
  preferred && preferred.isConnected !== false && typeof preferred.focus === 'function'
    ? preferred
    : fallback || null
)

/** 代理系统侧栏导航（/agent-system） */
export const AGENT_SYSTEM_NAV = [
  { key: 'dashboard', label: '概览', to: '/agent-system/dashboard', desc: '业绩与待办' },
  { key: 'data', label: '数据查询', to: '/agent-system/data-query', desc: '业绩检索' },
  { key: 'dailyReport', label: '数据日报', to: '/agent-system/daily-report', desc: '按日统计' },
  { key: 'verification', label: '认证审核', to: '/agent-system/verification-audit', desc: 'KYC 待办' },
  { key: 'team', label: '团队管理', to: '/agent-system/team', desc: '直邀成员' },
  { key: 'commissionRates', label: '记佣比例', to: '/agent-system/commission-rates', desc: '各产品线一级比例' },
  { key: 'commission', label: '佣金结算', to: '/agent-system/commission', desc: '账期、进度与入账' },
  { key: 'settings', label: '账户设置', to: '/agent-system/settings', desc: '安全与资料' }
]

const SALESPERSON_NAV_KEYS = new Set(['dashboard', 'data', 'dailyReport', 'verification', 'settings'])

export function getAgentSystemNav(role) {
  if (role === 'agent') return AGENT_SYSTEM_NAV
  if (role === 'salesperson') return AGENT_SYSTEM_NAV.filter(item => SALESPERSON_NAV_KEYS.has(item.key))
  return []
}

export function canAccessAgentSystemPath(role, path) {
  const pathname = String(path).split(/[?#]/)[0].replace(/\/+$/, '')
  return getAgentSystemNav(role).some(item => item.to === pathname)
}

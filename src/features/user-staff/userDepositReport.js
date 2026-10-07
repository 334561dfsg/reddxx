const DAY_MS = 86400000
const text = value => String(value ?? '').trim()
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value

export const depositUserTypeOptions = [
  { value: 'user', label: '客户' },
  { value: 'salesperson', label: '业务员' },
  { value: 'agent', label: '代理' }
]
export const depositUserTypeLabel = value => depositUserTypeOptions.find(option => option.value === value)?.label || '未知类型'
// Current account identity, independent of the depositor's agent/salesperson ownership.
function depositUserType(user) {
  if (user?.role === 'agent') return 'agent'
  if (user?.isSalesperson) return 'salesperson'
  return user?.role === 'user' ? 'user' : 'unknown'
}

export const depositReportStatus = value => ({ review: '待确认', credited: '审核成功', rejected: '已驳回' }[value] || value || '未知')
export function userReportTime(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  return new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(0, 19).replace('T', ' ')
}
export function defaultUserReportFilters(now = new Date()) {
  const end = new Date(new Date(now).getTime() + 8 * 3600000)
  return { startDate: new Date(end.getTime() - 29 * DAY_MS).toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), agentId: '', employeeId: '', keyword: '', userType: '' }
}
export function buildUserDepositReport(users, orders, input, now = new Date()) {
  const filters = Object.fromEntries(['startDate', 'endDate', 'agentId', 'employeeId', 'keyword', 'userType'].map(key => [key, text(input[key])]))
  if (!validDate(filters.startDate) || !validDate(filters.endDate) || filters.startDate > filters.endDate) throw new Error('请选择有效日期，开始日期不能晚于结束日期')
  if (filters.userType && !depositUserTypeOptions.some(option => option.value === filters.userType)) throw new Error('用户类型不可用，请重新选择')
  const userById = new Map(users.map(user => [user.id, user]))
  const agent = userById.get(filters.agentId)
  const employee = userById.get(filters.employeeId)
  if (filters.agentId && filters.agentId !== 'unassigned' && agent?.role !== 'agent') throw new Error('所选代理不可用，请重新选择')
  if (filters.employeeId && filters.employeeId !== 'unassigned' && !employee?.isSalesperson) throw new Error('所选业务员不可用，请重新选择')
  if (employee && filters.agentId && (employee.agentParentId || 'unassigned') !== filters.agentId) throw new Error('所选业务员不属于当前代理，请更改代理或业务员')
  const keyword = filters.keyword.toLocaleLowerCase()
  const matchesOwner = (value, filter) => !filter || (value || 'unassigned') === filter
  const rows = orders.filter(order => {
    if (order.status !== 'credited') return false
    const user = userById.get(order.userId)
    const date = userReportTime(order.submitTime).slice(0, 10)
    return validDate(date) && date >= filters.startDate && date <= filters.endDate
      && (!filters.userType || depositUserType(user) === filters.userType)
      && matchesOwner(user?.agentParentId, filters.agentId)
      && matchesOwner(user?.employeeId, filters.employeeId)
      && (!keyword || [order.userId, user?.username || order.username].some(value => text(value).toLocaleLowerCase().includes(keyword)))
  }).sort((a, b) => Date.parse(b.submitTime) - Date.parse(a.submitTime) || a.id.localeCompare(b.id))
    .map(order => {
      const user = userById.get(order.userId)
      return {
        orderId: order.id, userId: order.userId, userType: depositUserType(user), nickname: user?.username || order.username || '未知用户',
        agentId: user?.agentParentId || '', agentEmail: userById.get(user?.agentParentId)?.email || '',
        employeeId: user?.employeeId || '', employeeEmail: userById.get(user?.employeeId)?.email || '',
        submitTime: order.submitTime, creditedTime: order.creditedTime || '',
        coin: order.coin, amount: order.amount, usdtValue: order.usdtValue ?? null, status: order.status
      }
    })
  const typeTotals = [...depositUserTypeOptions, { value: 'unknown', label: '未知类型' }].map(option => {
    const matchingRows = rows.filter(row => row.userType === option.value)
    let totalUsdt = 0
    let missingCount = 0
    for (const row of matchingRows) {
      const value = row.usdtValue
      if (value == null || String(value).trim() === '' || !Number.isFinite(Number(value))) missingCount++
      else totalUsdt += Number(value)
    }
    return {
      userType: option.value, label: option.label, count: matchingRows.length, missingCount,
      totalUsdt: matchingRows.length > 0 && missingCount === matchingRows.length ? null : totalUsdt
    }
  }).filter(item => item.userType !== 'unknown' || item.count > 0)
  return {
    filters, rows, typeTotals, generatedAt: new Date(now).toISOString(), timezone: 'UTC+8',
    userTypeLabel: filters.userType ? depositUserTypeLabel(filters.userType) : '全部类型',
    agentLabel: filters.agentId === 'unassigned' ? '未分配代理' : agent ? `${agent.username} · ${agent.id}` : '全部代理',
    employeeLabel: filters.employeeId === 'unassigned' ? '未分配业务员' : employee ? `${employee.username} · ${employee.id}` : '全部业务员'
  }
}

export function userDepositCsv(report) {
  const quote = value => {
    let content = String(value ?? '')
    if (typeof value !== 'number' && /^[\s\u0000-\u001f]*[=+@-]/.test(content)) content = `'${content}`
    return `"${content.replaceAll('"', '""')}"`
  }
  const data = [
    ['用户充值报表（演示数据）'],
    ['充值提交日期（含首尾）', report.filters.startDate, report.filters.endDate, report.timezone],
    ['用户类型', report.userTypeLabel || '全部类型'],
    ['代理', report.agentLabel, '业务员', report.employeeLabel, '用户关键词', report.filters.keyword || '不限'],
    ['范围', `全部 ${report.rows.length} 笔充值`, '生成时间（UTC+8）', userReportTime(report.generatedAt)],
    ['口径', '每笔充值一行；按提交时间查询；用户类型为当前账号身份；代理/业务员为用户当前归属；仅包含审核成功的充值；折合金额取自订单'],
    ['充值单号', '充值时间（UTC+8）', '用户 ID', '用户类型', '用户昵称', '代理 ID', '代理邮箱', '业务员 ID', '业务员邮箱', '币种', '充值金额', '折合 USDT', '充值状态', '入账时间（UTC+8）'],
    ...report.rows.map(row => [row.orderId, userReportTime(row.submitTime), row.userId, depositUserTypeLabel(row.userType), row.nickname,
      row.agentId || '未分配', row.agentEmail || '—', row.employeeId || '未分配', row.employeeEmail || '—',
      row.coin, row.amount, row.usdtValue ?? '—', depositReportStatus(row.status), userReportTime(row.creditedTime)])
  ]
  return '\ufeff' + data.map(row => row.map(quote).join(',')).join('\r\n')
}

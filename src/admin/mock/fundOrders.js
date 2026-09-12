import { usersList } from './user.js'
import { publicDepositAddressMock } from './publicDepositAddress.js'

export const FUND_ORDER_FILTER_ALL = 'all'

export const WITHDRAW_AUDIT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

export const DEPOSIT_ORDER_STATUS = {
  REVIEW: 'review',
  CREDITED: 'credited',
  REJECTED: 'rejected'
}

export const CHAIN_DEPOSIT_EVENT_STATUS = {
  UNCONFIRMED: 'unconfirmed',
  LINKED: 'linked',
  IGNORED: 'ignored'
}

export const withdrawStatusOptions = [
  { value: WITHDRAW_AUDIT_STATUS.PENDING, label: '待审核', badgeClass: 'bg-amber-100 text-amber-700' },
  { value: WITHDRAW_AUDIT_STATUS.APPROVED, label: '已通过', badgeClass: 'bg-blue-100 text-blue-700' },
  { value: WITHDRAW_AUDIT_STATUS.REJECTED, label: '已拒绝', badgeClass: 'bg-rose-100 text-rose-700' }
]

export const depositStatusOptions = [
  { value: DEPOSIT_ORDER_STATUS.REVIEW, label: '待确认', badgeClass: 'bg-amber-100 text-amber-700' },
  { value: DEPOSIT_ORDER_STATUS.CREDITED, label: '已入账', badgeClass: 'bg-emerald-100 text-emerald-700' },
  { value: DEPOSIT_ORDER_STATUS.REJECTED, label: '已驳回', badgeClass: 'bg-rose-100 text-rose-700' }
]

const coins = ['USDT', 'BTC', 'ETH', 'USDC', 'TRX']
const networks = ['TRC20', 'ERC20', 'Bitcoin', 'Ethereum', 'BSC']
const rejectReasons = ['地址与用户常用地址不一致', '凭证金额与填写金额不一致', '链上确认数不足', '风控命中大额复核']

const pickUser = (index) => usersList[index % usersList.length]

const isoDaysAgo = (days, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000).toISOString()

const makeAddress = (prefix, index) => `${prefix}${String(index).padStart(4, '0')}a9fbc3d7428e51c20d9f${index}`
const makeHash = (prefix, index) => `${prefix}${String(index).padStart(2, '0')}9c8b7a6d5e4f3210fedcba9876543210${index}`

const clone = (value) => JSON.parse(JSON.stringify(value))

const createWithdrawOrder = (index, overrides = {}) => {
  const user = pickUser(index + 2)
  const coin = coins[index % coins.length]
  const amount = [820, 1250, 4800, 9800, 23500, 56000][index % 6] + index * 17
  const fee = coin === 'BTC' ? 0.00012 : coin === 'ETH' ? 0.0032 : 2
  return {
    id: `wd_${String(index + 1).padStart(5, '0')}`,
    userId: user.id,
    username: user.username,
    email: user.email,
    vipLevel: user.vipLevel || 0,
    kycStatus: user.kycStatus,
    coin,
    network: networks[index % networks.length],
    amount,
    fee,
    usdtValue: coin === 'BTC' ? amount * 98000 : coin === 'ETH' ? amount * 3200 : amount,
    address: makeAddress(coin === 'BTC' ? 'bc1q' : 'T', index + 11),
    txHash: '',
    status: WITHDRAW_AUDIT_STATUS.PENDING,
    riskLevel: amount >= 50000 ? 'high' : amount >= 10000 ? 'medium' : 'low',
    riskTags: amount >= 50000 ? ['大额出金', '需复核'] : amount >= 10000 ? ['超过日常均值'] : ['常规申请'],
    applyTime: isoDaysAgo(index % 7, index + 1),
    auditTime: null,
    auditor: null,
    auditNote: '',
    ...overrides
  }
}

const createDepositOrder = (index, overrides = {}) => {
  const user = pickUser(index + 5)
  const coin = coins[(index + 1) % coins.length]
  const amount = [300, 880, 1500, 5200, 12600, 48000][index % 6] + index * 23
  const network = networks[(index + 1) % networks.length]
  return {
    id: `dp_${String(index + 1).padStart(5, '0')}`,
    userId: user.id,
    username: user.username,
    email: user.email,
    coin,
    network,
    amount,
    usdtValue: coin === 'BTC' ? amount * 98000 : coin === 'ETH' ? amount * 3200 : amount,
    toAddress: makeAddress('platform_', index + 71),
    requiredConfirmations: coin === 'BTC' ? 3 : 12,
    linkedChainEventId: null,
    linkedChainEvent: null,
    txHash: '',
    fromAddress: '',
    confirmations: 0,
    voucherName: 'deposit-voucher-sample.svg',
    voucherUrl: '/deposit-voucher-sample.svg',
    status: DEPOSIT_ORDER_STATUS.REVIEW,
    submitTime: isoDaysAgo(index % 6, index + 2),
    creditedTime: null,
    operator: null,
    auditNote: '',
    source: '前台凭证提交',
    ...overrides
  }
}

const createChainDepositEvent = (index, overrides = {}) => {
  const order = depositOrders[index % depositOrders.length]
  const coin = overrides.coin || order?.coin || coins[index % coins.length]
  const network = overrides.network || order?.network || networks[index % networks.length]
  const amount = Number(overrides.amount ?? order?.amount ?? (500 + index * 37))
  return {
    id: `chain_dp_${String(index + 1).padStart(5, '0')}`,
    chain: network,
    network,
    txHash: makeHash('0xchain', index + 1),
    fromAddress: makeAddress(coin === 'BTC' ? 'bc1q' : '0x', index + 131),
    toAddress: overrides.toAddress || order?.toAddress || makeAddress('platform_', index + 171),
    coin,
    amount,
    usdtValue: coin === 'BTC' ? amount * 98000 : coin === 'ETH' ? amount * 3200 : amount,
    confirmations: Number(overrides.confirmations ?? ((index % 8) + 1)),
    requiredConfirmations: coin === 'BTC' ? 3 : 12,
    blockTime: isoDaysAgo(index % 5, index + 3),
    listenTime: isoDaysAgo(index % 5, index + 2),
    status: CHAIN_DEPOSIT_EVENT_STATUS.UNCONFIRMED,
    linkedOrderId: null,
    ...overrides
  }
}

let withdrawOrders = Array.from({ length: 18 }, (_, i) => createWithdrawOrder(i, {
  status:
    i === 2 ? WITHDRAW_AUDIT_STATUS.APPROVED :
    i === 8 ? WITHDRAW_AUDIT_STATUS.REJECTED :
    WITHDRAW_AUDIT_STATUS.PENDING,
  auditTime: i === 2 || i === 8 ? isoDaysAgo(1, i) : null,
  auditor: i === 2 || i === 8 ? 'admin_01' : null,
  auditNote: i === 8 ? rejectReasons[0] : ''
}))

// Snapshot the seed address so later public-address edits never rewrite this order.
const demoOrderAddress = publicDepositAddressMock.find(row => row.enabled && row.coin === 'BTC' && row.network === 'Bitcoin')
let depositOrders = Array.from({ length: 20 }, (_, i) => createDepositOrder(i, {
  ...(i === 0 ? { network: demoOrderAddress.network, toAddress: demoOrderAddress.address } : {}),
  status:
    i === 1 || i === 7 ? DEPOSIT_ORDER_STATUS.CREDITED :
    i === 4 ? DEPOSIT_ORDER_STATUS.REJECTED :
    DEPOSIT_ORDER_STATUS.REVIEW,
  creditedTime: i === 1 || i === 7 ? isoDaysAgo(1, i) : null,
  operator: i === 1 || i === 7 || i === 4 ? 'admin_02' : null,
  auditNote: i === 4 ? rejectReasons[1] : ''
}))

let chainDepositEvents = Array.from({ length: 26 }, (_, i) => createChainDepositEvent(i, {
  amount: i % 4 === 0 && depositOrders[i] ? depositOrders[i].amount + 1.8 : undefined,
  confirmations: i % 3 === 0 ? 12 : undefined
}))

;[1, 7].forEach((orderIndex, idx) => {
  const order = depositOrders[orderIndex]
  const event = chainDepositEvents[idx]
  if (!order || !event) return
  event.coin = order.coin
  event.network = order.network
  event.chain = order.network
  event.amount = order.amount
  event.usdtValue = order.usdtValue
  event.toAddress = order.toAddress
  event.confirmations = order.requiredConfirmations
  event.requiredConfirmations = order.requiredConfirmations
  event.status = CHAIN_DEPOSIT_EVENT_STATUS.LINKED
  event.linkedOrderId = order.id
  order.linkedChainEventId = event.id
  order.linkedChainEvent = clone(event)
  order.txHash = event.txHash
  order.fromAddress = event.fromAddress
  order.confirmations = event.confirmations
})

function applyFilters(list, { status = FUND_ORDER_FILTER_ALL, coin = FUND_ORDER_FILTER_ALL, keyword = '' } = {}) {
  const kw = String(keyword || '').trim().toLowerCase()
  return list.filter((order) => {
    const statusOk = status === FUND_ORDER_FILTER_ALL || order.status === status
    const coinOk = coin === FUND_ORDER_FILTER_ALL || order.coin === coin
    const text = `${order.id} ${order.userId} ${order.username} ${order.email} ${order.coin} ${order.network} ${order.txHash || ''} ${order.address || ''} ${order.fromAddress || ''} ${order.toAddress || ''}`.toLowerCase()
    return statusOk && coinOk && (!kw || text.includes(kw))
  })
}

function paginate(list, page, pageSize) {
  const start = (Math.max(1, page) - 1) * pageSize
  return list.slice(start, start + pageSize)
}

function aggregate(list, statusOptions) {
  const byStatus = Object.fromEntries(statusOptions.map((s) => [s.value, 0]))
  let totalUsdt = 0
  list.forEach((order) => {
    byStatus[order.status] = (byStatus[order.status] || 0) + 1
    totalUsdt += Number(order.usdtValue || 0)
  })
  return { total: list.length, totalUsdt, byStatus }
}

export const fundOrderApi = {
  listWithdrawOrders(params = {}) {
    const filtered = applyFilters(withdrawOrders, params)
    return Promise.resolve({
      success: true,
      data: {
        list: clone(paginate(filtered, params.page || 1, params.pageSize || 10)),
        total: filtered.length,
        aggregates: aggregate(filtered, withdrawStatusOptions)
      }
    })
  },
  listDepositOrders(params = {}) {
    const filtered = applyFilters(depositOrders, params)
    return Promise.resolve({
      success: true,
      data: {
        list: clone(paginate(filtered, params.page || 1, params.pageSize || 10)),
        total: filtered.length,
        aggregates: aggregate(filtered, depositStatusOptions)
      }
    })
  },
  listUnconfirmedChainDepositEvents(orderId, keyword = '') {
    const order = depositOrders.find((item) => item.id === orderId)
    if (!order) return Promise.resolve({ success: false, message: '入金申请不存在' })
    const kw = String(keyword || '').trim().toLowerCase()
    const list = chainDepositEvents.filter((event) => {
      if (event.status !== CHAIN_DEPOSIT_EVENT_STATUS.UNCONFIRMED) return false
      if (event.coin !== order.coin || event.network !== order.network || event.toAddress !== order.toAddress) return false
      const hay = `${event.id} ${event.txHash} ${event.fromAddress} ${event.toAddress} ${event.amount} ${event.coin} ${event.network}`.toLowerCase()
      return !kw || hay.includes(kw)
    })
    return Promise.resolve({ success: true, data: clone(list) })
  },
  updateWithdrawOrder(id, action, note = '') {
    const order = withdrawOrders.find((item) => item.id === id)
    if (!order) return Promise.resolve({ success: false, message: '出金单不存在' })
    if (action === 'approve' && order.status === WITHDRAW_AUDIT_STATUS.PENDING) {
      order.status = WITHDRAW_AUDIT_STATUS.APPROVED
      order.auditTime = new Date().toISOString()
      order.auditor = 'admin_current'
      order.auditNote = note || '审核通过，等待出款'
      return Promise.resolve({ success: true, message: '出金审核已通过' })
    }
    if (action === 'reject' && order.status === WITHDRAW_AUDIT_STATUS.PENDING) {
      order.status = WITHDRAW_AUDIT_STATUS.REJECTED
      order.auditTime = new Date().toISOString()
      order.auditor = 'admin_current'
      order.auditNote = note || '审核拒绝'
      return Promise.resolve({ success: true, message: '出金申请已拒绝' })
    }
    return Promise.resolve({ success: false, message: '当前状态不支持该操作' })
  },
  updateDepositOrder(id, action, note = '', chainEventId = '', manualConfirmation = null) {
    const order = depositOrders.find((item) => item.id === id)
    if (!order) return Promise.resolve({ success: false, message: '入金单不存在' })
    if (action === 'credit' && order.status === DEPOSIT_ORDER_STATUS.REVIEW) {
      if (manualConfirmation && typeof manualConfirmation === 'object') {
        const txHash = String(manualConfirmation.txHash || '').trim()
        const fromAddress = String(manualConfirmation.fromAddress || '').trim()
        const amount = Number(manualConfirmation.amount)
        if (!txHash) return Promise.resolve({ success: false, message: '请输入 TxHash' })
        if (!fromAddress) return Promise.resolve({ success: false, message: '请输入付款地址' })
        if (!Number.isFinite(amount) || amount <= 0) {
          return Promise.resolve({ success: false, message: '实际到账金额必须大于 0' })
        }
        const normalizedTxHash = txHash.toLowerCase()
        const txHashUsed = chainDepositEvents.some(
          (item) => String(item.txHash || '').trim().toLowerCase() === normalizedTxHash
        ) || depositOrders.some(
          (item) => item.id !== order.id && String(item.txHash || '').trim().toLowerCase() === normalizedTxHash
        )
        if (txHashUsed) return Promise.resolve({ success: false, message: '该 TxHash 已被使用' })

        const now = new Date().toISOString()
        const event = {
          id: `manual_dp_${Date.now()}`,
          chain: order.network,
          network: order.network,
          txHash,
          fromAddress,
          toAddress: order.toAddress,
          coin: order.coin,
          amount,
          usdtValue: order.amount > 0 ? amount * (order.usdtValue / order.amount) : amount,
          confirmations: order.requiredConfirmations,
          requiredConfirmations: order.requiredConfirmations,
          blockTime: now,
          listenTime: now,
          status: CHAIN_DEPOSIT_EVENT_STATUS.LINKED,
          linkedOrderId: order.id,
          source: 'manual'
        }
        chainDepositEvents.push(event)
        order.status = DEPOSIT_ORDER_STATUS.CREDITED
        order.creditedTime = now
        order.operator = 'admin_current'
        order.auditNote = note || '人工录入链上交易信息，确认入账'
        order.linkedChainEventId = event.id
        order.txHash = event.txHash
        order.fromAddress = event.fromAddress
        order.confirmations = event.confirmations
        order.linkedChainEvent = clone(event)
        return Promise.resolve({ success: true, message: '入金审核已人工确认入账' })
      }

      const event = chainDepositEvents.find((item) => item.id === chainEventId)
      if (!event) return Promise.resolve({ success: false, message: '请先选择一条未确认链上通知记录' })
      if (event.status !== CHAIN_DEPOSIT_EVENT_STATUS.UNCONFIRMED) return Promise.resolve({ success: false, message: '该链上通知记录已被处理' })
      if (event.coin !== order.coin || event.network !== order.network || event.toAddress !== order.toAddress) {
        return Promise.resolve({ success: false, message: '所选链上通知记录与入金申请不匹配' })
      }
      order.status = DEPOSIT_ORDER_STATUS.CREDITED
      order.creditedTime = new Date().toISOString()
      order.operator = 'admin_current'
      order.auditNote = note || '凭证与链上通知记录一致，确认入账'
      order.linkedChainEventId = event.id
      order.txHash = event.txHash
      order.fromAddress = event.fromAddress
      order.confirmations = event.confirmations
      event.status = CHAIN_DEPOSIT_EVENT_STATUS.LINKED
      event.linkedOrderId = order.id
      order.linkedChainEvent = clone(event)
      return Promise.resolve({ success: true, message: '入金审核已确认入账' })
    }
    if (action === 'reject' && order.status === DEPOSIT_ORDER_STATUS.REVIEW) {
      order.status = DEPOSIT_ORDER_STATUS.REJECTED
      order.operator = 'admin_current'
      order.auditNote = note || '入金审核已驳回'
      return Promise.resolve({ success: true, message: '入金审核已驳回' })
    }
    return Promise.resolve({ success: false, message: '当前状态不支持该操作' })
  }
}

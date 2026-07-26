const PRODUCT_LINE_DEFS = [
  { key: 'deposit', label: '充值' },
  { key: 'perpetual', label: '永续合约' },
  { key: 'delivery', label: '交割合约' },
  { key: 'spot', label: '现货' },
  { key: 'aiQuant', label: 'AI 量化' },
  { key: 'portfolio', label: '投资组合' },
  { key: 'lending', label: '理财产品' },
  { key: 'borrowing', label: '借贷产品' }
]

const REPORT_DATES = Array.from({ length: 28 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 6, 25 - index))
  return date.toISOString().slice(0, 10)
})

const PRODUCT_WEIGHTS = {
  deposit: 5,
  perpetual: 30,
  delivery: 18,
  spot: 20,
  aiQuant: 8,
  portfolio: 7,
  lending: 7,
  borrowing: 5
}

const clone = (value) => JSON.parse(JSON.stringify(value))

const requireUserId = (userId) => {
  const normalized = String(userId ?? '').trim()
  if (!normalized) throw new Error('用户 ID 必填')
  return normalized
}

const hashUserId = (userId) => {
  let hash = 2166136261
  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const allocate = (total, definitions) => {
  let assigned = 0
  return definitions.map((definition, index) => {
    const value = index === definitions.length - 1
      ? total - assigned
      : Math.floor(total * PRODUCT_WEIGHTS[definition.key] / 100)
    assigned += value
    return value
  })
}

const buildDailyRows = (seed) => REPORT_DATES.map((date, index) => {
  const volume = 85000 + ((seed + index * 7919) % 115000)
  const orderCount = 28 + ((seed >>> (index % 16)) % 73)
  const commissionCents = 450000 + ((seed + index * 3571) % 650000)
  return {
    date,
    volume,
    activeClients: 18 + ((seed + index * 13) % 64),
    newClients: (seed + index * 5) % 9,
    orderCount,
    commission: commissionCents / 100
  }
})

const buildProductLines = (dailyRows) => {
  const totals = PRODUCT_LINE_DEFS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    volume: 0,
    commissionCents: 0,
    orderCount: 0
  }))

  for (const row of dailyRows) {
    const volumeParts = allocate(row.volume, PRODUCT_LINE_DEFS)
    const commissionParts = allocate(Math.round(row.commission * 100), PRODUCT_LINE_DEFS)
    const orderParts = allocate(row.orderCount, PRODUCT_LINE_DEFS)
    totals.forEach((total, index) => {
      total.volume += volumeParts[index]
      total.commissionCents += commissionParts[index]
      total.orderCount += orderParts[index]
    })
  }

  return totals.map(({ commissionCents, ...line }) => ({
    ...line,
    commission: commissionCents / 100
  }))
}

export const getUserAgentReport = (userId) => {
  const normalizedUserId = requireUserId(userId)
  const seed = hashUserId(normalizedUserId)
  const dailyRows = buildDailyRows(seed)
  const productLines = buildProductLines(dailyRows)
  const activeClientCount = Math.max(...dailyRows.map((row) => row.activeClients))
  const report = {
    userId: normalizedUserId,
    summary: {
      directClientCount: activeClientCount + 12 + (seed % 24),
      activeClientCount,
      totalVolume: productLines.reduce((total, line) => total + line.volume, 0),
      totalCommission: productLines.reduce((total, line) => total + line.commission, 0)
    },
    productLines,
    dailyRows
  }
  return clone(report)
}

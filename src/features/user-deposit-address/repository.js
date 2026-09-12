// This is the console's in-memory demo repository. Production must validate required fields,
// authorization and request identity on the server in the same transaction as the write.
export const DEPOSIT_NETWORKS_BY_COIN = Object.freeze({
  USDT: Object.freeze(['TRC20', 'ERC20', 'BSC']),
  USDC: Object.freeze(['ERC20', 'BSC']),
  BTC: Object.freeze(['Bitcoin']), ETH: Object.freeze(['Ethereum']),
  TRX: Object.freeze(['TRC20']), BNB: Object.freeze(['BSC'])
})
const clone = value => JSON.parse(JSON.stringify(value))
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}
const keyOf = (userId, coin, network) => JSON.stringify([userId, coin, network])

export function validateDepositEntry(entry, restore = false) {
  if (!DEPOSIT_NETWORKS_BY_COIN[entry.coin]?.includes(entry.network)) return '请选择该币种支持的网络'
  if (restore) return ''
  const address = String(entry.address || '').trim()
  if (!address) return '请填写收款地址'
  return ''
}

export function createUserDepositAddressRepository({ initialRows = [], userExists = () => true, resolvePublic = () => null, appendAudit = () => {} } = {}) {
  const rows = new Map(initialRows.map(row => [keyOf(String(row.userId), row.coin, row.network), clone(row)]))
  const versions = new Map()
  const previews = new Map()
  const receipts = new Map()
  let sequence = 0
  const list = userId => clone([...rows.values()].filter(row => row.userId === String(userId)))
  const resolve = (userId, coin, network) => {
    const own = rows.get(keyOf(String(userId), coin, network))
    if (own) {
      if (own.enabled === false || validateDepositEntry(own)) throw new Error('用户专属收款地址已失效，请重新配置')
      return { ...clone(own), source: 'dedicated' }
    }
    const fallback = resolvePublic(coin, network)
    return fallback ? { ...clone(fallback), source: 'public' } : null
  }
  function preview({ userIds, entries, mode = 'fill', onlyTargets = null }) {
    if (!['fill', 'overwrite', 'restore'].includes(mode)) throw new Error('操作模式无效')
    const ids = [...new Set((userIds || []).map(String))]
    if (!ids.length) throw new Error('请先选择用户')
    if (!entries?.length) throw new Error('请至少添加一条地址配置')
    const clean = entries.map((entry, index) => {
      const error = validateDepositEntry(entry, mode === 'restore')
      if (error) throw new Error(`第 ${index + 1} 项：${error}`)
      return { coin: entry.coin, network: entry.network, ...(mode === 'restore' ? {} : { address: entry.address.trim() }) }
    })
    if (new Set(clean.map(e => keyOf('', e.coin, e.network))).size !== clean.length) throw new Error('同一币种和网络不能重复')
    const items = []
    for (const userId of ids) for (const entry of clean) {
      const key = keyOf(userId, entry.coin, entry.network)
      if (onlyTargets && !onlyTargets.includes(key)) continue
      const before = rows.get(key) || null
      const publicAddress = mode === 'restore' ? resolvePublic(entry.coin, entry.network) : null
      let action = !before ? 'create' : mode === 'fill' || (before.address === entry.address && before.enabled !== false) ? 'skip' : 'overwrite'
      if (mode === 'restore') action = before ? 'restore' : 'skip'
      let error = userExists(userId) ? '' : '用户不存在或已不可操作'
      if (mode === 'restore' && before && !publicAddress) error = '该币种和网络没有可用公共地址，请先配置'
      if (error) action = 'failed'
      items.push({ key, userId, ...entry, before: clone(before), action, error,
        publicAddress: clone(publicAddress), version: versions.get(key) || 0 })
    }
    const counts = { create: 0, overwrite: 0, restore: 0, skip: 0, failed: 0 }
    items.forEach(item => counts[item.action]++)
    const result = freeze({ requestId: `UDA-${Date.now()}-${++sequence}`, scope: 'explicit-user-ids', userIds: ids, entries: clean, mode, items, counts })
    previews.set(result.requestId, result)
    return result
  }
  function execute(candidate) {
    const plan = previews.get(candidate?.requestId)
    if (!plan || JSON.stringify(candidate) !== JSON.stringify(plan)) throw new Error('预览已失效，请重新预览')
    if (receipts.has(plan.requestId)) return receipts.get(plan.requestId)
    const items = plan.items.map(item => {
      const current = rows.get(item.key) || null
      if (!userExists(item.userId)) return { ...item, status: 'failed', error: '用户不存在或已不可操作' }
      if ((versions.get(item.key) || 0) !== item.version || JSON.stringify(current) !== JSON.stringify(item.before)) {
        return { ...item, status: 'conflict', error: '配置在预览后发生变化，请重新预览' }
      }
      if (item.action === 'failed') return { ...item, status: 'failed' }
      if (item.action === 'skip') return { ...item, status: 'skipped' }
      if (plan.mode === 'restore' && JSON.stringify(resolvePublic(item.coin, item.network)) !== JSON.stringify(item.publicAddress)) {
        return { ...item, status: 'conflict', error: '公共地址在预览后发生变化，请重新预览' }
      }
      const after = plan.mode === 'restore' ? null : { userId: item.userId, coin: item.coin, network: item.network, address: item.address, enabled: true }
      try {
        // Audit failure must not leave an unlogged configuration change.
        const audit = appendAudit({ userId: item.userId, before: clone(current), after: clone(after), requestId: plan.requestId, action: item.action })
        if (after) rows.set(item.key, after)
        else rows.delete(item.key)
        versions.set(item.key, item.version + 1)
        return { ...item, after, status: 'success', auditId: audit?.id || '' }
      } catch (error) {
        return { ...item, status: 'failed', error: error?.message || '保存失败，请重试' }
      }
    })
    const counts = { success: 0, failed: 0, skipped: 0, conflict: 0 }
    items.forEach(item => counts[item.status]++)
    const receipt = freeze({ requestId: plan.requestId, userIds: plan.userIds, mode: plan.mode, completedAt: new Date().toISOString(), items, counts })
    receipts.set(plan.requestId, receipt)
    return receipt
  }
  function retryPreview(requestId) {
    const receipt = receipts.get(requestId)
    const plan = previews.get(requestId)
    if (!receipt || !plan) throw new Error('找不到批量结果')
    const failed = receipt.items.filter(item => ['failed', 'conflict'].includes(item.status))
    if (!failed.length) throw new Error('没有需要重试的项目')
    return preview({ userIds: failed.map(item => item.userId), entries: plan.entries, mode: plan.mode, onlyTargets: failed.map(item => item.key) })
  }
  function transaction(work) {
    const backups = [rows, versions, previews, receipts].map(map => new Map(map))
    const previousSequence = sequence
    try { return work() }
    catch (error) {
      ;[rows, versions, previews, receipts].forEach((map, index) => {
        map.clear(); backups[index].forEach((value, key) => map.set(key, value))
      })
      sequence = previousSequence
      throw error
    }
  }
  return { list, resolve, preview, execute, retryPreview, transaction }
}

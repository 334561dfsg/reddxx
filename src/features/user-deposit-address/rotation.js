import { validateDepositEntry } from './repository.js'
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

// Verification is injected: this domain never treats opening the MFA dialog as authorization.
export function createDepositAddressRotation({ publicRepo, userRepo, userExists, verify, auditTransaction = work => work() }) {
  const sessions = new WeakSet()
  const plans = new WeakSet()
  const cancelled = new WeakSet()
  const pending = new Map()
  const completed = new WeakMap()
  function open(userId) {
    const id = String(userId)
    if (!userExists(id)) throw new Error('用户不存在，无法修改入金地址')
    const session = freeze({ userId: id, addresses: publicRepo.list().filter(row => row.enabled), dedicated: userRepo.list(id) })
    sessions.add(session)
    return session
  }
  function prepare(session, entries) {
    if (!sessions.has(session)) throw new Error('配置会话失效，请重新打开')
    if (entries.length !== session.addresses.length || new Set(entries.map(row => row.id)).size !== entries.length) throw new Error('地址列表已变化，请重新打开')
    const changes = []
    for (const entry of entries) {
      const before = session.addresses.find(row => row.id === entry.id)
      if (!before) throw new Error('公共地址已变化，请重新打开')
      const address = String(entry.address || '').trim()
      if (address === before.address) continue
      const error = validateDepositEntry({ ...before, address })
      if (error) throw new Error(`${before.coin} / ${before.network}：${error}`)
      const oldError = validateDepositEntry(before)
      if (oldError) throw new Error(`${before.coin} / ${before.network} 原公共地址无效，请先修正公共配置`)
      changes.push({ before, address })
    }
    if (!changes.length) throw new Error('尚未修改任何地址')
    const plan = freeze({ session, changes })
    plans.add(plan)
    return plan
  }
  function assertCurrent(plan) {
    if (cancelled.has(plan)) throw new Error('操作已取消，请重新确认')
    if (!userExists(plan.session.userId)) throw new Error('用户不存在，未修改地址')
    for (const { before } of plan.changes) {
      if (!same(publicRepo.resolve(before.coin, before.network), before)) throw new Error('公共地址已发生变化，请取消验证并重新打开')
      const own = list => list.find(row => row.coin === before.coin && row.network === before.network) || null
      if (!same(own(userRepo.list(plan.session.userId)), own(plan.session.dedicated))) throw new Error('用户专属地址已发生变化，请重新打开')
    }
  }
  function confirm(plan, code) {
    if (!plans.has(plan)) return Promise.reject(new Error('请先确认地址变更'))
    if (completed.has(plan)) return Promise.resolve(completed.get(plan))
    if (pending.has(plan)) return pending.get(plan)
    const task = (async () => {
      assertCurrent(plan)
      await verify(code)
      assertCurrent(plan)
      const result = auditTransaction(() => publicRepo.transaction(() => userRepo.transaction(() => {
        const pinned = userRepo.execute(userRepo.preview({
          userIds: [plan.session.userId], mode: 'overwrite', entries: plan.changes.map(change => change.before)
        }))
        if (pinned.counts.failed || pinned.counts.conflict) throw new Error('保留用户原地址失败，本次变更未保存')
        const updatedAt = new Date().toISOString()
        const addresses = plan.changes.map(({ before, address }) => {
          const updated = publicRepo.save({ ...before, address, operator: 'admin_current', updatedAt })
          return { coin: before.coin, network: before.network, userAddress: before.address, publicAddress: updated.address }
        })
        return freeze({ userId: plan.session.userId, requestId: pinned.requestId, addresses })
      })))
      completed.set(plan, result)
      return result
    })()
    pending.set(plan, task)
    task.then(() => pending.delete(plan), () => pending.delete(plan))
    return task
  }
  return { open, prepare, confirm, cancel: plan => { if (plan) cancelled.add(plan) } }
}

const STATUSES = ['active', 'suspended', 'banned']

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

export const getUserAgentSubordinates = (userId) => {
  const normalizedUserId = requireUserId(userId)
  const seed = hashUserId(normalizedUserId)
  const rows = Array.from({ length: 28 }, (_, index) => ({
    id: `${normalizedUserId}-subordinate-${index + 1}`,
    uid: String(8000000 + ((seed + index * 7919) % 1999999)),
    username: `client_${String((seed + index * 37) % 10000).padStart(4, '0')}`,
    registeredAt: new Date(Date.UTC(2025, index % 12, 1 + ((seed + index) % 27))).toISOString().slice(0, 10),
    status: STATUSES[(seed + index * 5) % STATUSES.length],
    totalVolume: 25000 + ((seed + index * 104729) % 975000),
    commissionContribution: (35000 + ((seed + index * 3571) % 465000)) / 100
  }))
  return clone(rows)
}

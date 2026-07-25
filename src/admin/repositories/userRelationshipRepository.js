import { usersList } from '../mock/user.js'
import { USER_ROLE, USER_STATUS } from '../constants/user.js'

const relationshipAuditLog = []
const idOf = (user) => String(user?.id ?? user?.userId ?? '')
const normalized = (value) => String(value ?? '').trim()
const normalizedLower = (value) => normalized(value).toLowerCase()
const numberOf = (value) => Number(value || 0)

const requireUser = (id) => {
  const user = getUserById(id)
  if (!user) throw new Error('用户不存在')
  return user
}

const requireReason = (reason) => {
  const value = normalized(reason)
  if (!value) throw new Error('变更原因必填')
  if (value.length > 200) throw new Error('变更原因不能超过 200 字')
  return value
}

const cloneAuditValue = (value) => JSON.parse(JSON.stringify(value))

const appendAudit = ({ type, userId, before, after, reason, affectedUserIds }) => {
  relationshipAuditLog.push({
    id: `relationship-${Date.now()}-${relationshipAuditLog.length + 1}`,
    type,
    userId,
    before: cloneAuditValue(before),
    after: cloneAuditValue(after),
    reason,
    affectedUserIds: [...affectedUserIds],
    createdAt: new Date().toISOString()
  })
}

export const getUserById = (id) => {
  const targetId = String(id ?? '')
  return usersList.find((user) => idOf(user) === targetId) || null
}

export const getDirectReferrals = (id) => {
  const targetId = String(id ?? '')
  return usersList.filter((user) => String(user.parentId ?? '') === targetId)
}

export const getDescendants = (rootId) => {
  const root = getUserById(rootId)
  if (!root) return []

  const result = []
  const visited = new Set([idOf(root)])
  const queue = [{ user: root, depth: 0, path: [root] }]

  while (queue.length) {
    const current = queue.shift()
    for (const child of getDirectReferrals(idOf(current.user))) {
      const childId = idOf(child)
      if (!childId || visited.has(childId)) continue
      visited.add(childId)
      const path = [...current.path, child]
      const item = { ...child, depth: current.depth + 1, path }
      result.push(item)
      queue.push({ user: child, depth: item.depth, path })
    }
  }

  return result
}

export const getParentCandidates = (userId) => {
  const user = requireUser(userId)
  const excludedIds = new Set([
    idOf(user),
    String(user.parentId ?? ''),
    ...getDescendants(userId).map((row) => idOf(row))
  ])
  return usersList.filter((candidate) => (
    !excludedIds.has(idOf(candidate)) && candidate.status !== USER_STATUS.BANNED
  ))
}

export const validateProfile = (input, userId) => {
  const errors = {}
  const username = normalized(input?.username)
  const email = normalized(input?.email)
  const phone = normalized(input?.phone)
  const remark = normalized(input?.remark)
  const otherUsers = usersList.filter((user) => idOf(user) !== String(userId ?? ''))

  if (!username) errors.username = '用户名必填'
  else if (otherUsers.some((user) => normalizedLower(user.username) === username.toLowerCase())) {
    errors.username = '用户名已存在'
  }

  if (!email) errors.email = '邮箱必填'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = '邮箱格式不正确'
  else if (otherUsers.some((user) => normalizedLower(user.email) === email.toLowerCase())) {
    errors.email = '邮箱已存在'
  }

  if (phone && !/^[+()\d\s-]{7,30}$/.test(phone)) errors.phone = '手机号格式不正确'
  else if (phone && otherUsers.some((user) => normalized(user.phone) === phone)) errors.phone = '手机号已存在'

  if (remark.length > 200) errors.remark = '备注不能超过 200 字'
  return errors
}

export const updateProfile = (userId, patch) => {
  const user = requireUser(userId)
  const errors = validateProfile(patch, userId)
  if (Object.keys(errors).length) {
    const error = new Error(Object.values(errors)[0])
    error.fields = errors
    throw error
  }

  const before = {
    username: user.username,
    email: user.email,
    phone: user.phone,
    remark: user.remark
  }
  const after = {
    username: normalized(patch.username),
    email: normalized(patch.email),
    phone: normalized(patch.phone),
    remark: normalized(patch.remark)
  }
  Object.assign(user, after)
  appendAudit({
    type: 'profile',
    userId: idOf(user),
    before,
    after,
    reason: '编辑用户资料',
    affectedUserIds: [idOf(user)]
  })
  return user
}

export const resetParent = ({ userId, parentId = null, reason }) => {
  const user = requireUser(userId)
  const nextParentId = parentId ? String(parentId) : null
  const cleanReason = requireReason(reason)

  if (nextParentId === idOf(user)) throw new Error('不能选择用户本人作为上级')
  if (nextParentId && getDescendants(userId).some((row) => idOf(row) === nextParentId)) {
    throw new Error('不能选择自己的下级作为上级')
  }

  const parent = nextParentId ? requireUser(nextParentId) : null
  if (parent?.status === USER_STATUS.BANNED) throw new Error('不能选择已封禁用户作为上级')
  if (String(user.parentId ?? '') === String(nextParentId ?? '')) throw new Error('新上级不能与当前上级相同')

  const before = { parentId: user.parentId ?? null, parentUsername: user.parentUsername ?? null }
  const after = { parentId: nextParentId, parentUsername: parent?.username ?? null }
  Object.assign(user, after)
  appendAudit({
    type: 'parent-reset',
    userId: idOf(user),
    before,
    after,
    reason: cleanReason,
    affectedUserIds: [idOf(user)]
  })
  return user
}

export const updateAgentRole = ({ userId, role, reason, successorParentId }) => {
  const user = requireUser(userId)
  const cleanReason = requireReason(reason)
  if (![USER_ROLE.USER, USER_ROLE.AGENT].includes(role)) throw new Error('目标身份不正确')
  if (user.role === role) throw new Error('目标身份与当前身份相同')

  const directChildren = getDirectReferrals(userId)
  let successor = null
  if (role === USER_ROLE.USER && directChildren.length) {
    if (successorParentId === undefined) throw new Error('存在直属下级时必须选择承接上级')
    if (successorParentId) {
      const successorId = String(successorParentId)
      if (successorId === idOf(user)) throw new Error('不能选择用户本人作为承接上级')
      if (getDescendants(userId).some((row) => idOf(row) === successorId)) {
        throw new Error('不能选择自己的下级作为承接上级')
      }
      successor = requireUser(successorId)
      if (successor.status === USER_STATUS.BANNED) throw new Error('不能选择已封禁用户作为承接上级')
    }
  }

  const affectedUserIds = [idOf(user), ...directChildren.map((child) => idOf(child))]
  const before = {
    role: user.role,
    children: directChildren.map((child) => ({
      id: idOf(child),
      parentId: child.parentId ?? null,
      parentUsername: child.parentUsername ?? null
    }))
  }
  const after = {
    role,
    children: role === USER_ROLE.USER
      ? directChildren.map((child) => ({
          id: idOf(child),
          parentId: successor ? idOf(successor) : null,
          parentUsername: successor?.username ?? null
        }))
      : before.children
  }

  user.role = role
  if (role === USER_ROLE.USER) {
    for (const child of directChildren) {
      child.parentId = successor ? idOf(successor) : null
      child.parentUsername = successor?.username ?? null
    }
  }
  appendAudit({ type: 'agent-role', userId: idOf(user), before, after, reason: cleanReason, affectedUserIds })
  return user
}

const summarizeMembers = (members) => ({
  memberCount: members.length,
  agentCount: members.filter((row) => row.role === USER_ROLE.AGENT).length,
  activeCount: members.filter((row) => row.status === USER_STATUS.ACTIVE).length,
  availableBalance: members.reduce((sum, row) => sum + numberOf(row.balance), 0),
  frozenBalance: members.reduce((sum, row) => sum + numberOf(row.frozenBalance), 0),
  tradingVolume: members.reduce((sum, row) => sum + numberOf(row.tradingVolume), 0),
  totalProfit: members.reduce((sum, row) => sum + numberOf(row.totalProfit), 0)
})

export const getTeamReport = (userId) => {
  const directMembers = getDirectReferrals(userId)
  const descendants = getDescendants(userId)
  return {
    userId: String(userId ?? ''),
    directCount: directMembers.length,
    ...summarizeMembers(descendants),
    branches: directMembers.map((member) => {
      const branchMembers = [member, ...getDescendants(idOf(member))]
      return { user: member, ...summarizeMembers(branchMembers) }
    })
  }
}

export const getRelationshipAuditLog = () => relationshipAuditLog.map((row) => cloneAuditValue(row))

export const __resetRelationshipAuditLogForTests = () => {
  relationshipAuditLog.splice(0)
}

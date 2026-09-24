export function portalClientIds(account, users) {
  if (!account?.agentId || !account.userId || !['agent', 'salesperson'].includes(account.role)) return []
  return users.filter(user => user.role === 'user' && !user.isSalesperson && user.agentParentId === account.agentId && (account.role === 'agent' || user.employeeId === account.userId)).map(user => user.id)
}

// Guarded Web Storage access. Blocked storage (privacy modes, sandboxed frames) throws on access;
// the site must still boot and simply forget preferences. Only UI preferences and session hand-offs
// belong here — never mock business data (accounts, balances, orders), which stays in memory.
function store(kind) {
  try { return kind === 'session' ? globalThis.sessionStorage : globalThis.localStorage } catch { return null }
}

export function readStorage(key, kind = 'local') {
  try { return store(kind)?.getItem(key) ?? null } catch { return null }
}

export function writeStorage(key, value, kind = 'local') {
  const target = store(kind)
  if (!target) return false
  try { target.setItem(key, value); return true } catch { return false }
}

export function removeStorage(key, kind = 'local') {
  try { store(kind)?.removeItem(key) } catch { /* ignore */ }
}

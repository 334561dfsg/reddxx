import { readStorage } from './storage.js'

// Admin 站点配置 → 登录设置 is saved under this key on the same origin (user request, 2026-11-28).
// Only the login switches are read; a missing, blocked or malformed value keeps every method on, so a
// static deployment without the admin config behaves as before.
const SITE_CONFIG_KEY = 'fex-admin-site-config'

export function readLoginSettings() {
  let config = null
  try { config = JSON.parse(readStorage(SITE_CONFIG_KEY) || 'null') } catch { config = null }
  return { usernameLoginEnabled: config?.usernameLoginEnabled !== false }
}

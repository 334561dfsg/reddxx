// Mirrors the reference login redirect guard: only same-site absolute paths are allowed.
import {readStorage,writeStorage,removeStorage} from './storage.js'
const CONTROL = /[\u0000-\u001f\u007f]/

export function safeRedirect(value) {
  const target = Array.isArray(value) ? value[0] : value
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//') || target.includes('\\') || CONTROL.test(target)) return null
  return target
}

export const loginPath = target => `/login?redirect=${encodeURIComponent(target)}`

const PENDING_KEY = 'aiquant:pending-subscribe'

// The reference remembers which strategy a signed-out visitor tried to subscribe to and reopens it after login.
export function rememberPendingSubscribe(id) {
  writeStorage(PENDING_KEY, String(id), 'session')
}

export function takePendingSubscribe() {
  const value = readStorage(PENDING_KEY, 'session')
  if (value !== null) removeStorage(PENDING_KEY, 'session')
  return value
}
